import OpenAI from "openai";
import {
  ConversationMessage,
  OPENAI_MODEL_ID_GPT_O_MINI
} from "../types";
import { isClassifierToolInput } from "../utils/helpers";
import { Logger } from "../utils/logger";
import { Classifier, ClassifierResult } from "./classifier";
import { ChatCompletionContentPart } from "openai/resources";

export interface OpenAIClassifierOptions {
  // Optional: The ID of the OpenAI model to use for classification
  // If not provided, a default model may be used
  client?: OpenAI;
  modelId?: string;

  baseURL?: string;
  // Optional: Configuration for the inference process
  inferenceConfig?: {
    // Maximum number of tokens to generate in the response
    maxTokens?: number;

    // Controls randomness in output generation
    temperature?: number;

    // Controls diversity of output via nucleus sampling
    topP?: number;

    // Array of sequences that will stop the model from generating further tokens
    stopSequences?: string[];
  };

  // The API key for authenticating with OpenAI's services
  apiKey: string;
}

export class OpenAIClassifier extends Classifier {
  private client: OpenAI;
  protected inferenceConfig: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };


  constructor(options: OpenAIClassifierOptions) {
    super();

    if (!options.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.client = options.client || new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
    this.modelId = options.modelId || OPENAI_MODEL_ID_GPT_O_MINI;

    const defaultMaxTokens = 1000;
    this.inferenceConfig = {
      maxTokens: options.inferenceConfig?.maxTokens ?? defaultMaxTokens,
      temperature: options.inferenceConfig?.temperature,
      topP: options.inferenceConfig?.topP,
      stopSequences: options.inferenceConfig?.stopSequences,
    };
  }

  /**
   * Method to process a request.
   * This method must be implemented by all concrete agent classes.
   *
   * @param inputText - The user input as a string.
   * @param chatHistory - An array of Message objects representing the conversation history.
   * @param additionalParams - Optional additional parameters as key-value pairs.
   * @returns A Promise that resolves to a Message object containing the agent's response.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async processRequest(
    inputText: string | Array<ChatCompletionContentPart>,
    chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {

    var input = (typeof inputText === 'string' ? [inputText] : inputText) as ChatCompletionContentPart[];
    var filteredAndPreparedInput = input.filter(part => part.type === 'text');

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: "Users prompt: " + filteredAndPreparedInput
      }
    ];

   

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: messages,
        max_tokens: this.inferenceConfig.maxTokens,
        temperature: this.inferenceConfig.temperature,
        top_p: this.inferenceConfig.topP,
    });

      const content = response?.choices?.[0]?.message?.content || "";
      console.log("content from match", content);
      
      let prediction : {agentId: string, confidence: number|string} = {
        agentId: "",
        confidence: 0
      };

      // Use regex to find JSON object in content
      const jsonMatch = content.match(/\{[^]*\}/);
      
      if (jsonMatch) {
        try {
          // Clean up the matched JSON string by removing trailing commas
          const cleanedJson = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1');
          prediction = JSON.parse(cleanedJson);
        } catch (e) {
          console.error("Error parsing JSON from content:", e);
          console.error("Problematic JSON string:", jsonMatch[0]);
        }
      }

      const intentClassifierResult = {
        selectedAgent: this.getAgentById(prediction.agentId),
        confidence: parseFloat(prediction.confidence.toString())
      }

      return intentClassifierResult as ClassifierResult;

    } catch (error) {
      Logger.logger.error("Error processing request:", error);
      if (this.errorAgent) {
        return {
          selectedAgent: this.errorAgent,
          confidence: 1,
          modifiedInputText: "User Input: " + inputText + "Error: " + JSON.stringify(error)
         } as ClassifierResult;
      }

      throw error;
    }
  }
}