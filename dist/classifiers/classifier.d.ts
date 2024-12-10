import { ConversationMessage, TemplateVariables } from "../types";
import { Agent } from "../agents/agent";
export interface ClassifierResult {
    selectedAgent: Agent | null;
    confidence: number;
}
/**
 * Abstract base class for all classifiers
 */
export declare abstract class Classifier {
    protected modelId: string;
    protected agentDescriptions: string;
    protected agents: {
        [key: string]: Agent;
    };
    protected history: string;
    protected promptTemplate: string;
    protected systemPrompt: string;
    protected customVariables: TemplateVariables;
    /**
     * Constructs a new Classifier instance.
     * @param options - Configuration options for the agent, inherited from AgentOptions.
     */
    constructor();
    setAgents(agents: {
        [key: string]: Agent;
    }): void;
    setHistory(messages: ConversationMessage[]): void;
    setSystemPrompt(template?: string, variables?: TemplateVariables): void;
    private formatMessages;
    /**
   * Classifies the input text based on the provided chat history.
   *
   * This method orchestrates the classification process by:
   * 1. Setting the chat history.
   * 2. Updating the system prompt with the latest history, agent descriptions, and custom variables.
   * 3. Delegating the actual processing to the abstract `processRequest` method.
   *
   * @param inputText - The text to be classified.
   * @param chatHistory - An array of ConversationMessage objects representing the chat history.
   * @returns A Promise that resolves to a ClassifierResult object containing the classification outcome.
   */
    classify(inputText: string, chatHistory: ConversationMessage[]): Promise<ClassifierResult>;
    /**
     * Abstract method to process a request.
     * This method must be implemented by all concrete agent classes.
     *
     * @param inputText - The user input as a string.
     * @param chatHistory - An array of Message objects representing the conversation history.
     * @returns A Promise that resolves to a ClassifierResult object containing the classification outcome.
     */
    abstract processRequest(inputText: string, chatHistory: ConversationMessage[]): Promise<ClassifierResult>;
    private updateSystemPrompt;
    private replaceplaceholders;
    getAgentById(agentId: string): Agent | null;
}
