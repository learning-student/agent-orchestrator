import {
  ANTHROPIC_MODEL_ID_CLAUDE_3_5_SONNET,
  ConversationMessage,
  ParticipantRole,
} from "../types";
import { isClassifierToolInput } from "../utils/helpers";
import { Logger } from "../utils/logger";
import { Classifier, ClassifierResult } from "./classifier";
import { Anthropic } from "@anthropic-ai/sdk";

export interface AnthropicClassifierOptions {
  // Optional: The ID of the Anthropic model to use for classification
  // If not provided, a default model may be used
  modelId?: string;

  // Optional: Configuration for the inference process
  inferenceConfig?: {
    // Maximum number of tokens to generate in the response
    maxTokens?: number;

    // Controls randomness in output generation
    // Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) make it more deterministic
    temperature?: number;

    // Controls diversity of output via nucleus sampling
    // 1.0 considers all tokens, lower values (e.g., 0.9) consider only the most probable tokens
    topP?: number;

    // Array of sequences that will stop the model from generating further tokens when encountered
    stopSequences?: string[];
  };

  // The API key for authenticating with Anthropic's services
  apiKey: string;
}

export class AnthropicClassifier extends Classifier {
  private client: Anthropic;
  protected inferenceConfig: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };


  constructor(options: AnthropicClassifierOptions) {
    super();

    if (!options.apiKey) {
      throw new Error("Anthropic API key is required");
    }
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.modelId = options.modelId || ANTHROPIC_MODEL_ID_CLAUDE_3_5_SONNET;
    // Set default value for max_tokens if not provided
    const defaultMaxTokens = 1000; // You can adjust this default value as needed
    this.inferenceConfig = {
      maxTokens: options.inferenceConfig?.maxTokens ?? defaultMaxTokens,
      temperature: options.inferenceConfig?.temperature,
      topP: options.inferenceConfig?.topP,
      stopSequences: options.inferenceConfig?.stopSequences,
    };

}

/* eslint-disable @typescript-eslint/no-unused-vars */
async processRequest(
    inputText: string,
    chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {
    const userMessage: Anthropic.MessageParam = {
      role: ParticipantRole.USER,
      content: inputText,
    };

    try {
      const response = await this.client.messages.create({
        model: this.modelId,
        max_tokens: this.inferenceConfig.maxTokens,
        messages: [
          userMessage
        ],
        system: this.systemPrompt,
        temperature: this.inferenceConfig.temperature,
        top_p: this.inferenceConfig.topP,
      
      });

      var content = response.content.find(item => item.type === 'text');
      const startIndex = content.text.indexOf("{");
      const endIndex = content.text.lastIndexOf("}");
      
      let prediction: { agentId: string; confidence: number | string } = {
        agentId: "",
        confidence: 0,
      };

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          const jsonString = content.text.substring(startIndex, endIndex + 1);
          try {
              prediction = JSON.parse(jsonString);
          } catch (e) {
              console.error("Error parsing JSON from content:", e);
          }
      }


      // @ts-ignore
      const intentClassifierResult: ClassifierResult = {
        selectedAgent: this.getAgentById(prediction.agentId),
        confidence: parseFloat(prediction.confidence.toString()),
      };
      return intentClassifierResult;

    } catch (error) {
      Logger.logger.error("Error processing request:", error);

      if (this.errorAgent) {
        // @ts-ignore
        return {
          selectedAgent: this.errorAgent,
          confidence: 1,
          modifiedInputText: "User Input: " + inputText + "Error: " + JSON.stringify(error)
         }
      }
      // Instead of returning a default result, we'll throw the error
      throw error;
    }
  }


}
