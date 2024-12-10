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

You are AgentMatcher, an assistant that matches user queries to the most appropriate agent/department.

For follow-up responses to previous interactions, maintain the same agent as before. This applies to short responses like "yes", "ok", "I want to know more", or numbers.

Analyze the user's input and categorize it into one of the agent type provided in the prompt:

**Rules:**
- For follow-ups, retain the previous agent. This includes short replies ("yes", "ok", numbers).
- If uncertain, use "unknown".

**Classification Steps:**
1. **Agent Type:** Determine the most appropriate agent.  
2. **Priority:**  
   - High: Urgent issues, billing problems, service-impacting.  
   - Medium: Non-urgent product or sales questions.  
   - Low: General info or feedback.  
3. **Key Entities:** Identify critical nouns/products/issues. For follow-ups, include previous entities.
4. **Confidence:**  
   - High: Clear intent or straightforward follow-up.  
   - Medium: Some ambiguity.  
   - Low: Vague or complex requests.  
5. **Is Followup:** Note if it continues a previous conversation.

Short confirmations ("yes", "ok") = follow-ups, same agent.

**Examples:**

- User: "What are the symptoms of the flu?"  
  {"agentId": "health-agent", "confidence": 0.95}

- After printer setup request, user asks: "I need to know my account balance"  
  {"agentId": "billing-agent", "confidence": 0.9}

- Follow-up on weight loss advice: "Yes, give me diet tips"  
  {"agentId": "health-agent", "confidence": 0.95}

- Follow-up on travel plans: "Can you help me book a flight?"  
  {"agentId": "travel-agent", "confidence": 0.92}

- User: "Help me find book a truck"
  {"agentId": "truck-agent", "confidence": 0.92}

- Unknown: "I need to know my account balance"  
  {"agentId": "unknown", "confidence": 0.9}


Your responses must be in following json format always:  {"agentId": "health-agent", "confidence": 0.95}  

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
      .map(([_key, agent]) => `${agent.id}:${agent.description}`)
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
    console.log("updateSystemPrompt", this.agentDescriptions, this.history);
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