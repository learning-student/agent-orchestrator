import { Agent, AgentOptions } from "./agent";
import { ConversationMessage } from "../types";
export interface ChainAgentOptions extends AgentOptions {
    agents: Agent[];
    defaultOutput?: string;
}
export declare class ChainAgent extends Agent {
    agents: Agent[];
    private defaultOutput;
    constructor(options: ChainAgentOptions);
    getSystemPrompt(): string;
    /**
       * Processes a user request by sending it to the Amazon Bedrock agent for processing.
       * @param inputText - The user input as a string.
       * @param userId - The ID of the user sending the request.
       * @param sessionId - The ID of the session associated with the conversation.
       * @param chatHistory - An array of Message objects representing the conversation history.
       * @param additionalParams - Optional additional parameters as key-value pairs.
       * @returns A Promise that resolves to a Message object containing the agent's response.
       */
    processRequest(inputText: string, userId: string, sessionId: string, chatHistory: ConversationMessage[], additionalParams?: Record<string, string>): Promise<ConversationMessage | AsyncIterable<any>>;
    private isAsyncIterable;
    private isConversationMessage;
    private createDefaultResponse;
}
