import { Agent, AgentOptions } from './agent';
import { ConversationMessage, TemplateVariables } from '../types';
import { Retriever } from '../retrievers/retriever';
import { LanguageModel, CoreTool } from 'ai';
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
export declare class NewAIAgent extends Agent {
    private model;
    private streaming;
    private inferenceConfig;
    protected retriever?: Retriever;
    private promptTemplate;
    private systemPrompt;
    private customVariables;
    private tools;
    private maxSteps;
    constructor(options: NewAIAgentOptions);
    getSystemPrompt(): string;
    processRequest(inputText: string, userId: string, sessionId: string, chatHistory: ConversationMessage[], additionalParams?: Record<string, string>): Promise<ConversationMessage | AsyncIterable<any>>;
    setSystemPrompt(template?: string, variables?: TemplateVariables): void;
    private updateSystemPrompt;
    private replacePlaceholders;
    static createTool<T extends z.ZodType>(description: string, parameters: T, execute: (args: z.infer<T>) => Promise<any>): CoreTool;
}
