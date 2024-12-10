"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgent = void 0;
const agent_1 = require("./agent");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const orchestrator_1 = require("../orchestrator");
/**
 * OrchestratorAgent class that acts both as an agent and an orchestrator.
 * It can process requests directly and route them to sub-agents.
 */
class OrchestratorAgent extends agent_1.Agent {
    constructor(options) {
        super(options);
        this.orchestrator = new orchestrator_1.MultiAgentOrchestrator(options.orchestratorOptions);
    }
    /**
     * Add a sub-agent to this orchestrator
     * @param agent - The agent to add
     */
    addAgent(agent) {
        this.orchestrator.addAgent(agent);
    }
    /**
     * Set the default agent to handle requests when no specific agent is identified
     * @param agent - The agent to set as default
     */
    setDefaultAgent(agent) {
        this.orchestrator.setDefaultAgent(agent);
    }
    /**
     * Set a custom classifier for agent selection
     * @param classifier - The classifier to use
     */
    setClassifier(classifier) {
        this.orchestrator.setClassifier(classifier);
    }
    /**
     * Get all registered sub-agents
     * @returns A map of agent IDs to their name and description
     */
    getAllAgents() {
        return this.orchestrator.getAllAgents();
    }
    getSystemPrompt() {
        return "You are an orchestrator agent that can process requests either directly or by routing to appropriate sub-agents.";
    }
    /**
     * Process a request either directly or by routing to appropriate sub-agent
     */
    async processRequest(inputText, userId, sessionId, chatHistory, additionalParams = {}) {
        try {
            const response = await this.orchestrator.routeRequest(inputText, userId, sessionId, additionalParams);
            if (response.streaming) {
                return response.output;
            }
            return {
                role: types_1.ParticipantRole.ASSISTANT,
                content: [{ text: response.output }]
            };
        }
        catch (error) {
            logger_1.Logger.logger.error("Error during request processing:", error);
            return {
                role: types_1.ParticipantRole.ASSISTANT,
                content: [{ text: String(error) }]
            };
        }
    }
}
exports.OrchestratorAgent = OrchestratorAgent;
//# sourceMappingURL=orchestratorAgent.js.map