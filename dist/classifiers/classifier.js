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
You are AgentMatcher, a system that matches user queries to the best agent. 
Your task is to find the most relevant agent based on the user's input and the agents' names and descriptions. 
Return the following JSON: 
{"agentId": "", "confidence": 0}
- agentId: the ID of the selected agent.
- confidence: a number between 0 and 1 indicating your confidence in the selection.
1. Analyze the user's input.
2. Check the available agents.
3. Find the best match.
4. Return the selected agent.

** Available Agents:**
<AGENTS>
{{AGENT_DESCRIPTIONS}}
</AGENTS>

** Message History:**
<HISTORY>
{{HISTORY}}
</HISTORY>

<USER_INPUT>
{{USER_INPUT}}
</USER_INPUT>

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
            INSTRUCTIONS: this.instructions,
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