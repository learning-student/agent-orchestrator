"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewAIAgent = void 0;
const agent_1 = require("./agent");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const ai_1 = require("ai");
const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_MAX_STEPS = 5;
class NewAIAgent extends agent_1.Agent {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        super(options);
        this.model = options.model;
        this.streaming = (_a = options.streaming) !== null && _a !== void 0 ? _a : false;
        this.inferenceConfig = {
            maxTokens: (_c = (_b = options.inferenceConfig) === null || _b === void 0 ? void 0 : _b.maxTokens) !== null && _c !== void 0 ? _c : DEFAULT_MAX_TOKENS,
            temperature: (_e = (_d = options.inferenceConfig) === null || _d === void 0 ? void 0 : _d.temperature) !== null && _e !== void 0 ? _e : 0.1,
            topP: (_g = (_f = options.inferenceConfig) === null || _f === void 0 ? void 0 : _f.topP) !== null && _g !== void 0 ? _g : 0.9,
            stopSequences: (_h = options.inferenceConfig) === null || _h === void 0 ? void 0 : _h.stopSequences,
        };
        this.retriever = options.retriever;
        this.customVariables = {};
        this.tools = (_j = options.tools) !== null && _j !== void 0 ? _j : {};
        this.maxSteps = (_k = options.maxSteps) !== null && _k !== void 0 ? _k : DEFAULT_MAX_STEPS;
        this.promptTemplate = `You are a ${this.name}. ${this.description} Provide helpful and accurate information based on your expertise.`;
        this.systemPrompt = this.promptTemplate;
        if (options.customSystemPrompt) {
            this.setSystemPrompt(options.customSystemPrompt.template, options.customSystemPrompt.variables);
        }
    }
    getSystemPrompt() {
        return this.systemPrompt;
    }
    async processRequest(inputText, userId, sessionId, chatHistory, additionalParams) {
        let systemPrompt = this.systemPrompt;
        let retrievedContext = '';
        if (this.retriever) {
            retrievedContext = await this.retriever.retrieveAndCombineResults(inputText, { userId, sessionId });
            systemPrompt += "\nContext:\n" + retrievedContext;
        }
        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(msg => {
                var _a;
                return ({
                    role: msg.role.toLowerCase(),
                    content: typeof msg.content === 'string' ? msg.content : ((_a = msg.content[0]) === null || _a === void 0 ? void 0 : _a.text) || ''
                });
            }),
            { role: 'user', content: inputText }
        ];
        const commonOptions = {
            model: this.model,
            messages: messages,
            system: systemPrompt,
            maxTokens: this.inferenceConfig.maxTokens,
            temperature: this.inferenceConfig.temperature,
            topP: this.inferenceConfig.topP,
            stop: this.inferenceConfig.stopSequences,
            tools: this.tools,
            maxSteps: this.maxSteps,
        };
        try {
            if (!this.streaming) {
                // Non-streaming mode using generateText
                const { text, toolCalls, usage, finishReason } = await (0, ai_1.generateText)(commonOptions);
                return {
                    role: types_1.ParticipantRole.ASSISTANT,
                    content: [{
                            text,
                            tool_calls: toolCalls,
                            usage,
                            finish_reason: finishReason
                        }]
                };
            }
            // Streaming mode using streamText
            const result = (0, ai_1.streamText)(commonOptions);
            // Return AsyncIterable for streaming
            return (async function* () {
                try {
                    // Use textStream for simpler text-only streaming
                    for await (const chunk of result.textStream) {
                        yield chunk;
                    }
                }
                catch (error) {
                    logger_1.Logger.logger.error('Error in stream processing:', error);
                    throw error;
                }
            })();
        }
        catch (error) {
            logger_1.Logger.logger.error('Error in AI model call:', error);
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
        this.systemPrompt = this.replacePlaceholders(this.promptTemplate, allVariables);
    }
    replacePlaceholders(template, variables) {
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
    // Helper method to create tools with execute functions
    static createTool(description, parameters, execute) {
        return (0, ai_1.tool)({
            description,
            parameters,
            execute
        });
    }
}
exports.NewAIAgent = NewAIAgent;
//# sourceMappingURL=vercelAiAgent.js.map