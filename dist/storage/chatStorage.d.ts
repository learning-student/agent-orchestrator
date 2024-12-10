import { ConversationMessage } from "../types";
export declare abstract class ChatStorage {
    protected isConsecutiveMessage(conversation: ConversationMessage[], newMessage: ConversationMessage): boolean;
    protected trimConversation(conversation: ConversationMessage[], maxHistorySize?: number): ConversationMessage[];
    abstract saveChatMessage(userId: string, sessionId: string, agentId: string, newMessage: ConversationMessage, maxHistorySize?: number): Promise<ConversationMessage[]>;
    abstract fetchChat(userId: string, sessionId: string, agentId: string, maxHistorySize?: number): Promise<ConversationMessage[]>;
    abstract fetchAllChats(userId: string, sessionId: string): Promise<ConversationMessage[]>;
}
