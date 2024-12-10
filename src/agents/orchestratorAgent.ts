import { Agent, AgentOptions } from "./agent";
import { ConversationMessage, ParticipantRole } from "../types";
import { Logger } from "../utils/logger";
import { MultiAgentOrchestrator, OrchestratorOptions } from "../orchestrator";

export interface OrchestratorAgentOptions extends AgentOptions {
  orchestratorOptions?: OrchestratorOptions;
}

/**
 * OrchestratorAgent class that acts both as an agent and an orchestrator.
 * It can process requests directly and route them to sub-agents.
 */
export class OrchestratorAgent extends Agent {
  private orchestrator: MultiAgentOrchestrator;

  constructor(options: OrchestratorAgentOptions) {
    super(options);
    this.orchestrator = new MultiAgentOrchestrator(options.orchestratorOptions);
  }

  /**
   * Add a sub-agent to this orchestrator
   * @param agent - The agent to add
   */
  addAgent(agent: Agent): void {
    this.orchestrator.addAgent(agent);
  }

  /**
   * Set the default agent to handle requests when no specific agent is identified
   * @param agent - The agent to set as default
   */
  setDefaultAgent(agent: Agent): void {
    this.orchestrator.setDefaultAgent(agent);
  }

  /**
   * Set a custom classifier for agent selection
   * @param classifier - The classifier to use
   */
  setClassifier(classifier: any): void {
    this.orchestrator.setClassifier(classifier);
  }

  /**
   * Get all registered sub-agents
   * @returns A map of agent IDs to their name and description
   */
  getAllAgents(): { [key: string]: { name: string; description: string } } {
    return this.orchestrator.getAllAgents();
  }

  getSystemPrompt(): string {
    return "You are an orchestrator agent that can process requests either directly or by routing to appropriate sub-agents.";
  }
  /**
   * Process a request either directly or by routing to appropriate sub-agent
   */
  async processRequest(
    inputText: string,
    userId: string,
    sessionId: string,
    chatHistory: ConversationMessage[],
    additionalParams: Record<string, any> = {}
  ): Promise<ConversationMessage | AsyncIterable<any>> {
    try {
      const response = await this.orchestrator.routeRequest(
        inputText,
        userId,
        sessionId,
        additionalParams
      );
      if (response.streaming) {
        return response.output as unknown as AsyncIterable<any>;
      }

      return {
        role: ParticipantRole.ASSISTANT,
        content: [{ text: response.output as string }]
      };

    } catch (error) {
      Logger.logger.error("Error during request processing:", error);
      return {
        role: ParticipantRole.ASSISTANT,
        content: [{ text: String(error) }]
      };
    }
  }
}