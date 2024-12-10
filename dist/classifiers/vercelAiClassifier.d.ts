import { ConversationMessage } from "../types";
import { Classifier, ClassifierResult } from "./classifier";
import { LanguageModel } from 'ai';
export interface VercelAIClassifierOptions {
    model: LanguageModel;
    inferenceConfig?: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        stopSequences?: string[];
    };
}
export declare class VercelAIClassifier extends Classifier {
    private model;
    private currentInput;
    protected inferenceConfig: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        stopSequences?: string[];
    };
    constructor(options: VercelAIClassifierOptions);
    private tools;
    /**
     * Process a request to classify user input
     * @param inputText - The user input to classify
     * @param chatHistory - The conversation history (unused in this implementation)
     * @returns A Promise resolving to a ClassifierResult
     */
    processRequest(inputText: string, chatHistory: ConversationMessage[]): Promise<ClassifierResult>;
}
