import { Agent, AgentOptions } from "./agent";
import { ConversationMessage } from "../types";
import { OrchestratorOptions } from "../orchestrator";
export interface OrchestratorAgentOptions extends AgentOptions {
    orchestratorOptions?: OrchestratorOptions;
}
/**
 * OrchestratorAgent class that acts both as an agent and an orchestrator.
 * It can process requests directly and route them to sub-agents.
 */
export declare class OrchestratorAgent extends Agent {
    private orchestrator;
    constructor(options: OrchestratorAgentOptions);
    /**
     * Add a sub-agent to this orchestrator
     * @param agent - The agent to add
     */
    addAgent(agent: Agent): void;
    /**
     * Set the default agent to handle requests when no specific agent is identified
     * @param agent - The agent to set as default
     */
    setDefaultAgent(agent: Agent): void;
    /**
     * Set a custom classifier for agent selection
     * @param classifier - The classifier to use
     */
    setClassifier(classifier: any): void;
    /**
     * Get all registered sub-agents
     * @returns A map of agent IDs to their name and description
     */
    getAllAgents(): {
        [key: string]: {
            name: string;
            description: string;
        };
    };
    getSystemPrompt(): string;
    /**
     * Process a request either directly or by routing to appropriate sub-agent
     */
    processRequest(inputText: string, userId: string, sessionId: string, chatHistory: ConversationMessage[], additionalParams?: Record<string, any>): Promise<ConversationMessage | AsyncIterable<any>>;
}
