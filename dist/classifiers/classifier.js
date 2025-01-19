"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Classifier = void 0;
/**
 * Abstract base class for all classifiers
 */
class Classifier {
    /**
     * Constructs a new Classifier instance.
     * @param options - Configuration options for the agent, inherited from AgentOptions.
     */
    constructor() {
        this.agentDescriptions = "";
        this.history = "";
        this.customVariables = {};
        this.textProcessor = (text) => text;
        this.errorAgent = null;
        this.promptTemplate = `
   You are AgentMatcher, an expert system designed to intelligently match user queries to the most appropriate specialized agent by performing deep semantic analysis.
    <INSTRUCTIONS>
Your only task is to match the users input to most relevant agent according to available agents name, description and following user input to determine the most relevant agent.

Follow this chain-of-thought process:

1. Input Analysis:
   - Identify the core intent/topic of the user's query
   - Extract key terms, concepts and requirements
   - Note any specific constraints or preferences mentioned

2. Agent Capability Analysis:  
   - Review each agent's name, id and description
   - Create a mental model of each agent's core capabilities and specialties
   - Identify which aspects of agents align with user needs

3. Semantic Matching:
   - Compare user intent to agent capabilities
   - Look for direct matches in domain expertise
   - Consider partial matches and related capabilities
   - Evaluate context fit and specialization level

4. Confidence Scoring:
   - Score match quality on 0-1 scale based on:
     - Direct topic/domain alignment (0.3)
     - Required capabilities present (0.3)
     - Specificity of agent to task (0.2)
     - Context appropriateness (0.2)
   - Combine scores for final confidence value

5. Selection and Response:
   - Choose agent with highest confidence score
   - Format response as specified JSON
   - Include confidence score reflecting match quality
   - Double check selection logic

Always explain your reasoning before providing the final JSON response.
-------------------------------------
You must return the following json:**
{"agentId": "", "confidence": 0}
-------------------------------------

    </INSTRUCTIONS>
    
    
    ** Available Agents:**
    <AGENTS>
    {{AGENT_DESCRIPTIONS}}
    </AGENTS>
    
    ** Message History:**
    <HISTORY>
    {{HISTORY}}
    </HISTORY>
    
    <USER_INSTRUCTION>
      {{USER_INSTRUCTION}}
    </USER_INSTRUCTION>
    
    `;
    }
    setErrorAgent(errorAgent) {
        this.errorAgent = errorAgent;
    }
    setAgents(agents) {
        const agentDescriptions = Object.entries(agents)
            .map(([_key, agent]) => `Agent => Name: ${agent.name} Id: ${agent.id} Description: ${agent.description}`)
            .join("\n\n");
        this.agentDescriptions = agentDescriptions;
        this.agents = agents;
    }
    setHistory(messages) {
        this.history = this.formatMessages(messages);
    }
    setInstructions(instructions) {
        this.instructions = instructions;
    }
    getInstructions() {
        return this.instructions;
    }
    setSystemPrompt(template, variables) {
        if (template) {
            this.promptTemplate = template;
        }
        if (variables) {
            this.customVariables = variables;
        }
        this.updateSystemPrompt();
    }
    formatMessages(messages) {
        const response = messages
            .map((message) => {
            const texts = message.content.map((content) => content.text).join(" ");
            return `${message.role}: ${texts}`;
        })
            .join("\n");
        return this.textProcessor(response);
    }
    setTextProcessor(textProcessor) {
        this.textProcessor = textProcessor;
    }
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
    async classify(inputText, chatHistory) {
        // Set the chat history
        this.setHistory(chatHistory);
        // Update the system prompt with the latest history, agent descriptions, and custom variables
        this.updateSystemPrompt();
        return await this.processRequest(inputText, chatHistory);
    }
    updateSystemPrompt() {
        const allVariables = {
            ...this.customVariables,
            AGENT_DESCRIPTIONS: this.agentDescriptions,
            HISTORY: this.history,
            USER_INSTRUCTION: this.instructions,
        };
        this.systemPrompt = this.replaceplaceholders(this.promptTemplate, allVariables);
    }
    replaceplaceholders(template, variables) {
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
    getAgentById(agentId) {
        if (!agentId) {
            return null;
        }
        const myAgentId = agentId.split(" ")[0].toLowerCase();
        const matchedAgent = this.agents[myAgentId];
        return matchedAgent || null;
    }
}
exports.Classifier = Classifier;
//# sourceMappingURL=classifier.js.map