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

  modifiedInputText?: string;
}

export type TextProcessor = (text: string) => string;
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
  protected instructions: string;
  protected textProcessor : TextProcessor;
  protected errorAgent ?: Agent;


  /**
   * Constructs a new Classifier instance.
   * @param options - Configuration options for the agent, inherited from AgentOptions.
   */
  constructor() {

    this.agentDescriptions = "";
    this.history = "";
    this.customVariables = {};
    this.textProcessor = (text: string) => text;
    this.errorAgent = null;
    this.promptTemplate = `
    You are AgentMatcher, a system that matches user queries to the best agent. 
    <INSTRUCTIONS>
    Your task is to find the most relevant agent based on the user's input and the agents' names and descriptions.
    
    1. Analyze the user's input. (Take USER_INSTRUCTION into account while analyzing the user's input)
    2. Create detailed operations list from the user's input, detailed instructions are in <OPERATION_SPECIFICATION>.
    3. Use the first not completed operations agent as "agentId"
    4. Put confidence as how confident you are in your selection. Aim for at least 0.9. (confidence is a number between 0 and 1)

      Your response must be in the following format:
     {"agentId": "agent_id", "confidence": 0, "operations": []}

    You must only return one JSON object, do not return multiple JSON objects.
    </INSTRUCTIONS>

      <OPERATION_SPECIFICATION>
            If user specifies multiple operations at once, you must use the first operation that has not completed.
            Use chain-of-thought to determine the first operation that has not completed. 
            Split the operations in the conversation into sub-operations, put them in "operations" parameter with following format.
            [{"operation": "operation_name", "agent": "agent_name that matches with the operation", "completed": false}]
            For each operatoion, look for the conversation, use chain-of-thoughts to determine if it has been completed or not.
            After finding all the operations, return the first operation that has not completed.
            ********************
            Definition for being completed: In the conversation from the assistant messages hints that the operation is completed.
            ********************
     </OPERATION_SPECIFICATION>
    
    
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

  setErrorAgent(errorAgent: Agent): void {
    this.errorAgent = errorAgent;
  }

  setAgents(agents: { [key: string]: Agent }) {
    const agentDescriptions = Object.entries(agents)
      .map(([_key, agent]) => `Agent => Name: ${agent.name} Id: ${agent.id} Description: ${agent.description}`)
      .join("\n\n");
    this.agentDescriptions = agentDescriptions;
    this.agents = agents;
  }

  setHistory(messages: ConversationMessage[]): void {
    this.history = this.formatMessages(messages);
  }

  setInstructions(instructions: string): void {
    this.instructions = instructions;
  }

  getInstructions(): string {
    return this.instructions;
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
    const response =  messages
      .map((message) => {
        const texts = message.content.map((content) => content.text).join(" ");
        return `${message.role}: ${texts}`;
      })
      .join("\n");

    return this.textProcessor(response);
  }


   setTextProcessor(textProcessor: TextProcessor): void {
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
      USER_INSTRUCTION: this.instructions,
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