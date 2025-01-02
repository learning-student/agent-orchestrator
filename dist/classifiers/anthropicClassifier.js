"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicClassifier = void 0;
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const classifier_1 = require("./classifier");
const sdk_1 = require("@anthropic-ai/sdk");
class AnthropicClassifier extends classifier_1.Classifier {
    constructor(options) {
        var _a, _b, _c, _d, _e;
        super();
        if (!options.apiKey) {
            throw new Error("Anthropic API key is required");
        }
        this.client = new sdk_1.Anthropic({ apiKey: options.apiKey });
        this.modelId = options.modelId || types_1.ANTHROPIC_MODEL_ID_CLAUDE_3_5_SONNET;
        // Set default value for max_tokens if not provided
        const defaultMaxTokens = 1000; // You can adjust this default value as needed
        this.inferenceConfig = {
            maxTokens: (_b = (_a = options.inferenceConfig) === null || _a === void 0 ? void 0 : _a.maxTokens) !== null && _b !== void 0 ? _b : defaultMaxTokens,
            temperature: (_c = options.inferenceConfig) === null || _c === void 0 ? void 0 : _c.temperature,
            topP: (_d = options.inferenceConfig) === null || _d === void 0 ? void 0 : _d.topP,
            stopSequences: (_e = options.inferenceConfig) === null || _e === void 0 ? void 0 : _e.stopSequences,
        };
    }
    /* eslint-disable @typescript-eslint/no-unused-vars */
    async processRequest(inputText, chatHistory) {
        const userMessage = {
            role: types_1.ParticipantRole.USER,
            content: inputText,
        };
        try {
            const response = await this.client.messages.create({
                model: this.modelId,
                max_tokens: this.inferenceConfig.maxTokens,
                messages: [
                    userMessage
                ],
                system: this.systemPrompt,
                temperature: this.inferenceConfig.temperature,
                top_p: this.inferenceConfig.topP,
            });
            console.log("response", response);
            var content = response.content.find(item => item.type === 'text');
            console.log("content", content.text);
            var jsonMatch = content.text.match(/({[\s\S]*?})/);
            var prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            console.log("prediction", prediction);
            // Create and return IntentClassifierResult
            const intentClassifierResult = {
                selectedAgent: this.getAgentById(prediction.agentId),
                confidence: parseFloat(prediction.confidence),
            };
            return intentClassifierResult;
        }
        catch (error) {
            logger_1.Logger.logger.error("Error processing request:", error);
            // Instead of returning a default result, we'll throw the error
            throw error;
        }
    }
}
exports.AnthropicClassifier = AnthropicClassifier;
//# sourceMappingURL=anthropicClassifier.js.map