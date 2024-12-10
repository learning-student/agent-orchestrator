import { Agent, AgentOptions } from "./agent";
import { ConversationMessage, TemplateVariables } from "../types";
import { Retriever } from "../retrievers/retriever";
import { Anthropic } from "@anthropic-ai/sdk";
export interface AnthropicAgentOptions extends AgentOptions {
    modelId?: string;
    streaming?: boolean;
    toolConfig?: {
        tool: Anthropic.Tool[];
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
    client: Anthropic;
    apiKey?: never;
};
export type AnthropicAgentOptionsWithAuth = AnthropicAgentOptions & (WithApiKey | WithClient);
export declare class AnthropicAgent extends Agent {
    private client;
    protected streaming: boolean;
    private modelId;
    protected customSystemPrompt?: string;
    protected inferenceConfig: {
        maxTokens: number;
        temperature: number;
        topP: number;
        stopSequences: string[];
    };
    protected retriever?: Retriever;
    private toolConfig?;
    private promptTemplate;
    private systemPrompt;
    private customVariables;
    private defaultMaxRecursions;
    constructor(options: AnthropicAgentOptionsWithAuth);
    getSystemPrompt(): string;
    processRequest(inputText: string, userId: string, sessionId: string, chatHistory: ConversationMessage[], _additionalParams?: Record<string, string>): Promise<ConversationMessage | AsyncIterable<any>>;
    protected handleSingleResponse(input: any): Promise<Anthropic.Message>;
    private handleStreamingResponse;
    setSystemPrompt(template?: string, variables?: TemplateVariables): void;
    private updateSystemPrompt;
    private replaceplaceholders;
}
export {};
