"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentOrchestrator = exports.DEFAULT_CONFIG = void 0;
const agentOverlapAnalyzer_1 = require("./agentOverlapAnalyzer");
const memoryChatStorage_1 = require("./storage/memoryChatStorage");
const helpers_1 = require("./utils/helpers");
const logger_1 = require("./utils/logger");
exports.DEFAULT_CONFIG = {
    /** Default: Do not log agent chat interactions */
    LOG_AGENT_CHAT: false,
    /** Default: Do not log classifier chat interactions */
    LOG_CLASSIFIER_CHAT: false,
    /** Default: Do not log raw classifier output */
    LOG_CLASSIFIER_RAW_OUTPUT: false,
    /** Default: Do not log processed classifier output */
    LOG_CLASSIFIER_OUTPUT: false,
    /** Default: Do not log execution times */
    LOG_EXECUTION_TIMES: false,
    /** Default: Retry classifier up to 3 times on bad XML response */
    MAX_RETRIES: 3,
    /** Default: Use the default agent when no agent is identified during intent classification */
    USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED: true,
    /** Default error message for classification errors */
    CLASSIFICATION_ERROR_MESSAGE: undefined,
    /** Default message when no agent is selected to handle the request */
    NO_SELECTED_AGENT_MESSAGE: "I'm sorry, I couldn't determine how to handle your request. Could you please rephrase it?",
    /** Default general error message for routing errors */
    GENERAL_ROUTING_ERROR_MSG_MESSAGE: undefined,
    /** Default: Maximum of 100 message pairs (200 individual messages) to retain per agent */
    MAX_MESSAGE_PAIRS_PER_AGENT: 100,
};
class MultiAgentOrchestrator {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        this.storage = options.storage || new memoryChatStorage_1.InMemoryChatStorage();
        // Merge the provided config with the DEFAULT_CONFIG
        this.config = {
            LOG_AGENT_CHAT: (_b = (_a = options.config) === null || _a === void 0 ? void 0 : _a.LOG_AGENT_CHAT) !== null && _b !== void 0 ? _b : exports.DEFAULT_CONFIG.LOG_AGENT_CHAT,
            LOG_CLASSIFIER_CHAT: (_d = (_c = options.config) === null || _c === void 0 ? void 0 : _c.LOG_CLASSIFIER_CHAT) !== null && _d !== void 0 ? _d : exports.DEFAULT_CONFIG.LOG_CLASSIFIER_CHAT,
            LOG_CLASSIFIER_RAW_OUTPUT: (_f = (_e = options.config) === null || _e === void 0 ? void 0 : _e.LOG_CLASSIFIER_RAW_OUTPUT) !== null && _f !== void 0 ? _f : exports.DEFAULT_CONFIG.LOG_CLASSIFIER_RAW_OUTPUT,
            LOG_CLASSIFIER_OUTPUT: (_h = (_g = options.config) === null || _g === void 0 ? void 0 : _g.LOG_CLASSIFIER_OUTPUT) !== null && _h !== void 0 ? _h : exports.DEFAULT_CONFIG.LOG_CLASSIFIER_OUTPUT,
            LOG_EXECUTION_TIMES: (_k = (_j = options.config) === null || _j === void 0 ? void 0 : _j.LOG_EXECUTION_TIMES) !== null && _k !== void 0 ? _k : exports.DEFAULT_CONFIG.LOG_EXECUTION_TIMES,
            MAX_RETRIES: (_m = (_l = options.config) === null || _l === void 0 ? void 0 : _l.MAX_RETRIES) !== null && _m !== void 0 ? _m : exports.DEFAULT_CONFIG.MAX_RETRIES,
            MAX_MESSAGE_PAIRS_PER_AGENT: (_p = (_o = options.config) === null || _o === void 0 ? void 0 : _o.MAX_MESSAGE_PAIRS_PER_AGENT) !== null && _p !== void 0 ? _p : exports.DEFAULT_CONFIG.MAX_MESSAGE_PAIRS_PER_AGENT,
            USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED: (_r = (_q = options.config) === null || _q === void 0 ? void 0 : _q.USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED) !== null && _r !== void 0 ? _r : exports.DEFAULT_CONFIG.USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED,
            CLASSIFICATION_ERROR_MESSAGE: (_s = options.config) === null || _s === void 0 ? void 0 : _s.CLASSIFICATION_ERROR_MESSAGE,
            NO_SELECTED_AGENT_MESSAGE: (_u = (_t = options.config) === null || _t === void 0 ? void 0 : _t.NO_SELECTED_AGENT_MESSAGE) !== null && _u !== void 0 ? _u : exports.DEFAULT_CONFIG.NO_SELECTED_AGENT_MESSAGE,
            GENERAL_ROUTING_ERROR_MSG_MESSAGE: (_v = options.config) === null || _v === void 0 ? void 0 : _v.GENERAL_ROUTING_ERROR_MSG_MESSAGE
        };
        this.executionTimes = new Map();
        this.logger = new logger_1.Logger(options.config, options.logger);
        this.agents = {};
        this.classifier = options.classifier;
        this.defaultAgent = options.defaultAgent;
        this.errorHandler = options.errorHandler;
    }
    setErrorHandler(errorHandler) {
        this.errorHandler = errorHandler;
    }
    analyzeAgentOverlap() {
        const agents = this.getAllAgents();
        const analyzer = new agentOverlapAnalyzer_1.AgentOverlapAnalyzer(agents);
        analyzer.analyzeOverlap();
    }
    addAgent(agent) {
        if (this.agents[agent.id]) {
            throw new Error(`An agent with ID '${agent.id}' already exists.`);
        }
        this.agents[agent.id] = agent;
        this.classifier.setAgents(this.agents);
    }
    getDefaultAgent() {
        return this.defaultAgent;
    }
    setDefaultAgent(agent) {
        this.defaultAgent = agent;
    }
    setClassifier(intentClassifier) {
        this.classifier = intentClassifier;
    }
    getAllAgents() {
        return Object.fromEntries(Object.entries(this.agents).map(([key, { name, description }]) => [
            key,
            { name, description },
        ]));
    }
    isAsyncIterable(obj) {
        return obj != null && typeof obj[Symbol.asyncIterator] === "function";
    }
    async dispatchToAgent(params) {
        const { userInput, userId, sessionId, classifierResult, additionalParams = {}, } = params;
        try {
            if (!classifierResult.selectedAgent) {
                return "I'm sorry, but I need more information to understand your request. Could you please be more specific?";
            }
            else {
                const { selectedAgent } = classifierResult;
                const agentChatHistory = await this.storage.fetchChat(userId, sessionId, selectedAgent.id);
                this.logger.printChatHistory(agentChatHistory, selectedAgent.id);
                this.logger.info(`Routing intent "${userInput}" to ${selectedAgent.id} ...`);
                const response = await this.measureExecutionTime(`Agent ${selectedAgent.name} | Processing request`, () => selectedAgent.processRequest(userInput, userId, sessionId, agentChatHistory, additionalParams));
                //if (this.isStream(response)) {
                if (this.isAsyncIterable(response)) {
                    return response;
                }
                let responseText = "No response content";
                if (response.content &&
                    response.content.length > 0 &&
                    response.content[0].text) {
                    responseText = response.content[0].text;
                }
                return responseText;
            }
        }
        catch (error) {
            this.logger.error("Error during agent dispatch:", error);
            throw error;
        }
    }
    async routeRequest(userInput, userId, sessionId, additionalParams = {}, selectedAgentId, afterAgentDispatch) {
        this.executionTimes = new Map();
        let classifierResult;
        const chatHistory = (await this.storage.fetchAllChats(userId, sessionId)) || [];
        if (selectedAgentId) {
            classifierResult = {
                selectedAgent: this.classifier.getAgentById(selectedAgentId),
                confidence: 1
            };
        }
        else {
            try {
                classifierResult = await this.measureExecutionTime("Classifying user intent", () => this.classifier.classify(userInput, chatHistory));
                if (classifierResult.modifiedInputText) {
                    userInput = classifierResult.modifiedInputText;
                }
                this.logger.printIntent(userInput, classifierResult);
            }
            catch (error) {
                this.logger.error("Error during intent classification:", error);
                return {
                    metadata: this.createMetadata(null, userInput, userId, sessionId, additionalParams),
                    output: this.config.CLASSIFICATION_ERROR_MESSAGE ? this.config.CLASSIFICATION_ERROR_MESSAGE : String(error),
                    streaming: false,
                };
            }
        }
        try {
            // Handle case where no agent was selected
            if (!classifierResult.selectedAgent) {
                if (this.config.USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED && this.defaultAgent) {
                    classifierResult = this.getFallbackResult();
                    this.logger.info("Using default agent as no agent was selected");
                }
                else {
                    return {
                        metadata: this.createMetadata(classifierResult, userInput, userId, sessionId, additionalParams),
                        output: this.config.NO_SELECTED_AGENT_MESSAGE,
                        streaming: false,
                    };
                }
            }
            const agentResponse = await this.dispatchToAgent({
                userInput,
                userId,
                sessionId,
                classifierResult,
                additionalParams,
            });
            const metadata = this.createMetadata(classifierResult, userInput, userId, sessionId, additionalParams);
            if (this.isAsyncIterable(agentResponse)) {
                const accumulatorTransform = new helpers_1.AccumulatorTransform();
                this.processStreamInBackground(agentResponse, accumulatorTransform, () => afterAgentDispatch && afterAgentDispatch({
                    metadata,
                    output: accumulatorTransform.getAccumulatedData().toString(),
                    streaming: true,
                }));
                return {
                    metadata,
                    output: accumulatorTransform,
                    streaming: true,
                };
            }
            afterAgentDispatch && afterAgentDispatch({
                metadata,
                output: agentResponse,
                streaming: true,
            });
            return {
                metadata,
                output: agentResponse,
                streaming: false,
            };
        }
        catch (error) {
            this.logger.error("Error during agent dispatch or processing:", error);
            return {
                metadata: this.createMetadata(classifierResult, userInput, userId, sessionId, additionalParams),
                output: this.config.GENERAL_ROUTING_ERROR_MSG_MESSAGE ? this.config.GENERAL_ROUTING_ERROR_MSG_MESSAGE : String(error),
                streaming: false,
            };
        }
        finally {
            this.logger.printExecutionTimes(this.executionTimes);
        }
    }
    async processStreamInBackground(agentResponse, accumulatorTransform, afterAgentDispatch) {
        const streamStartTime = Date.now();
        let chunkCount = 0;
        try {
            for await (const chunk of agentResponse) {
                if (chunkCount === 0) {
                    const firstChunkTime = Date.now();
                    const timeToFirstChunk = firstChunkTime - streamStartTime;
                    this.executionTimes.set("Time to first chunk", timeToFirstChunk);
                    this.logger.printExecutionTimes(this.executionTimes);
                }
                accumulatorTransform.write(chunk);
                chunkCount++;
            }
            accumulatorTransform.end();
            afterAgentDispatch && afterAgentDispatch();
        }
        catch (error) {
            this.logger.error("Error processing stream:", error);
            if (this.errorHandler) {
                const errorStream = await this.errorHandler(error);
                for await (const chunk of errorStream) {
                    accumulatorTransform.write(chunk);
                    chunkCount++;
                }
                accumulatorTransform.end();
                afterAgentDispatch && afterAgentDispatch();
            }
            else {
                accumulatorTransform.end();
                if (error instanceof Error) {
                    accumulatorTransform.destroy(error);
                }
                else if (typeof error === "string") {
                    accumulatorTransform.destroy(new Error(error));
                }
                else {
                    accumulatorTransform.destroy(new Error("An unknown error occurred"));
                }
            }
        }
    }
    measureExecutionTime(timerName, fn) {
        if (!this.config.LOG_EXECUTION_TIMES) {
            return Promise.resolve(fn());
        }
        const startTime = Date.now();
        this.executionTimes.set(timerName, startTime);
        return Promise.resolve(fn()).then((result) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            this.executionTimes.set(timerName, duration);
            return result;
        }, (error) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            this.executionTimes.set(timerName, duration);
            throw error;
        });
    }
    createMetadata(intentClassifierResult, userInput, userId, sessionId, additionalParams) {
        const baseMetadata = {
            userInput,
            userId,
            sessionId,
            additionalParams,
        };
        if (!intentClassifierResult || !intentClassifierResult.selectedAgent) {
            return {
                ...baseMetadata,
                agentId: "no_agent_selected",
                agentName: "No Agent",
                errorType: "classification_failed",
            };
        }
        return {
            ...baseMetadata,
            agentId: intentClassifierResult.selectedAgent.id,
            agentName: intentClassifierResult.selectedAgent.name,
        };
    }
    getFallbackResult() {
        return {
            selectedAgent: this.getDefaultAgent(),
            confidence: 0,
        };
    }
}
exports.MultiAgentOrchestrator = MultiAgentOrchestrator;
//# sourceMappingURL=orchestrator.js.map