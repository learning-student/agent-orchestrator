import { ConversationMessage } from "../types";
import { Logger } from "../utils/logger";
import { Classifier, ClassifierResult } from "./classifier";
import { Agent } from "../agents/agent";
import OpenAI from "openai";
import path from 'path';
import md5 from 'crypto-js/md5';
import Keyv from 'keyv';
import { KeyvSqlite } from '@resolid/keyv-sqlite';
import fs from 'fs';
import { log } from "console";
interface AgentInfo {
  name: string;
  description: string;
  exampleQAs: Array<{
    question: string;
    answer: string;
  }>;
}

export interface EmbeddingClassifierOptions {
  openaiClient: OpenAI;
  // Minimum confidence threshold for classification (0-1)
  minConfidence?: number;
  // Model to use for embeddings (defaults to text-embedding-3-small)
  model?: string;
  // Cache options
  cacheOptions?: {
    ttl?: number; // Time to live in seconds
    maxSize?: number; // Maximum size in bytes
    path?: string; // Cache directory path
  };
}

export class EmbeddingClassifier extends Classifier {
  private openai: OpenAI;
  private minConfidence: number;
  private model: string;
  private agentEmbeddings: Map<string, number[]> = new Map();
  private registeredAgents: Map<string, Agent> = new Map();
  private exampleEmbeddings: Map<string, number[]> = new Map();

  constructor(options: EmbeddingClassifierOptions) {
    super();
    this.openai = options.openaiClient;
    this.minConfidence = options.minConfidence ?? 0.7;
    this.model = options.model ?? "text-embedding-3-small";
  }

  /**
   * Generate example Q&As for an agent using its description and system prompt
   */
  private async generateExampleQAs(agent: Agent): Promise<Array<{ question: string; answer: string }>> {
    try {
      const prompt = `Based on the following agent description and capabilities, generate 5 example question-answer pairs that this agent would be best suited to handle. Format as JSON array.

Description: ${agent.description}
Capabilities: ${agent.name} is designed to ${agent.description}

Generate diverse examples covering different aspects of the agent's capabilities.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        tool_choice: "required",
        tools: [
          {
            type: "function",
            function: {
              name: "generate_example_qas",
              description: "Generate example Q&As for an agent",
              parameters: {
                type: "object", properties: {
                  question_and_answers: {
                    type: "array", items: {
                      type: "object", properties: {
                        question: { type: "string" },
                        answer: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      });

      var toolCall = response.choices[0]?.message?.tool_calls?.[0];

      var args=  JSON.parse(toolCall.function.arguments);
      console.log("args",args);
      return args.question_and_answers;
    } catch (error) {
      Logger.logger.error("Error generating example Q&As:", error);
      return [];
    }
  }

  /**
   * Register an agent with the classifier
   */
  async registerAgent(agentId: string, agent: Agent): Promise<void> {
    this.registeredAgents.set(agentId, agent);

    // Generate example Q&As
    const exampleQAs = await this.generateExampleQAs(agent);

    // Get embeddings for examples
    for (const qa of exampleQAs) {
      const embedding = await this.getEmbedding(
        `Question: ${qa.question}\nAnswer: ${qa.answer}`
      );
      const key = `${agentId}_example_${md5(qa.question).toString()}`;
      this.exampleEmbeddings.set(key, embedding);
    }

    // Clear main embeddings cache to force recomputation
    this.agentEmbeddings.clear();
  }

  /**
   * Get all registered agents
   */
  protected getRegisteredAgents(): Map<string, Agent> {
    return this.registeredAgents;
  }

  /**
   * Get agent by ID
   */
  public getAgentById(agentId: string): Agent | undefined {
    return this.registeredAgents.get(agentId);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }


  /**
   * Get embedding for a text using OpenAI's API with caching
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
     
      // Get from API if not in cache
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = response.data[0].embedding;

    
      return embedding;
    } catch (error) {
      Logger.logger.error("Error getting embedding:", error);
      throw error;
    }
  }

  /**
   * Update embeddings for all registered agents
   */
  private async updateAgentEmbeddings(): Promise<void> {
    const agents = this.getRegisteredAgents();
    for (const [agentId, agent] of agents.entries()) {
      // Get agent info
      const agentInfo: AgentInfo = {
        name: agent.name || agentId,
        description: agent.description || '',
        exampleQAs: await this.generateExampleQAs(agent)
      };

      // Combine name and description for context
      const agentText = `${agentInfo.name}. ${agentInfo.description}`;
      const embedding = await this.getEmbedding(agentText);
      this.agentEmbeddings.set(agentId, embedding);

      // Get embeddings for examples
      for (const qa of agentInfo.exampleQAs) {
        const qaEmbedding = await this.getEmbedding(
          `Question: ${qa.question}\nAnswer: ${qa.answer}`
        );
        const key = `${agentId}_example_${md5(qa.question).toString()}`;
        this.exampleEmbeddings.set(key, qaEmbedding);
      }
    }
  }

  /**
   * Process a request to classify user input
   */
  async processRequest(
    inputText: string,
    chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {
    try {
      // Update agent embeddings if they haven't been cached
      if (this.agentEmbeddings.size === 0) {
        await this.updateAgentEmbeddings();
      }

      // Get embedding for input text
      const inputEmbedding = await this.getEmbedding(inputText);

      // Calculate similarities with all agents and their examples
      let bestMatch: { agentId: string; similarity: number } = {
        agentId: '',
        similarity: -1,
      };

      // Check similarity with agent descriptions and accumulate scores
      const agentScores: { [key: string]: number } = {};
      for (const [agentId, agentEmbedding] of this.agentEmbeddings) {
        const similarity = this.cosineSimilarity(inputEmbedding, agentEmbedding);
        agentScores[agentId] = (agentScores[agentId] || 0) + similarity;
      }

      // Check similarity with example Q&As and accumulate scores
      for (const [key, exampleEmbedding] of this.exampleEmbeddings) {
        const agentId = key.split('_example_')[0];
        const similarity = this.cosineSimilarity(inputEmbedding, exampleEmbedding);
        agentScores[agentId] = (agentScores[agentId] || 0) + similarity;
      }

      // Determine the best match based on accumulated scores
      for (const [agentId, score] of Object.entries(agentScores)) {
        if (score > bestMatch.similarity) {
          bestMatch = { agentId, similarity: score };
        }
      }

      console.log("User input:", inputText);
      console.log("bestMatch", bestMatch);

      // Check if the best match meets the minimum confidence threshold
      if (bestMatch.similarity < this.minConfidence) {
        throw new Error("No agent matched with sufficient confidence");
      }

      const selectedAgent = this.getAgentById(bestMatch.agentId);
      if (!selectedAgent) {
        throw new Error(`Invalid agent ID: ${bestMatch.agentId}`);
      }

      return {
        selectedAgent,
        confidence: bestMatch.similarity,
      };
    } catch (error) {
      Logger.logger.error("Error processing request:", error);
      throw error;
    }
  }
} 