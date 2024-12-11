"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicAgent = void 0;
const agent_1 = require("./agent");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const sdk_1 = require("@anthropic-ai/sdk");
class AnthropicAgent extends agent_1.Agent {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        super(options);
        this.defaultMaxRecursions = 20;
        if (!options.apiKey && !options.client) {
            throw new Error("Anthropic API key or Anthropic client is required");
        }
        if (options.client) {
            this.client = options.client;
        }
        else {
            if (!options.apiKey)
                throw new Error("Anthropic API key is required");
            this.client = new sdk_1.Anthropic({ apiKey: options.apiKey });
        }
        this.systemPrompt = '';
        this.customVariables = {};
        this.streaming = (_a = options.streaming) !== null && _a !== void 0 ? _a : false;
        this.modelId = options.modelId || "claude-3-5-sonnet-20240620";
        const defaultMaxTokens = 1000; // You can adjust this default value as needed
        this.inferenceConfig = {
            maxTokens: (_c = (_b = options.inferenceConfig) === null || _b === void 0 ? void 0 : _b.maxTokens) !== null && _c !== void 0 ? _c : defaultMaxTokens,
            temperature: (_e = (_d = options.inferenceConfig) === null || _d === void 0 ? void 0 : _d.temperature) !== null && _e !== void 0 ? _e : 0.1,
            topP: (_g = (_f = options.inferenceConfig) === null || _f === void 0 ? void 0 : _f.topP) !== null && _g !== void 0 ? _g : 0.9,
            stopSequences: (_j = (_h = options.inferenceConfig) === null || _h === void 0 ? void 0 : _h.stopSequences) !== null && _j !== void 0 ? _j : [],
        };
        this.retriever = options.retriever;
        this.toolConfig = options.toolConfig;
        this.promptTemplate = `You are a ${this.name}. ${this.description} Provide helpful and accurate information based on your expertise.
    You will engage in an open-ended conversation, providing helpful and accurate information based on your expertise.
    The conversation will proceed as follows:
    - The human may ask an initial question or provide a prompt on any topic.
    - You will provide a relevant and informative response.
    - The human may then follow up with additional questions or prompts related to your previous response, allowing for a multi-turn dialogue on that topic.
    - Or, the human may switch to a completely new and unrelated topic at any point.
    - You will seamlessly shift your focus to the new topic, providing thoughtful and coherent responses based on your broad knowledge base.
    Throughout the conversation, you should aim to:
    - Understand the context and intent behind each new question or prompt.
    - Provide substantive and well-reasoned responses that directly address the query.
    - Draw insights and connections from your extensive knowledge when appropriate.
    - Ask for clarification if any part of the question or prompt is ambiguous.
    - Maintain a consistent, respectful, and engaging tone tailored to the human's communication style.
    - Seamlessly transition between topics as the human introduces new subjects.`;
        if (options.customSystemPrompt) {
            this.setSystemPrompt(options.customSystemPrompt.template, options.customSystemPrompt.variables);
        }
    }
    getSystemPrompt() {
        return this.systemPrompt;
    }
    async processRequest(inputText, userId, sessionId, chatHistory, _additionalParams) {
        var _a, _b;
        // Format messages to Anthropic's format
        const messages = chatHistory.map(message => ({
            role: message.role === types_1.ParticipantRole.USER ? 'user' : 'assistant',
            content: message.content[0]['text'] || '' // Fallback to empty string if content is undefined
        }));
        messages.push({ role: 'user', content: inputText });
        this.updateSystemPrompt();
        let systemPrompt = this.systemPrompt;
        // Update the system prompt with the latest history, agent descriptions, and custom variables
        if (this.retriever) {
            // retrieve from Vector store and combined results as a string into the prompt
            const response = await this.retriever.retrieveAndCombineResults(inputText, { userId, sessionId });
            const contextPrompt = "\nHere is the context to use to answer the user's question:\n" +
                response;
            systemPrompt = systemPrompt + contextPrompt;
        }
        try {
            if (this.streaming) {
                return this.handleStreamingResponse(messages, systemPrompt);
            }
            else {
                let finalMessage = '';
                let toolUse = false;
                let recursions = ((_a = this.toolConfig) === null || _a === void 0 ? void 0 : _a.toolMaxRecursions) || 5;
                do {
                    // Call Anthropic
                    const response = await this.handleSingleResponse({
                        model: this.modelId,
                        max_tokens: this.inferenceConfig.maxTokens,
                        messages: messages,
                        system: systemPrompt,
                        temperature: this.inferenceConfig.temperature,
                        top_p: this.inferenceConfig.topP,
                        tools: (_b = this.toolConfig) === null || _b === void 0 ? void 0 : _b.tool,
                    });
                    const toolUseBlocks = response.content.filter((content) => content.type === "tool_use");
                    if (toolUseBlocks.length > 0) {
                        // Append current response to the conversation
                        messages.push({ role: 'assistant', content: response.content });
                        if (!this.toolConfig) {
                            throw new Error("No tools available for tool use");
                        }
                        try {
                            const toolResponse = await this.toolConfig.useToolHandler(response, messages);
                            messages.push(toolResponse);
                        }
                        catch (error) {
                            logger_1.Logger.logger.error("Error using tool:", error);
                        }
                        toolUse = true;
                    }
                    else {
                        const textContent = response.content.find((content) => content.type === "text");
                        finalMessage = (textContent === null || textContent === void 0 ? void 0 : textContent.text) || '';
                    }
                    if (response.stop_reason === 'end_turn') {
                        toolUse = false;
                    }
                    recursions--;
                } while (toolUse && recursions > 0);
                return { role: types_1.ParticipantRole.ASSISTANT, content: [{ 'text': finalMessage }] };
            }
        }
        catch (error) {
            logger_1.Logger.logger.error("Error processing request:", error);
            // Instead of returning a default result, we'll throw the error
            throw error;
        }
    }
    async handleSingleResponse(input) {
        try {
            const response = await this.client.messages.create(input);
            return response;
        }
        catch (error) {
            logger_1.Logger.logger.error("Error invoking Anthropic:", error);
            throw error;
        }
    }
    async *handleStreamingResponse(messages, prompt) {
        var _a, _b, _c;
        let toolUse = false;
        let recursions = ((_a = this.toolConfig) === null || _a === void 0 ? void 0 : _a.toolMaxRecursions) || 5;
        do {
            const stream = await this.client.messages.stream({
                model: this.modelId,
                max_tokens: this.inferenceConfig.maxTokens,
                messages: messages,
                system: prompt,
                temperature: this.inferenceConfig.temperature,
                top_p: this.inferenceConfig.topP,
                tools: (_b = this.toolConfig) === null || _b === void 0 ? void 0 : _b.tool,
            });
            let toolBlock = { id: '', input: {}, name: '', type: 'tool_use' };
            let inputString = '';
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    yield event.delta.text;
                }
                else if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
                    if (!((_c = this.toolConfig) === null || _c === void 0 ? void 0 : _c.tool)) {
                        throw new Error("No tools available for tool use");
                    }
                    toolBlock = event.content_block;
                }
                else if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
                    inputString += event.delta.partial_json;
                }
                else if (event.type === 'message_delta') {
                    if (event.delta.stop_reason === 'tool_use') {
                        if (toolBlock && inputString) {
                            toolBlock.input = JSON.parse(inputString);
                            const message = { role: 'assistant', content: [toolBlock] };
                            await this.toolConfig.useToolHandler(message, messages);
                            toolUse = true;
                        }
                    }
                    else {
                        toolUse = false;
                    }
                }
            }
        } while (toolUse && --recursions > 0);
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
    updateSystemPrompt() {
        const allVariables = {
            ...this.customVariables
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
}
exports.AnthropicAgent = AnthropicAgent;
//# sourceMappingURL=anthropicAgent.js.map