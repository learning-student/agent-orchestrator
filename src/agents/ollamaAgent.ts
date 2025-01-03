import { Agent, AgentOptions } from "./agent";
import { ConversationMessage, ParticipantRole, TemplateVariables } from "../types";
import { Logger } from "../utils/logger";
import { Ollama } from "ollama";
import { Retriever } from "../retrievers/retriever";

export interface OllamaAgentOptions extends AgentOptions {
  // The model name to use (e.g., "llama2", "mistral", etc.)
  modelName: string;

  // The base URL of the Ollama API (defaults to http://localhost:11434)
  baseUrl?: string;

  // Whether to use streaming responses
  streaming?: boolean;

  // Tool configuration
  toolConfig?: {
    tool: any[]; // Replace with proper Ollama tool type when available
    useToolHandler: (response: any, conversation: any[]) => any;
    toolMaxRecursions?: number;
  };

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

  // Optional retriever for context enhancement
  retriever?: Retriever;

  // Custom system prompt configuration
  customSystemPrompt?: {
    template: string;
    variables?: TemplateVariables;
  };
}

export class OllamaAgent extends Agent {
  private client: Ollama;
  private modelName: string;
  protected streaming: boolean;
  private toolConfig?: {
    tool: any[];
    useToolHandler: (response: any, conversation: any[]) => any;
    toolMaxRecursions?: number;
  };
  protected inferenceConfig: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
  protected retriever?: Retriever;
  private promptTemplate: string;
  private systemPrompt: string;
  private customVariables: TemplateVariables;
  private defaultMaxRecursions: number = 5;

  constructor(options: OllamaAgentOptions) {
    super(options);

    this.modelName = options.modelName;
    this.client = new Ollama({
      host: options.baseUrl || "http://127.0.0.1:11434"
    });

 

    
    this.streaming = options.streaming ?? false;
    this.toolConfig = options.toolConfig;
    this.retriever = options.retriever;

    // Set default values for inference config
    const defaultMaxTokens = 1000;
    this.inferenceConfig = {
      maxTokens: options.inferenceConfig?.maxTokens ?? defaultMaxTokens,
      temperature: options.inferenceConfig?.temperature ?? 0.7,
      topP: options.inferenceConfig?.topP ?? 0.9,
      stopSequences: options.inferenceConfig?.stopSequences,
    };

    this.promptTemplate = `You are a ${this.name}. ${this.description} Provide helpful and accurate information based on your expertise.
    You will engage in an open-ended conversation, providing helpful and accurate information based on your expertise.
    The conversation will proceed as follows:
    - The human may ask an initial question or provide a prompt on any topic.
    - You will provide a relevant and informative response.
    - The human may then follow up with additional questions or prompts related to your previous response, allowing for a multi-turn dialogue on that topic.
    - Or, the human may switch to a completely new and unrelated topic at any point.
    - You will seamlessly shift your focus to the new topic, providing thoughtful and coherent responses based on your broad knowledge base.
    Throughout the conversation, you should aim to:
    - Understand the context and intent behind each new question or prompt.
    - Provide substantive and well-reasoned responses that directly address the query.
    - Draw insights and connections from your extensive knowledge when appropriate.
    - Ask for clarification if any part of the question or prompt is ambiguous.
    - Maintain a consistent, respectful, and engaging tone tailored to the human's communication style.
    - Seamlessly transition between topics as the human introduces new subjects.`;

    this.systemPrompt = '';
    this.customVariables = {};

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
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      ...chatHistory.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content.map(c => c.text).join(" ")
      })),
      { role: 'user', content: inputText }
    ];

    this.updateSystemPrompt();

    let systemPrompt = this.systemPrompt;

    // Add retriever context if available
    if (this.retriever) {
      const response = await this.retriever.retrieveAndCombineResults(inputText, { userId, sessionId });
      const contextPrompt = "\nHere is the context to use to answer the user's question:\n" + response;
      systemPrompt = systemPrompt + contextPrompt;
      messages[0].content = systemPrompt;
    }

    try {
      if (this.streaming) {
        return this.handleStreamingResponse(messages);
      } else {
        let finalMessage = '';
        let toolUse = false;
        let recursions = this.toolConfig?.toolMaxRecursions || this.defaultMaxRecursions;

        do {
          const response = await this.handleSingleResponse({
            model: this.modelName,
            messages,
            options: {
              temperature: this.inferenceConfig.temperature,
              top_p: this.inferenceConfig.topP,
              num_predict: this.inferenceConfig.maxTokens,
              stop: this.inferenceConfig.stopSequences,
            },
          });

        

          // Check for tool use in response
          // Note: This is a placeholder as Ollama's tool use format may differ
          const toolResponse = this.extractToolUse(response);
          
          if (toolResponse) {
            messages.push({ role: 'assistant', content: response.message.content });
            if (!this.toolConfig) {
              throw new Error("No tools available for tool use");
            }

            try {
              const result = await this.toolConfig.useToolHandler(response, messages);
              messages.push(result);
            } catch (error) {
              Logger.logger.error("Error using tool:", error);
            }
            toolUse = true;
          } else {
            finalMessage = response.message.content;
            toolUse = false;
          }

          recursions--;
        } while (toolUse && recursions > 0);

        return {
          role: ParticipantRole.ASSISTANT,
          content: [{ text: finalMessage, type: "text" }],
        };
      }
    } catch (error) {
      Logger.logger.error("Error processing request:", error);
      throw error;
    }
  }

  protected async handleSingleResponse(input: any): Promise<any> {
    try {
      return await this.client.chat(input);
    } catch (error) {
      Logger.logger.error("Error invoking Ollama:", error);
      throw error;
    }
  }

  private async *handleStreamingResponse(messages: any[]): AsyncIterable<any> {
    let toolUse = false;
    let recursions = this.toolConfig?.toolMaxRecursions || this.defaultMaxRecursions;

    do {
      const stream = await this.client.chat({
        model: this.modelName,
        messages,
        stream: true,
        options: {
          temperature: this.inferenceConfig.temperature,
          top_p: this.inferenceConfig.topP,
          num_predict: this.inferenceConfig.maxTokens,
          stop: this.inferenceConfig.stopSequences,
        },
      });

    

      for await (const part of stream) {
        // Check for tool use in streamed response
        const toolResponse = this.extractToolUse(part);
        
        if (toolResponse) {
          if (!this.toolConfig) {
            throw new Error("No tools available for tool use");
          }
          
          try {
            const result = await this.toolConfig.useToolHandler({ message: part }, messages);
            messages.push(result);
            toolUse = true;
          } catch (error) {
            Logger.logger.error("Error using tool:", error);
          }
        } else {
          yield part.message.content;
          toolUse = false;
        }
      }

      recursions--;
    } while (toolUse && recursions > 0);
  }

  private extractToolUse(response: any): boolean {
    // This is a placeholder implementation
    // Actual implementation will depend on how Ollama formats tool use in responses
    // For now, we'll assume no tool use
    return false;
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
      return match; // If no replacement found, leave the placeholder as is
    });
  }
} 