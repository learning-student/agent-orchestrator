"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStorage = void 0;
class ChatStorage {
    isConsecutiveMessage(conversation, newMessage) {
        if (conversation.length === 0)
            return false;
        const lastMessage = conversation[conversation.length - 1];
        return lastMessage.role === newMessage.role;
    }
    trimConversation(conversation, maxHistorySize) {
        if (maxHistorySize === undefined)
            return conversation;
        // Ensure maxHistorySize is even to maintain complete binoms
        const adjustedMaxHistorySize = maxHistorySize % 2 === 0 ? maxHistorySize : maxHistorySize - 1;
        return conversation.slice(-adjustedMaxHistorySize);
    }
}
exports.ChatStorage = ChatStorage;
//# sourceMappingURL=chatStorage.js.map