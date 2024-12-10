"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryChatStorage = void 0;
const chatStorage_1 = require("./chatStorage");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
class InMemoryChatStorage extends chatStorage_1.ChatStorage {
    constructor() {
        super();
        this.conversations = new Map();
    }
    async saveChatMessage(userId, sessionId, agentId, newMessage, maxHistorySize) {
        const key = this.generateKey(userId, sessionId, agentId);
        let conversation = this.conversations.get(key) || [];
        if (super.isConsecutiveMessage(conversation, newMessage)) {
            logger_1.Logger.logger.log(`> Consecutive ${newMessage.role} message detected for agent ${agentId}. Not saving.`);
            return this.removeTimestamps(conversation);
        }
        const timestampedMessage = { ...newMessage, timestamp: Date.now() };
        conversation = [...conversation, timestampedMessage];
        conversation = super.trimConversation(conversation, maxHistorySize);
        this.conversations.set(key, conversation);
        return this.removeTimestamps(conversation);
    }
    async fetchChat(userId, sessionId, agentId, maxHistorySize) {
        const key = this.generateKey(userId, sessionId, agentId);
        let conversation = this.conversations.get(key) || [];
        if (maxHistorySize !== undefined) {
            conversation = super.trimConversation(conversation, maxHistorySize);
        }
        return this.removeTimestamps(conversation);
    }
    async fetchAllChats(userId, sessionId) {
        const allMessages = [];
        for (const [key, messages] of this.conversations.entries()) {
            const [storedUserId, storedSessionId, agentId] = key.split('#');
            if (storedUserId === userId && storedSessionId === sessionId) {
                // Add messages with their associated agentId
                allMessages.push(...messages.map(message => {
                    var _a, _b;
                    return ({
                        ...message,
                        content: message.role === types_1.ParticipantRole.ASSISTANT
                            ? [{ text: `[${agentId}] ${((_b = (_a = message.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || ''}` }]
                            : message.content
                    });
                }));
            }
        }
        // Sort messages by timestamp
        allMessages.sort((a, b) => a.timestamp - b.timestamp);
        return this.removeTimestamps(allMessages);
    }
    generateKey(userId, sessionId, agentId) {
        return `${userId}#${sessionId}#${agentId}`;
    }
    removeTimestamps(messages) {
        return messages.map(({ timestamp: _timestamp, ...message }) => message);
    }
}
exports.InMemoryChatStorage = InMemoryChatStorage;
//# sourceMappingURL=memoryChatStorage.js.map