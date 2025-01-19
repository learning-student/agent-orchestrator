import { ConversationMessage } from "../types";
import { Classifier, ClassifierResult } from "./classifier";
import { Agent } from "../agents/agent";
export interface EmbeddingClassifierOptions {
    embeddingModel: string;
    minConfidence?: number;
    dimension?: number;
}
export declare class EmbeddingClassifier extends Classifier {
    private minConfidence;
    private agentEmbeddings;
    private agentNames;
    private registeredAgents;
    private index;
    private dimension;
    private modelName;
    constructor(options: EmbeddingClassifierOptions);
    /**
     * Get embeddings from Ollama
     */
    private getEmbeddings;
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
     * Process a request to classify user input
     */
    processRequest(inputText: string, chatHistory: ConversationMessage[]): Promise<ClassifierResult>;
}
