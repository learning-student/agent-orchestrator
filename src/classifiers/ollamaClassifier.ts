import { ConversationMessage, ParticipantRole } from "../types";
import { Logger } from "../utils/logger";
import { Classifier, ClassifierResult } from "./classifier";
import { Ollama } from "ollama";

export interface OllamaClassifierOptions {
  // The model name to use (e.g., "llama2", "mistral", etc.)
  modelName: string;

  // The base URL of the Ollama API (defaults to http://localhost:11434)
  baseUrl?: string;

  // Optional: Configuration for the inference process
  inferenceConfig?: {
    // Maximum number of tokens to generate in the response
    maxTokens?: number;

    // Controls randomness in output generation (0-1)
    temperature?: number;

    // Top-p sampling (0-1)
    topP?: number;

    // Stop sequences for generation
    stopSequences?: string[];
  };
}

export class OllamaClassifier extends Classifier {
  private client: Ollama;
  protected inferenceConfig: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };

  constructor(options: OllamaClassifierOptions) {
    super();

    this.modelId = options.modelName;
    this.client = new Ollama({
      host: options.baseUrl || "http://127.0.0.1:11434"
    });
    
    // Set default values for inference config
    const defaultMaxTokens = 1000;
    this.inferenceConfig = {
      maxTokens: options.inferenceConfig?.maxTokens ?? defaultMaxTokens,
      temperature: options.inferenceConfig?.temperature ?? 0.7,
      topP: options.inferenceConfig?.topP ?? 0.9,
      stopSequences: options.inferenceConfig?.stopSequences,
    };
  }

  async processRequest(
    inputText: string,
    chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {
    try {
      const response = await this.client.generate({
        model: this.modelId,
        prompt: `${this.systemPrompt}\n\nUser Input: ${inputText}`,
        options: {
          temperature: this.inferenceConfig.temperature,
          top_p: this.inferenceConfig.topP,
          num_predict: this.inferenceConfig.maxTokens,
          stop: this.inferenceConfig.stopSequences,
        },
      });

      const content = response.response;

      // Extract JSON from the response
      const jsonMatch = content.match(/({[\s\S]*?})/);
      const prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      // Create and return ClassifierResult
      const classifierResult: ClassifierResult = {
        selectedAgent: this.getAgentById(prediction.agentId),
        confidence: parseFloat(prediction.confidence),
      };

      return classifierResult;
    } catch (error) {
      Logger.logger.error("Error processing request:", error);
      throw error;
    }
  }
} 