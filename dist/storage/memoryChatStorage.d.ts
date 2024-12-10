import { ChatStorage } from "./chatStorage";
import { ConversationMessage } from "../types";
export declare class InMemoryChatStorage extends ChatStorage {
    private conversations;
    constructor();
    saveChatMessage(userId: string, sessionId: string, agentId: string, newMessage: ConversationMessage, maxHistorySize?: number): Promise<ConversationMessage[]>;
    fetchChat(userId: string, sessionId: string, agentId: string, maxHistorySize?: number): Promise<ConversationMessage[]>;
    fetchAllChats(userId: string, sessionId: string): Promise<ConversationMessage[]>;
    private generateKey;
    private removeTimestamps;
}
