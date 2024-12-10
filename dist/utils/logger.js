"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(config = {}, logger = console) {
        this.config = config;
        this.setLogger(logger);
    }
    setLogger(logger) {
        Logger.logger = logger;
    }
    info(message, ...params) {
        Logger.logger.info(message, ...params);
    }
    warn(message, ...params) {
        Logger.logger.warn(message, ...params);
    }
    error(message, ...params) {
        Logger.logger.error(message, ...params);
    }
    debug(message, ...params) {
        Logger.logger.debug(message, ...params);
    }
    log(message, ...params) {
        Logger.logger.log(message, ...params);
    }
    logHeader(title) {
        Logger.logger.info(`\n** ${title.toUpperCase()} **`);
        Logger.logger.info('='.repeat(title.length + 6));
    }
    printChatHistory(chatHistory, agentId = null) {
        const isAgentChat = agentId !== null;
        if (isAgentChat && !this.config.LOG_AGENT_CHAT)
            return;
        if (!isAgentChat && !this.config.LOG_CLASSIFIER_CHAT)
            return;
        const title = isAgentChat
            ? `Agent ${agentId} Chat History`
            : 'Classifier Chat History';
        this.logHeader(title);
        if (chatHistory.length === 0) {
            Logger.logger.info('> - None -');
        }
        else {
            chatHistory.forEach((message, index) => {
                var _a, _b, _c;
                const role = (_b = (_a = message.role) === null || _a === void 0 ? void 0 : _a.toUpperCase()) !== null && _b !== void 0 ? _b : 'UNKNOWN';
                const content = Array.isArray(message.content) ? message.content[0] : message.content;
                const text = typeof content === 'string' ? content : (_c = content === null || content === void 0 ? void 0 : content.text) !== null && _c !== void 0 ? _c : '';
                const trimmedText = text.length > 80 ? `${text.slice(0, 80)}...` : text;
                Logger.logger.info(`> ${index + 1}. ${role}:${trimmedText}`);
            });
        }
        this.info('');
    }
    logClassifierOutput(output, isRaw = false) {
        if (isRaw && !this.config.LOG_CLASSIFIER_RAW_OUTPUT)
            return;
        if (!isRaw && !this.config.LOG_CLASSIFIER_OUTPUT)
            return;
        this.logHeader(isRaw ? 'Raw Classifier Output' : 'Processed Classifier Output');
        isRaw ? Logger.logger.info(output) : Logger.logger.info(JSON.stringify(output, null, 2));
        Logger.logger.info('');
    }
    printIntent(userInput, intentClassifierResult) {
        if (!this.config.LOG_CLASSIFIER_OUTPUT)
            return;
        this.logHeader('Classified Intent');
        Logger.logger.info(`> Text: ${userInput}`);
        Logger.logger.info(`> Selected Agent: ${intentClassifierResult.selectedAgent
            ? intentClassifierResult.selectedAgent.name
            : "No agent selected"}`);
        Logger.logger.info(`> Confidence: ${(intentClassifierResult.confidence || 0).toFixed(2)}`);
        this.info('');
    }
    printExecutionTimes(executionTimes) {
        if (!this.config.LOG_EXECUTION_TIMES)
            return;
        this.logHeader('Execution Times');
        if (executionTimes.size === 0) {
            Logger.logger.info('> - None -');
        }
        else {
            executionTimes.forEach((duration, timerName) => {
                Logger.logger.info(`> ${timerName}: ${duration}ms`);
            });
        }
        Logger.logger.info('');
    }
}
exports.Logger = Logger;
Logger.logger = console;
//# sourceMappingURL=logger.js.map