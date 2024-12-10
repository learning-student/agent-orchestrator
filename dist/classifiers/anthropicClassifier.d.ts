import { ConversationMessage } from "../types";
import { Classifier, ClassifierResult } from "./classifier";
export interface AnthropicClassifierOptions {
    modelId?: string;
    inferenceConfig?: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        stopSequences?: string[];
    };
    apiKey: string;
}
export declare class AnthropicClassifier extends Classifier {
    private client;
    protected inferenceConfig: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        stopSequences?: string[];
    };
    private tools;
    constructor(options: AnthropicClassifierOptions);
    processRequest(inputText: string, chatHistory: ConversationMessage[]): Promise<ClassifierResult>;
}
