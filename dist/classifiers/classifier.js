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

For follow-up responses in an ongoing conversation, maintain context by keeping the same agent as the previous interaction. This applies particularly to contextual responses like "yes", "ok", "tell me more", or numerical inputs.

Analyze the user's input through multiple dimensions to determine the optimal agent match:

**Core Analysis Framework:**
1. **Intent Analysis:**
   - Primary goal/need of the user
   - Implicit vs explicit requests
   - Domain-specific terminology
   - Action verbs and their context

2. **Context Evaluation:**
   - Previous conversation flow
   - Referenced entities/concepts
   - Temporal indicators
   - State of the interaction

3. **Domain Expertise Required:**
   - Technical depth needed
   - Specialized knowledge areas
   - Industry-specific requirements
   - Regulatory/compliance needs

4. **Confidence Assessment Factors:**
   - Query clarity (0.9-1.0: Crystal clear intent)
   - Domain match (0.7-0.9: Strong domain alignment)
   - Context certainty (0.5-0.7: Moderate confidence)
   - Ambiguity level (0.3-0.5: Significant uncertainty)
   - Default to "unknown" below 0.3

**Advanced Classification Logic:**
1. **Primary Classification:**
   - Map core intent to agent expertise
   - Consider sub-specialties within domains
   - Evaluate cross-domain requirements
   
2. **Contextual Weighting:**
   - Previous agent relevance
   - Conversation continuity
   - Topic evolution
   - Multi-turn dynamics

3. **Expertise Matching:**
   - Agent capability alignment
   - Specialization requirements
   - Authority level needed
   - Regulatory compliance

   ** USER DEFINED INSTRUCTIONS **
   {{INSTRUCTIONS}}
   You must follow the user defined instructions as always before making any decisions.

**Detailed Examples with Reasoning:**

- Query: "What's the difference between a box truck and a straight truck?"
  {"agentId": "truck-agent", "confidence": 0.95, "reasoning": "Deep domain knowledge required: (1) Query involves specific truck terminology (2) Comparison of vehicle types requires technical expertise (3) Likely involves commercial vehicle specifications (4) May lead to rental/booking guidance"}

- Previous: Discussing truck rental, Follow-up: "What about insurance options?"
  {"agentId": "truck-agent", "confidence": 0.92, "reasoning": "Contextual continuation: (1) Insurance directly relates to truck rental process (2) Requires understanding of commercial vehicle coverage (3) Maintains conversation flow with truck specialist (4) Agent has necessary policy knowledge"}

- Query: "My shipment is delayed, tracking shows no movement"
  {"agentId": "logistics-agent", "confidence": 0.88, "reasoning": "Operational focus: (1) Involves shipment tracking systems (2) Requires access to logistics networks (3) May need carrier coordination (4) Time-sensitive issue requiring immediate attention"}

Your response must strictly follow this JSON format:
{"agentId": "agent-id", "confidence": 0.0-1.0, "reasoning": "detailed multi-factor analysis"}

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
            .map(([_key, agent]) => `Agent: ${agent.name} ${agent.id} ${agent.description}`)
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