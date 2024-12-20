"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAgent = void 0;
const agent_1 = require("./agent");
const types_1 = require("../types");
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../utils/logger");
const DEFAULT_MAX_TOKENS = 1000;
class OpenAIAgent extends agent_1.Agent {
    getSystemPrompt() {
        return this.systemPrompt;
    }
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        super(options);
        if (options.client) {
            this.openai = options.client;
        }
        else {
            if (!options.apiKey)
                throw new Error('OpenAI API key is required');
            this.openai = new openai_1.default({ apiKey: options.apiKey });
        }
        this.modelId = (_a = options.modelId) !== null && _a !== void 0 ? _a : types_1.OPENAI_MODEL_ID_GPT_O_MINI;
        this.streaming = (_b = options.streaming) !== null && _b !== void 0 ? _b : false;
        this.inferenceConfig = {
            maxTokens: (_d = (_c = options.inferenceConfig) === null || _c === void 0 ? void 0 : _c.maxTokens) !== null && _d !== void 0 ? _d : DEFAULT_MAX_TOKENS,
            temperature: (_f = (_e = options.inferenceConfig) === null || _e === void 0 ? void 0 : _e.temperature) !== null && _f !== void 0 ? _f : 0.1,
            topP: (_h = (_g = options.inferenceConfig) === null || _g === void 0 ? void 0 : _g.topP) !== null && _h !== void 0 ? _h : 0.9,
            stopSequences: (_j = options.inferenceConfig) === null || _j === void 0 ? void 0 : _j.stopSequences,
        };
        this.retriever = options.retriever;
        this.toolConfig = options.toolConfig;
        this.customVariables = {};
        this.promptTemplate = `You are a ${this.name}. ${this.description} Provide helpful and accurate information based on your expertise.`;
        this.systemPrompt = this.promptTemplate;
        if (options.customSystemPrompt) {
            this.setSystemPrompt(options.customSystemPrompt.template, options.customSystemPrompt.variables);
        }
    }
    async processRequest(inputText, userId, sessionId, chatHistory, additionalParams) {
        var _a, _b, _c, _d, _e;
        let systemPrompt = this.systemPrompt;
        let additionalContext = '';
        if (this.retriever) {
            const response = await this.retriever.retrieveAndCombineResults(inputText, { userId, sessionId });
            additionalContext = "\nHere is the context to use to answer the user's question:\n" + response;
        }
        if (typeof inputText === 'string') {
            inputText += additionalContext;
        }
        else if (Array.isArray(inputText)) {
            inputText.map(item => {
                item.text = item.type == "text" ? item.text + additionalContext : item.text;
            });
        }
        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: msg.role.toLowerCase(),
                content: msg.content
            })),
            { role: 'user', content: inputText }
        ];
        const requestOptions = {
            model: this.modelId,
            messages: messages,
            max_tokens: this.inferenceConfig.maxTokens,
            stream: this.streaming,
            temperature: this.inferenceConfig.temperature,
            top_p: this.inferenceConfig.topP,
            stop: this.inferenceConfig.stopSequences,
            tools: (_a = this.toolConfig) === null || _a === void 0 ? void 0 : _a.tool,
        };
        if (this.streaming) {
            return this.handleStreamingResponse(messages, requestOptions);
        }
        else {
            let finalMessage = '';
            let toolUse = false;
            let recursions = ((_b = this.toolConfig) === null || _b === void 0 ? void 0 : _b.toolMaxRecursions) || 5;
            try {
                do {
                    const response = await this.handleSingleResponse(requestOptions);
                    const toolCalls = (_d = (_c = response.content[0]) === null || _c === void 0 ? void 0 : _c.text) === null || _d === void 0 ? void 0 : _d.tool_calls;
                    if (toolCalls && toolCalls.length > 0 && this.toolConfig) {
                        messages.push({
                            role: types_1.ParticipantRole.ASSISTANT,
                            content: response.content[0].text
                        });
                        await this.toolConfig.useToolHandler(response, messages);
                        toolUse = true;
                    }
                    else {
                        finalMessage = ((_e = response.content[0]) === null || _e === void 0 ? void 0 : _e.text) || '';
                        toolUse = false;
                    }
                    recursions--;
                } while (toolUse && recursions > 0);
                return {
                    role: types_1.ParticipantRole.ASSISTANT,
                    content: [{ text: finalMessage }],
                };
            }
            catch (error) {
                logger_1.Logger.logger.error('Error in OpenAI API call:', error);
                throw error;
            }
        }
    }
    async handleSingleResponse(input) {
        var _a, _b;
        try {
            const nonStreamingOptions = { ...input, stream: false };
            const chatCompletion = await this.openai.chat.completions.create(nonStreamingOptions);
            if (!chatCompletion.choices || chatCompletion.choices.length === 0) {
                throw new Error('No choices returned from OpenAI API');
            }
            const assistantMessage = (_b = (_a = chatCompletion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
            if (typeof assistantMessage !== 'string') {
                throw new Error('Unexpected response format from OpenAI API');
            }
            return {
                role: types_1.ParticipantRole.ASSISTANT,
                content: [{ text: assistantMessage }],
            };
        }
        catch (error) {
            logger_1.Logger.logger.error('Error in OpenAI API call:', error);
            throw error;
        }
    }
    async *handleStreamingResponse(messages, options) {
        var _a, _b, _c, _d, _e;
        try {
            let toolUse = false;
            let recursions = ((_a = this.toolConfig) === null || _a === void 0 ? void 0 : _a.toolMaxRecursions) || 5;
            let toolBlock = [];
            var selectedToolCallId = '';
            var selectedToolCallName = '';
            var selectedToolCallInput = '';
            do {
                const stream = await this.openai.chat.completions.create({ ...options, stream: true });
                for await (const chunk of stream) {
                    const content = (_c = (_b = chunk.choices[0]) === null || _b === void 0 ? void 0 : _b.delta) === null || _c === void 0 ? void 0 : _c.content;
                    const toolCalls = (_e = (_d = chunk.choices[0]) === null || _d === void 0 ? void 0 : _d.delta) === null || _e === void 0 ? void 0 : _e.tool_calls;
                    if (content) {
                        yield content;
                    }
                    if (toolCalls && toolCalls.length > 0) {
                        var toolCall = toolCalls[0];
                        if (typeof toolCall.id === 'string' && toolCall.id != '') {
                            if (toolCall.id != selectedToolCallId) {
                                if (selectedToolCallId !== '') {
                                    toolBlock.push({ id: selectedToolCallId, input: selectedToolCallInput, name: selectedToolCallName, type: 'tool_use' });
                                    selectedToolCallInput = '';
                                }
                                selectedToolCallId = toolCall.id;
                            }
                        }
                        if (typeof toolCall.function.name === 'string' && toolCall.function.name != '') {
                            selectedToolCallName = toolCall.function.name;
                        }
                        if (typeof toolCall.function.arguments === 'string' && toolCall.function.arguments != '') {
                            selectedToolCallInput += toolCall.function.arguments;
                        }
                    }
                    var finishReason = chunk.choices[0].finish_reason;
                    if (finishReason === 'tool_calls') {
                        if (toolBlock.length === 0 && selectedToolCallId !== '') {
                            toolBlock.push({ id: selectedToolCallId, input: selectedToolCallInput, name: selectedToolCallName, type: 'tool_use' });
                        }
                        console.log('toolBlock', toolBlock);
                        if (toolBlock.length > 0) {
                            await this.toolConfig.useToolHandler({
                                tool_calls: toolBlock.map(tool => ({
                                    ...tool,
                                    input: tool.input === '' ? null : JSON.parse(tool.input.trim())
                                }))
                            }, messages);
                        }
                        toolUse = true;
                    }
                }
                recursions--;
            } while (toolUse && recursions > 0);
        }
        catch (error) {
            logger_1.Logger.logger.error('Error in streaming OpenAI API call:', error);
            throw error;
        }
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
            return match;
        });
    }
}
exports.OpenAIAgent = OpenAIAgent;
//# sourceMappingURL=openAIAgent.js.map