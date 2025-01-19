import { ConversationMessage } from "../types";
import { Logger } from "../utils/logger";
import { Classifier, ClassifierResult } from "./classifier";
import { Agent } from "../agents/agent";
import * as faiss from "faiss-node";

export interface EmbeddingClassifierOptions {
  embeddingModel: string;
  minConfidence?: number;
  dimension?: number;
}

export class EmbeddingClassifier extends Classifier {
  private minConfidence: number;
  private agentEmbeddings: Float32Array[] = [];
  private agentNames: string[] = [];
  private registeredAgents: Map<string, Agent> = new Map();
  private index: faiss.IndexFlatIP;
  private dimension: number = 0;
  private modelName: string;

  constructor(options: EmbeddingClassifierOptions) {
    super();
    this.minConfidence = options.minConfidence ?? 0.7;
    Logger.logger.info(`Using Ollama embedding model: ${options.embeddingModel}`);
    this.modelName = options.embeddingModel;
    this.dimension = options.dimension ?? 0;
    this.index = this.dimension > 0 ? new faiss.IndexFlatIP(this.dimension) : undefined;
  }

  /**
   * Get embeddings from Ollama
   */
  private async getEmbeddings(text: string): Promise<Float32Array> {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelName,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return new Float32Array(result.embedding);
  }

  /**
   * Register an agent with the classifier
   */
  async registerAgent(agentId: string, agent: Agent): Promise<void> {
    this.registeredAgents.set(agentId, agent);
    this.agentNames.push(agentId);

    // Get agent description text
    const agentText = `${agent.description}`;

    // Get embeddings from Ollama
    const embeddingArray = await this.getEmbeddings(agentText);

    // Initialize index if this is the first agent
    if (!this.index) {
      this.dimension = embeddingArray.length;
      this.index = new faiss.IndexFlatIP(this.dimension);
    }

    this.index.add(Array.from(embeddingArray));
    this.agentEmbeddings.push(embeddingArray);

    Logger.logger.info(`Registered agent: ${agentId}`);
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
   * Process a request to classify user input
   */
  async processRequest(
    inputText: string,
    chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {
    try {
      Logger.logger.debug(`Classifying message: ${inputText}`);

      // Get embeddings from Ollama
      const inputArray = await this.getEmbeddings(inputText);

      // Search index for closest match
      const k = 1;
      const result = this.index.search(Array.from(inputArray), k);
      
      const confidence = (result.distances[0] / 100);
      const bestMatchIndex = result.labels[0];
      const selectedAgentId = this.agentNames[bestMatchIndex];
      const selectedAgent = this.getAgentById(selectedAgentId);

      if (!selectedAgent) {
        throw new Error("No agents registered");
      }

      if (confidence < this.minConfidence) {
        return {
          selectedAgent: null,
          confidence: 1
        }
      }

      Logger.logger.info(
        `[Classification] best_match='${selectedAgent.name}' score=${confidence}`
      );

      return {
        selectedAgent,
        confidence: confidence,
      };
    } catch (error) {
      Logger.logger.error("Error processing request:", error);
      throw error;
    }
  }
}