import { Agent, AgentOptions } from './agent';
import { ConversationMessage, OPENAI_MODEL_ID_GPT_O_MINI, ParticipantRole, TemplateVariables } from '../types';
import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { Retriever } from '../retrievers/retriever';

export interface OpenAIAgentOptions extends AgentOptions {
  baseURL?: string;
  modelId?: string;
  streaming?: boolean;
  toolConfig?: {
    tool: OpenAI.Chat.ChatCompletionTool[];
    useToolHandler: (response: any, conversation: any[]) => any;
    toolMaxRecursions?: number;
  };
  inferenceConfig?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
    continueOnLength?: boolean;
  };
  retriever?: Retriever;
  customSystemPrompt?: {
    template: string;
    variables?: TemplateVariables;
  };
}

type WithApiKey = {
  apiKey: string;
  client?: never;
};

type WithClient = {
  client: OpenAI;
  apiKey?: never;
};

export type OpenAIAgentOptionsWithAuth = OpenAIAgentOptions & (WithApiKey | WithClient);

const DEFAULT_MAX_TOKENS = 1000;

export class OpenAIAgent extends Agent {
  private openai: OpenAI;
  private modelId: string;
  private streaming: boolean;
  private inferenceConfig: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
    continueOnLength?: boolean;
  };
  protected retriever?: Retriever;
  private toolConfig?: {
    tool: OpenAI.Chat.ChatCompletionTool[];
    useToolHandler: (response: any, conversation: any[]) => any;
    toolMaxRecursions?: number;
  };
  private promptTemplate: string;
  private systemPrompt: string;
  private customVariables: TemplateVariables;

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  constructor(options: OpenAIAgentOptionsWithAuth) {
    super(options);

    if (options.client) {
      this.openai = options.client;
    } else {
      if (!options.apiKey) throw new Error('OpenAI API key is required');
      this.openai = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
    }

    this.modelId = options.modelId ?? OPENAI_MODEL_ID_GPT_O_MINI;
    this.streaming = options.streaming ?? false;
    this.inferenceConfig = {
      maxTokens: options.inferenceConfig?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.inferenceConfig?.temperature ?? 0.1,
      topP: options.inferenceConfig?.topP ?? 0.9,
      stopSequences: options.inferenceConfig?.stopSequences,
      continueOnLength: options.inferenceConfig?.continueOnLength ?? false
    };

    this.retriever = options.retriever;
    this.toolConfig = options.toolConfig;
    this.customVariables = {};

    this.promptTemplate = `You are a ${this.name}. ${this.description} Provide helpful and accurate information based on your expertise.`;
    this.systemPrompt = this.promptTemplate;

    if (options.customSystemPrompt) {
      this.setSystemPrompt(
        options.customSystemPrompt.template,
        options.customSystemPrompt.variables
      );
    }
  }

  async processRequest(
    inputText: any,
    userId: string,
    sessionId: string,
    chatHistory: ConversationMessage[],
    additionalParams?: Record<string, string>,
    
  ): Promise<ConversationMessage | AsyncIterable<any>> {
    let systemPrompt = this.systemPrompt;

    if (this.retriever) {
      const response = await this.retriever.retrieveAndCombineResults(inputText, { userId, sessionId });
      systemPrompt += "\nHere is the context to use to answer the user's question:\n" + response;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.role.toLowerCase() as OpenAI.Chat.ChatCompletionMessageParam['role'],
        content: msg.content
      })),
      { role: 'user' as const, content: inputText }
    ] as ConversationMessage[];


    const requestOptions: OpenAI.Chat.ChatCompletionCreateParams = {
      model: this.modelId,
      messages: messages,
      max_tokens: this.inferenceConfig.maxTokens,
      stream: this.streaming,
      temperature: this.inferenceConfig.temperature,
      top_p: this.inferenceConfig.topP,
      stop: this.inferenceConfig.stopSequences,
      tools: this.toolConfig?.tool,
    };



    if (this.streaming) {
      return this.handleStreamingResponse(messages, requestOptions);
    } else {
      let finalMessage = '';
      let toolUse = false;
      let recursions = this.toolConfig?.toolMaxRecursions || 5;

      try {
        do {
          const response = await this.handleSingleResponse(requestOptions);
          const toolCalls = response.content[0]?.text?.tool_calls;

          if (toolCalls && toolCalls.length > 0 && this.toolConfig) {
            messages.push({
              role: ParticipantRole.ASSISTANT,
              content: response.content[0].text
            });

             await this.toolConfig.useToolHandler(response, messages);
            toolUse = true;
          } else {
            finalMessage = response.content[0]?.text || '';
            toolUse = false;
          }

          recursions--;
        } while (toolUse && recursions > 0);

        return {
          role: ParticipantRole.ASSISTANT,
          content: [{ text: finalMessage }],
        };
      } catch (error) {
        Logger.logger.error('Error in OpenAI API call:', error);
        throw error;
      }
    }
  }

  private async handleSingleResponse(input: OpenAI.Chat.ChatCompletionCreateParams): Promise<ConversationMessage> {
    try {
      const nonStreamingOptions = { ...input, stream: false };
      const chatCompletion = await this.openai.chat.completions.create(nonStreamingOptions) as OpenAI.Chat.ChatCompletion;

      if (!chatCompletion.choices || chatCompletion.choices.length === 0) {
        throw new Error('No choices returned from OpenAI API');
      }

      const assistantMessage = chatCompletion.choices[0]?.message?.content;

      if (typeof assistantMessage !== 'string') {
        throw new Error('Unexpected response format from OpenAI API');
      }

      return {
        role: ParticipantRole.ASSISTANT,
        content: [{ text: assistantMessage }],
      };
    } catch (error) {
      Logger.logger.error('Error in OpenAI API call:', error);
      throw error;
    }
  }

  private async *handleStreamingResponse(messages: ConversationMessage[], options: OpenAI.Chat.ChatCompletionCreateParams): AsyncIterable<string> {
    try {
      let toolUse = false;
      let recursions = this.toolConfig?.toolMaxRecursions || 5;
      let toolBlock = [];
      let continueGenerating = true;
      let accumulatedContent = '';

      var selectedToolCallId = '';
      var selectedToolCallName = '';
      var selectedToolCallInput = '';

      do {
        const stream = await this.openai.chat.completions.create({ ...options, stream: true });

        for await (const chunk of stream) {
          console.log("chunk", chunk);
          const content = chunk.choices[0]?.delta?.content;
          const toolCalls = chunk.choices[0]?.delta?.tool_calls;
          const finishReason = chunk.choices[0]?.finish_reason;

          if (content) {
            accumulatedContent += content;
            yield content;
          }

          if (toolCalls && toolCalls.length > 0) {
            var toolCall = toolCalls[0];

            if (typeof toolCall.id === 'string' && toolCall.id != '') {
              if (toolCall.id != selectedToolCallId) {
                if(selectedToolCallId !== ''){
                  toolBlock.push({ id: selectedToolCallId, input: selectedToolCallInput, name: selectedToolCallName, type: 'tool_use' });
                  selectedToolCallInput = '';
                }
                selectedToolCallId = toolCall.id;
              }
            }

            if (typeof toolCall.function.name === 'string' && toolCall.function.name != '') {
              selectedToolCallName = toolCall.function.name;
            }

            if (typeof toolCall.function.arguments === 'string' && toolCall.function.arguments != '') {
              selectedToolCallInput += toolCall.function.arguments;
            }
          }

          if (finishReason === 'tool_calls') {
            if (toolBlock.length === 0 && selectedToolCallId !== '') {
              toolBlock.push({ id: selectedToolCallId, input: selectedToolCallInput, name: selectedToolCallName, type: 'tool_use' });
            }
            console.log('toolBlock', toolBlock);

            if(toolBlock.length > 0){
              await this.toolConfig.useToolHandler({
                tool_calls: toolBlock.map(tool => ({
                ...tool,
                input: tool.input === '' ? null : JSON.parse(tool.input.trim())
              }))
              }, messages);
            }
            toolUse = true;
          } else if (finishReason === 'length' && this.inferenceConfig.continueOnLength) {
            // Add the accumulated content as an assistant message
            messages.push({
              role: ParticipantRole.ASSISTANT,
              content: [{ text: accumulatedContent }]
            });
            
            // Add a system message to continue
            messages.push({
              role: ParticipantRole.USER,
              content: [{ text: 'Please con tinue where you left off.' }]
            });
            
            // Update options with new messages
            options.messages = messages;
            continueGenerating = true;
            break;
          } else if (finishReason) {
            continueGenerating = false;
          }
        }

        recursions--;
      } while ((toolUse || continueGenerating) && recursions > 0);
    } catch (error) {
      Logger.logger.error('Error in streaming OpenAI API call:', error);
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

    this.systemPrompt = this.replaceplaceholders(
      this.promptTemplate,
      allVariables
    );
  }

  private replaceplaceholders(
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
}