import { ConversationMessage } from "../types";
import { Classifier, ClassifierResult } from "./classifier";
import { Agent } from "../agents/agent";
import OpenAI from "openai";
export interface EmbeddingClassifierOptions {
    openaiClient: OpenAI;
    minConfidence?: number;
    model?: string;
    cacheOptions?: {
        ttl?: number;
        maxSize?: number;
        path?: string;
    };
}
export declare class EmbeddingClassifier extends Classifier {
    private openai;
    private minConfidence;
    private model;
    private agentEmbeddings;
    private registeredAgents;
    private exampleEmbeddings;
    constructor(options: EmbeddingClassifierOptions);
    /**
     * Generate example Q&As for an agent using its description and system prompt
     */
    private generateExampleQAs;
    /**
     * Register an agent with the classifier
     */
    registerAgent(agentId: string, agent: Agent): Promise<void>;
    /**
     * Get all registered agents
     */
    protected getRegisteredAgents(): Map<string, Agent>;
    /**
     * Get agent by ID
     */
    getAgentById(agentId: string): Agent | undefined;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Get embedding for a text using OpenAI's API with caching
     */
    private getEmbedding;
    /**
     * Update embeddings for all registered agents
     */
    private updateAgentEmbeddings;
    /**
     * Process a request to classify user input
     */
    processRequest(inputText: string, chatHistory: ConversationMessage[]): Promise<ClassifierResult>;
}
