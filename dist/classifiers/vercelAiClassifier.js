"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelAIClassifier = void 0;
const logger_1 = require("../utils/logger");
const classifier_1 = require("./classifier");
const ai_1 = require("ai");
const zod_1 = require("zod");
const analyzePromptSchema = zod_1.z.object({
    userinput: zod_1.z.string().describe('The original user input'),
    selected_agent: zod_1.z.string().describe('The name of the selected agent'),
    confidence: zod_1.z.number().min(0).max(1).describe('Confidence level between 0 and 1')
});
class VercelAIClassifier extends classifier_1.Classifier {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g;
        super();
        this.currentInput = '';
        this.tools = {
            analyzePrompt: (0, ai_1.tool)({
                description: 'Analyze the user input and provide structured output',
                parameters: analyzePromptSchema,
                execute: async (args, context) => {
                    try {
                        const selectedAgent = this.getAgentById(args.selected_agent);
                        if (!selectedAgent) {
                            throw new Error(`Invalid agent ID: ${args.selected_agent}`);
                        }
                        return {
                            selectedAgent,
                            confidence: args.confidence,
                        };
                    }
                    catch (error) {
                        logger_1.Logger.logger.error("Error in analyzePrompt execution:", error);
                        throw error;
                    }
                }
            })
        };
        this.model = options.model;
        // Set default values for inference config
        const defaultMaxTokens = 1000;
        this.inferenceConfig = {
            maxTokens: (_b = (_a = options.inferenceConfig) === null || _a === void 0 ? void 0 : _a.maxTokens) !== null && _b !== void 0 ? _b : defaultMaxTokens,
            temperature: (_d = (_c = options.inferenceConfig) === null || _c === void 0 ? void 0 : _c.temperature) !== null && _d !== void 0 ? _d : 0.1,
            topP: (_f = (_e = options.inferenceConfig) === null || _e === void 0 ? void 0 : _e.topP) !== null && _f !== void 0 ? _f : 0.9,
            stopSequences: (_g = options.inferenceConfig) === null || _g === void 0 ? void 0 : _g.stopSequences,
        };
    }
    /**
     * Process a request to classify user input
     * @param inputText - The user input to classify
     * @param chatHistory - The conversation history (unused in this implementation)
     * @returns A Promise resolving to a ClassifierResult
     */
    async processRequest(inputText, chatHistory) {
        var _a;
        this.currentInput = inputText;
        try {
            const response = await (0, ai_1.generateText)({
                model: this.model,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: inputText }
                ],
                maxTokens: this.inferenceConfig.maxTokens,
                temperature: this.inferenceConfig.temperature,
                topP: this.inferenceConfig.topP,
                tools: this.tools,
                maxSteps: 1,
                maxRetries: 2,
            });
            if (!((_a = response.toolCalls) === null || _a === void 0 ? void 0 : _a[0])) {
                throw new Error("No tool calls found in the response");
            }
            return response.toolCalls[0].args;
        }
        catch (error) {
            logger_1.Logger.logger.error("Error processing request:", error);
            throw error;
        }
    }
}
exports.VercelAIClassifier = VercelAIClassifier;
//# sourceMappingURL=vercelAiClassifier.js.map