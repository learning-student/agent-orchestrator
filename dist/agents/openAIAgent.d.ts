import { Agent, AgentOptions } from './agent';
import { ConversationMessage, TemplateVariables } from '../types';
import OpenAI from 'openai';
import { Retriever } from '../retrievers/retriever';
export interface OpenAIAgentOptions extends AgentOptions {
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
export declare class OpenAIAgent extends Agent {
    private openai;
    private modelId;
    private streaming;
    private inferenceConfig;
    protected retriever?: Retriever;
    private toolConfig?;
    private promptTemplate;
    private systemPrompt;
    private customVariables;
    getSystemPrompt(): string;
    constructor(options: OpenAIAgentOptionsWithAuth);
    processRequest(inputText: any, userId: string, sessionId: string, chatHistory: ConversationMessage[], additionalParams?: Record<string, string>): Promise<ConversationMessage | AsyncIterable<any>>;
    private handleSingleResponse;
    private handleStreamingResponse;
    setSystemPrompt(template?: string, variables?: TemplateVariables): void;
    private updateSystemPrompt;
    private replaceplaceholders;
}
export {};
