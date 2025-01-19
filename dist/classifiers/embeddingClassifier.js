"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingClassifier = void 0;
const logger_1 = require("../utils/logger");
const classifier_1 = require("./classifier");
const faiss = __importStar(require("faiss-node"));
class EmbeddingClassifier extends classifier_1.Classifier {
    constructor(options) {
        var _a, _b;
        super();
        this.agentEmbeddings = [];
        this.agentNames = [];
        this.registeredAgents = new Map();
        this.dimension = 0;
        this.minConfidence = (_a = options.minConfidence) !== null && _a !== void 0 ? _a : 0.7;
        logger_1.Logger.logger.info(`Using Ollama embedding model: ${options.embeddingModel}`);
        this.modelName = options.embeddingModel;
        this.dimension = (_b = options.dimension) !== null && _b !== void 0 ? _b : 0;
        this.index = this.dimension > 0 ? new faiss.IndexFlatIP(this.dimension) : undefined;
    }
    /**
     * Get embeddings from Ollama
     */
    async getEmbeddings(text) {
        const response = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.modelName,
                prompt: text
            })
        });
        if (!response.ok) {
            throw new Error(`Ollama embedding request failed: ${response.statusText}`);
        }
        const result = await response.json();
        return new Float32Array(result.embedding);
    }
    /**
     * Register an agent with the classifier
     */
    async registerAgent(agentId, agent) {
        this.registeredAgents.set(agentId, agent);
        this.agentNames.push(agentId);
        // Get agent description text
        const agentText = `${agent.description}`;
        // Get embeddings from Ollama
        const embeddingArray = await this.getEmbeddings(agentText);
        // Initialize index if this is the first agent
        if (!this.index) {
            this.dimension = embeddingArray.length;
            this.index = new faiss.IndexFlatIP(this.dimension);
        }
        this.index.add(Array.from(embeddingArray));
        this.agentEmbeddings.push(embeddingArray);
        logger_1.Logger.logger.info(`Registered agent: ${agentId}`);
    }
    /**
     * Get all registered agents
     */
    getRegisteredAgents() {
        return this.registeredAgents;
    }
    /**
     * Get agent by ID
     */
    getAgentById(agentId) {
        return this.registeredAgents.get(agentId);
    }
    /**
     * Process a request to classify user input
     */
    async processRequest(inputText, chatHistory) {
        try {
            logger_1.Logger.logger.debug(`Classifying message: ${inputText}`);
            // Get embeddings from Ollama
            const inputArray = await this.getEmbeddings(inputText);
            // Search index for closest match
            const k = 1;
            const result = this.index.search(Array.from(inputArray), k);
            const confidence = (result.distances[0] / 100);
            const bestMatchIndex = result.labels[0];
            const selectedAgentId = this.agentNames[bestMatchIndex];
            const selectedAgent = this.getAgentById(selectedAgentId);
            if (!selectedAgent) {
                throw new Error("No agents registered");
            }
            if (confidence < this.minConfidence) {
                return {
                    selectedAgent: null,
                    confidence: 1
                };
            }
            logger_1.Logger.logger.info(`[Classification] best_match='${selectedAgent.name}' score=${confidence}`);
            return {
                selectedAgent,
                confidence: confidence,
            };
        }
        catch (error) {
            logger_1.Logger.logger.error("Error processing request:", error);
            throw error;
        }
    }
}
exports.EmbeddingClassifier = EmbeddingClassifier;
//# sourceMappingURL=embeddingClassifier.js.map