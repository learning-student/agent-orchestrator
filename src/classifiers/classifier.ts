import {
  ConversationMessage,
  TemplateVariables,
} from "../types";

import { Agent } from "../agents/agent";

export interface ClassifierResult {
  // The agent selected by the classifier to handle the user's request
  selectedAgent: Agent | null;

  // A numeric value representing the classifier's confidence in its selection
  // Typically a value between 0 and 1, where 1 represents 100% confidence
  confidence: number;
}

/**
 * Abstract base class for all classifiers
 */
export abstract class Classifier {

  protected modelId: string;
  protected agentDescriptions: string;
  protected agents: { [key: string]: Agent };
  protected history: string;
  protected promptTemplate: string;
  protected systemPrompt: string;
  protected customVariables: TemplateVariables;



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

** User Input: {{USER_INPUT}} **
`;
  }

  setAgents(agents: { [key: string]: Agent }) {
    const agentDescriptions = Object.entries(agents)
      .map(([_key, agent]) => `Agent: ${agent.name} ${agent.id} ${agent.description}`)
      .join("\n\n");
    this.agentDescriptions = agentDescriptions;
    this.agents = agents;
  }

  setHistory(messages: ConversationMessage[]): void {
    this.history = this.formatMessages(messages);
  }

  setSystemPrompt(template?: string, variables?: TemplateVariables): void {
    if (template) {
      this.promptTemplate = template;
    }

    if (variables) {
      this.customVariables = variables;
    }

    this.updateSystemPrompt();
  }

  private formatMessages(messages: ConversationMessage[]): string {
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
    async classify(
      inputText: string,
      chatHistory: ConversationMessage[]
    ): Promise<ClassifierResult> {
      // Set the chat history
      this.setHistory(chatHistory);
      // Update the system prompt with the latest history, agent descriptions, and custom variables
      this.updateSystemPrompt();
      return await this.processRequest(inputText, chatHistory);
    }

    /**
     * Abstract method to process a request.
     * This method must be implemented by all concrete agent classes.
     *
     * @param inputText - The user input as a string.
     * @param chatHistory - An array of Message objects representing the conversation history.
     * @returns A Promise that resolves to a ClassifierResult object containing the classification outcome.
     */
    abstract processRequest(
      inputText: string,
      chatHistory: ConversationMessage[]
    ): Promise<ClassifierResult>;


  private updateSystemPrompt(): void {
    const allVariables: TemplateVariables = {
      ...this.customVariables,
      AGENT_DESCRIPTIONS: this.agentDescriptions,
      HISTORY: this.history,
    };


    this.systemPrompt = this.replaceplaceholders(
      this.promptTemplate,
      allVariables
    );
  }

  private replaceplaceholders(
    template: string,
    variables: TemplateVariables
  ): string {
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

  public getAgentById(agentId: string): Agent | null {
    if (!agentId) {
      return null;
    }

    const myAgentId = agentId.split(" ")[0].toLowerCase();
    const matchedAgent = this.agents[myAgentId];

    return matchedAgent || null;
  }
}