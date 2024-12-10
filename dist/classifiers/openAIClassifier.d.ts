import { ConversationMessage } from "../types";
import { Classifier, ClassifierResult } from "./classifier";
export interface OpenAIClassifierOptions {
    modelId?: string;
    baseURL?: string;
    inferenceConfig?: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        stopSequences?: string[];
    };
    apiKey: string;
}
export declare class OpenAIClassifier extends Classifier {
    private client;
    protected inferenceConfig: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        stopSequences?: string[];
    };
    constructor(options: OpenAIClassifierOptions);
    /**
     * Method to process a request.
     * This method must be implemented by all concrete agent classes.
     *
     * @param inputText - The user input as a string.
     * @param chatHistory - An array of Message objects representing the conversation history.
     * @param additionalParams - Optional additional parameters as key-value pairs.
     * @returns A Promise that resolves to a Message object containing the agent's response.
     */
    processRequest(inputText: string, chatHistory: ConversationMessage[]): Promise<ClassifierResult>;
}
