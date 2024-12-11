"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIClassifier = void 0;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const classifier_1 = require("./classifier");
class OpenAIClassifier extends classifier_1.Classifier {
    constructor(options) {
        var _a, _b, _c, _d, _e;
        super();
        if (!options.apiKey) {
            throw new Error("OpenAI API key is required");
        }
        this.client = new openai_1.default({ apiKey: options.apiKey, baseURL: options.baseURL });
        this.modelId = options.modelId || types_1.OPENAI_MODEL_ID_GPT_O_MINI;
        const defaultMaxTokens = 1000;
        this.inferenceConfig = {
            maxTokens: (_b = (_a = options.inferenceConfig) === null || _a === void 0 ? void 0 : _a.maxTokens) !== null && _b !== void 0 ? _b : defaultMaxTokens,
            temperature: (_c = options.inferenceConfig) === null || _c === void 0 ? void 0 : _c.temperature,
            topP: (_d = options.inferenceConfig) === null || _d === void 0 ? void 0 : _d.topP,
            stopSequences: (_e = options.inferenceConfig) === null || _e === void 0 ? void 0 : _e.stopSequences,
        };
    }
    /**
     * Method to process a request.
     * This method must be implemented by all concrete agent classes.
     *
     * @param inputText - The user input as a string.
     * @param chatHistory - An array of Message objects representing the conversation history.
     * @param additionalParams - Optional additional parameters as key-value pairs.
     * @returns A Promise that resolves to a Message object containing the agent's response.
     */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    async processRequest(inputText, chatHistory) {
        var _a, _b;
        const messages = [
            {
                role: 'system',
                content: this.systemPrompt
            },
            {
                role: 'user',
                content: inputText
            }
        ];
        try {
            const response = await this.client.chat.completions.create({
                model: this.modelId,
                messages: messages,
                max_tokens: this.inferenceConfig.maxTokens,
                temperature: this.inferenceConfig.temperature,
                top_p: this.inferenceConfig.topP,
                prediction: {
                    content: '{"agentId": "", "confidence": 0}',
                    type: 'content'
                }
                //tools: this.tools,
                //tool_choice: "required"
            });
            var content = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
            var prediction = JSON.parse(content);
            const intentClassifierResult = {
                selectedAgent: this.getAgentById(prediction.agentId),
                confidence: parseFloat(prediction.confidence)
            };
            return intentClassifierResult;
        }
        catch (error) {
            logger_1.Logger.logger.error("Error processing request:", error);
            throw error;
        }
    }
}
exports.OpenAIClassifier = OpenAIClassifier;
//# sourceMappingURL=openAIClassifier.js.map