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
        this.promptTemplate = `

You are AgentMatcher, an expert system designed to intelligently match user queries to the most appropriate specialized agent by performing deep semantic analysis.
Your only task is to match the users input to most relevant agent according to available agents nam, description and following user input to determine the most relevant agent.
Then you must return the following json:**
{"agentId": "", "confidence": 0}
 **The agentId is the id of the agent that you selected.
 ** The confidence is a number between 0 and 1 that represents the confidence of your selection.
    1. Analyze the user's input to determine the most relevant agent.
    2. Analyze the available agents to determine the most relevant agent.
    3. Compare the user's input to the available agents to determine the most relevant agent.
    4. Validate the selection(if validation fails, try to find the most relevant agent again with different approach)
    5. Return the most relevant agent.

** Available Agents:**
<agents>
{{AGENT_DESCRIPTIONS}}
</agents>

** Message History:**
<history>
{{HISTORY}}
</history>
// /*  */
** User Input: {{USER_INPUT}} **
`;
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
        return messages
            .map((message) => {
            const texts = message.content.map((content) => content.text).join(" ");
            return `${message.role}: ${texts}`;
        })
            .join("\n");
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