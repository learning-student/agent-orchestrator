"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainAgent = void 0;
const agent_1 = require("./agent");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
class ChainAgent extends agent_1.Agent {
    constructor(options) {
        super(options);
        this.agents = options.agents;
        this.defaultOutput = options.defaultOutput || "No output generated from the chain.";
        if (this.agents.length === 0) {
            throw new Error("ChainAgent requires at least one agent in the chain.");
        }
    }
    getSystemPrompt() {
        return this.agents.map(agent => agent.getSystemPrompt()).join("\n");
    }
    /**
       * Processes a user request by sending it to the Amazon Bedrock agent for processing.
       * @param inputText - The user input as a string.
       * @param userId - The ID of the user sending the request.
       * @param sessionId - The ID of the session associated with the conversation.
       * @param chatHistory - An array of Message objects representing the conversation history.
       * @param additionalParams - Optional additional parameters as key-value pairs.
       * @returns A Promise that resolves to a Message object containing the agent's response.
       */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    async processRequest(inputText, userId, sessionId, chatHistory, additionalParams) {
        let currentInput = inputText;
        let finalResponse;
        console.log(`Processing chain with ${this.agents.length} agents`);
        for (let i = 0; i < this.agents.length; i++) {
            const isLastAgent = i === this.agents.length - 1;
            const agent = this.agents[i];
            try {
                console.log(`Input for agent ${i}: ${currentInput}`);
                const response = await agent.processRequest(currentInput, userId, sessionId, chatHistory, additionalParams);
                if (this.isConversationMessage(response)) {
                    if (response.content.length > 0 && 'text' in response.content[0]) {
                        currentInput = response.content[0].text;
                        finalResponse = response;
                        console.log(`Output from agent ${i}: ${currentInput}`);
                    }
                    else {
                        logger_1.Logger.logger.warn(`Agent ${agent.name} returned no text content.`);
                        return this.createDefaultResponse();
                    }
                }
                else if (this.isAsyncIterable(response)) {
                    if (!isLastAgent) {
                        logger_1.Logger.logger.warn(`Intermediate agent ${agent.name} returned a streaming response, which is not allowed.`);
                        return this.createDefaultResponse();
                    }
                    // It's the last agent and streaming is allowed
                    finalResponse = response;
                }
                else {
                    logger_1.Logger.logger.warn(`Agent ${agent.name} returned an invalid response type.`);
                    return this.createDefaultResponse();
                }
                // If it's not the last agent, ensure we have a non-streaming response to pass to the next agent
                if (!isLastAgent && !this.isConversationMessage(finalResponse)) {
                    logger_1.Logger.logger.error(`Expected non-streaming response from intermediate agent ${agent.name}`);
                    return this.createDefaultResponse();
                }
            }
            catch (error) {
                logger_1.Logger.logger.error(`Error processing request with agent ${agent.name}:`, error);
                throw `Error processing request with agent ${agent.name}:${String(error)}`;
            }
        }
        return finalResponse;
    }
    isAsyncIterable(obj) {
        return obj && typeof obj[Symbol.asyncIterator] === 'function';
    }
    isConversationMessage(response) {
        return response && 'role' in response && 'content' in response && Array.isArray(response.content);
    }
    createDefaultResponse() {
        return {
            role: types_1.ParticipantRole.ASSISTANT,
            content: [{ text: this.defaultOutput }],
        };
    }
}
exports.ChainAgent = ChainAgent;
//# sourceMappingURL=chainAgent.js.map