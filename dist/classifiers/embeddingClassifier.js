"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingClassifier = void 0;
const logger_1 = require("../utils/logger");
const classifier_1 = require("./classifier");
const md5_1 = __importDefault(require("crypto-js/md5"));
class EmbeddingClassifier extends classifier_1.Classifier {
    constructor(options) {
        var _a;
        super();
        this.agentEmbeddings = new Map();
        this.registeredAgents = new Map();
        this.exampleEmbeddings = new Map();
        this.openai = options.openaiClient;
        this.minConfidence = (_a = options.minConfidence) !== null && _a !== void 0 ? _a : 0.7;
        this.embeddingCreator = options.embeddingCreator;
    }
    /**
     * Generate example Q&As for an agent using its description and system prompt
     */
    async generateExampleQAs(agent) {
        var _a, _b, _c;
        try {
            const prompt = `Based on the following agent description and capabilities, generate 5 example question-answer pairs that this agent would be best suited to handle. Format as JSON array.

Description: ${agent.description}
Capabilities: ${agent.name} is designed to ${agent.description}

Generate diverse examples covering different aspects of the agent's capabilities.`;
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a helpful assistant that generates example question-answer pairs for an agent based on its description and capabilities." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                tool_choice: "required",
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "generate_example_qas",
                            description: "Generate example Q&As for an agent",
                            parameters: {
                                type: "object", properties: {
                                    question_and_answers: {
                                        type: "array", items: {
                                            type: "object", properties: {
                                                question: { type: "string" },
                                                answer: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            });
            var toolCall = (_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.tool_calls) === null || _c === void 0 ? void 0 : _c[0];
            var args = JSON.parse(toolCall.function.arguments);
            console.log("args", args);
            return args.question_and_answers;
        }
        catch (error) {
            logger_1.Logger.logger.error("Error generating example Q&As:", error);
            return [];
        }
    }
    /**
     * Register an agent with the classifier
     */
    async registerAgent(agentId, agent) {
        this.registeredAgents.set(agentId, agent);
        // Generate example Q&As
        const exampleQAs = await this.generateExampleQAs(agent);
        // Get embeddings for examples
        for (const qa of exampleQAs) {
            const embedding = await this.getEmbedding(`Question: ${qa.question}\nAnswer: ${qa.answer}`);
            const key = `${agentId}_example_${(0, md5_1.default)(qa.question).toString()}`;
            this.exampleEmbeddings.set(key, embedding);
        }
        // Clear main embeddings cache to force recomputation
        this.agentEmbeddings.clear();
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
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
    /**
     * Get embedding for a text using OpenAI's API with caching
     */
    async getEmbedding(text) {
        return this.embeddingCreator(text);
    }
    /**
     * Update embeddings for all registered agents
     */
    async updateAgentEmbeddings() {
        const agents = this.getRegisteredAgents();
        for (const [agentId, agent] of agents.entries()) {
            // Get agent info
            const agentInfo = {
                name: agent.name || agentId,
                description: agent.description || '',
                exampleQAs: await this.generateExampleQAs(agent)
            };
            // Combine name and description for context
            const agentText = `${agentInfo.name}. ${agentInfo.description}`;
            const embedding = await this.getEmbedding(agentText);
            this.agentEmbeddings.set(agentId, embedding);
            // Get embeddings for examples
            for (const qa of agentInfo.exampleQAs) {
                const qaEmbedding = await this.getEmbedding(`Question: ${qa.question}\nAnswer: ${qa.answer}`);
                const key = `${agentId}_example_${(0, md5_1.default)(qa.question).toString()}`;
                this.exampleEmbeddings.set(key, qaEmbedding);
            }
        }
    }
    /**
     * Process a request to classify user input
     */
    async processRequest(inputText, chatHistory) {
        try {
            // Update agent embeddings if they haven't been cached
            if (this.agentEmbeddings.size === 0) {
                await this.updateAgentEmbeddings();
            }
            // Get embedding for input text
            const inputEmbedding = await this.getEmbedding(inputText);
            // Calculate similarities with all agents and their examples
            let bestMatch = {
                agentId: '',
                similarity: -1,
            };
            // Check similarity with agent descriptions and accumulate scores
            const agentScores = {};
            for (const [agentId, agentEmbedding] of this.agentEmbeddings) {
                const similarity = this.cosineSimilarity(inputEmbedding, agentEmbedding);
                agentScores[agentId] = (agentScores[agentId] || 0) + similarity;
            }
            // Check similarity with example Q&As and accumulate scores
            for (const [key, exampleEmbedding] of this.exampleEmbeddings) {
                const agentId = key.split('_example_')[0];
                const similarity = this.cosineSimilarity(inputEmbedding, exampleEmbedding);
                agentScores[agentId] = (agentScores[agentId] || 0) + similarity;
            }
            // Determine the best match based on accumulated scores
            for (const [agentId, score] of Object.entries(agentScores)) {
                if (score > bestMatch.similarity) {
                    bestMatch = { agentId, similarity: score };
                }
            }
            console.log("bestMatch", bestMatch);
            // Check if the best match meets the minimum confidence threshold
            if (bestMatch.similarity < this.minConfidence) {
                throw new Error("No agent matched with sufficient confidence");
            }
            const selectedAgent = this.getAgentById(bestMatch.agentId);
            if (!selectedAgent) {
                throw new Error(`Invalid agent ID: ${bestMatch.agentId}`);
            }
            return {
                selectedAgent,
                confidence: bestMatch.similarity,
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