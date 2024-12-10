import { ConversationMessage } from "../types";
import { Logger } from "../utils/logger";
import { Classifier, ClassifierResult } from "./classifier";
import { LanguageModel, generateText, tool } from 'ai';
import { z } from 'zod';

export interface VercelAIClassifierOptions {
  // The language model to use for classification
  model: LanguageModel;

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
}

const analyzePromptSchema = z.object({
  userinput: z.string().describe('The original user input'),
  selected_agent: z.string().describe('The name of the selected agent'),
  confidence: z.number().min(0).max(1).describe('Confidence level between 0 and 1')
});

type AnalyzePromptArgs = z.infer<typeof analyzePromptSchema>;

export class VercelAIClassifier extends Classifier {
  private model: LanguageModel;
  private currentInput: string = '';
  protected inferenceConfig: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };

  constructor(options: VercelAIClassifierOptions) {
    super();

    this.model = options.model;

    // Set default values for inference config
    const defaultMaxTokens = 1000;
    this.inferenceConfig = {
      maxTokens: options.inferenceConfig?.maxTokens ?? defaultMaxTokens,
      temperature: options.inferenceConfig?.temperature ?? 0.1,
      topP: options.inferenceConfig?.topP ?? 0.9,
      stopSequences: options.inferenceConfig?.stopSequences,
    };
  }

  private tools = {
    analyzePrompt: tool({
      description: 'Analyze the user input and provide structured output',
      parameters: analyzePromptSchema,
      execute: async (args: AnalyzePromptArgs, context: { signal?: AbortSignal }): Promise<ClassifierResult> => {
        try {
          const selectedAgent = this.getAgentById(args.selected_agent);
          if (!selectedAgent) {
            throw new Error(`Invalid agent ID: ${args.selected_agent}`);
          }

          return {
            selectedAgent,
            confidence: args.confidence,
          };
        } catch (error) {
          Logger.logger.error("Error in analyzePrompt execution:", error);
          throw error;
        }
      }
    })
  };

  /**
   * Process a request to classify user input
   * @param inputText - The user input to classify
   * @param chatHistory - The conversation history (unused in this implementation)
   * @returns A Promise resolving to a ClassifierResult
   */
  async processRequest(
    inputText: string,
    chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {
    this.currentInput = inputText;

    try {
      const response = await generateText({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: inputText }
        ],
        maxTokens: this.inferenceConfig.maxTokens,
        temperature: this.inferenceConfig.temperature,
        topP: this.inferenceConfig.topP,
        tools: this.tools,
        maxSteps: 1,
        maxRetries: 2,
      });

      if (!response.toolCalls?.[0]) {
        throw new Error("No tool calls found in the response");
      }

      return response.toolCalls[0].args as ClassifierResult;
    } catch (error) {
      Logger.logger.error("Error processing request:", error);
      throw error;
    }
  }
}
