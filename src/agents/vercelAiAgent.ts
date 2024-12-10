import { Agent, AgentOptions } from './agent';
import { ConversationMessage, ParticipantRole, TemplateVariables } from '../types';
import { Logger } from '../utils/logger';
import { Retriever } from '../retrievers/retriever';
import { streamText, generateText, LanguageModel, CoreTool, tool, CoreMessage } from 'ai';
import { z } from 'zod';


export interface NewAIAgentOptions extends AgentOptions {
  model: LanguageModel;
  streaming?: boolean;
  tools?: Record<string, CoreTool>;
  inferenceConfig?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
  retriever?: Retriever;
  customSystemPrompt?: {
    template: string;
    variables?: TemplateVariables;
  };
  maxSteps?: number;
}

const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_MAX_STEPS = 5;

export class NewAIAgent extends Agent {
  private model: LanguageModel;
  private streaming: boolean;
  private inferenceConfig: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
  protected retriever?: Retriever;
  private promptTemplate: string;
  private systemPrompt: string;
  private customVariables: TemplateVariables;
  private tools: Record<string, CoreTool>;
  private maxSteps: number;

  constructor(options: NewAIAgentOptions) {
    super(options);
    this.model = options.model;
    this.streaming = options.streaming ?? false;
    this.inferenceConfig = {
      maxTokens: options.inferenceConfig?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.inferenceConfig?.temperature ?? 0.1,
      topP: options.inferenceConfig?.topP ?? 0.9,
      stopSequences: options.inferenceConfig?.stopSequences,
    };
    this.retriever = options.retriever;
    this.customVariables = {};
    this.tools = options.tools ?? {};
    this.maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

    this.promptTemplate = `You are a ${this.name}. ${this.description} Provide helpful and accurate information based on your expertise.`;
    this.systemPrompt = this.promptTemplate;

    if (options.customSystemPrompt) {
      this.setSystemPrompt(
        options.customSystemPrompt.template,
        options.customSystemPrompt.variables
      );
    }
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  async processRequest(
    inputText: string,
    userId: string,
    sessionId: string,
    chatHistory: ConversationMessage[],
    additionalParams?: Record<string, string>
  ): Promise<ConversationMessage | AsyncIterable<any>> {
    let systemPrompt = this.systemPrompt;
    let retrievedContext = '';

    if (this.retriever) {
      retrievedContext = await this.retriever.retrieveAndCombineResults(inputText, { userId, sessionId });
      systemPrompt += "\nContext:\n" + retrievedContext;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || ''
      })),
      { role: 'user', content: inputText }
    ];

    const commonOptions = {
      model: this.model,
      messages: messages as CoreMessage[],
      system: systemPrompt,
      maxTokens: this.inferenceConfig.maxTokens,
      temperature: this.inferenceConfig.temperature,
      topP: this.inferenceConfig.topP,
      stop: this.inferenceConfig.stopSequences,
      tools: this.tools,
      maxSteps: this.maxSteps,
    };

    try {
      if (!this.streaming) {
        // Non-streaming mode using generateText
        const { text, toolCalls, usage, finishReason } = await generateText(commonOptions);

        return {
          role: ParticipantRole.ASSISTANT,
          content: [{ 
            text,
            tool_calls: toolCalls,
            usage,
            finish_reason: finishReason
          }]
        };
      }

      // Streaming mode using streamText
      const result = streamText(commonOptions);

      // Return AsyncIterable for streaming
      return (async function* () {
        try {
          // Use textStream for simpler text-only streaming
          for await (const chunk of result.textStream) {
            yield chunk;
          }
        } catch (error) {
          Logger.logger.error('Error in stream processing:', error);
          throw error;
        }
      })();

    } catch (error) {
      Logger.logger.error('Error in AI model call:', error);
      throw error;
    }
  }

  setSystemPrompt(template?: string, variables?: TemplateVariables): void {
    if (template) {
      this.promptTemplate = template;
    }

    if (variables) {
      this.customVariables = variables;
    }

    this.updateSystemPrompt();
  }

  private updateSystemPrompt(): void {
    const allVariables: TemplateVariables = {
      ...this.customVariables
    };

    this.systemPrompt = this.replacePlaceholders(
      this.promptTemplate,
      allVariables
    );
  }

  private replacePlaceholders(
    template: string,
    variables: TemplateVariables
  ): string {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      if (key in variables) {
        const value = variables[key];
        if (Array.isArray(value)) {
          return value.join("\n");
        }
        return value;
      }
      return match;
    });
  }

  // Helper method to create tools with execute functions
  static createTool<T extends z.ZodType>(
    description: string,
    parameters: T,
    execute: (args: z.infer<T>) => Promise<any>
  ): CoreTool {
    return tool({
      description,
      parameters,
      execute
    });
  }
}