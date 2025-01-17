import { Agent, AgentResponse } from "./agents/agent";
import { ClassifierResult } from './classifiers/classifier';
import { ChatStorage } from "./storage/chatStorage";
import { Classifier } from "./classifiers/classifier";
export type ErrorHandler = (error: Error) => Promise<AsyncIterable<any>>;
export interface OrchestratorConfig {
    /** If true, logs the chat interactions with the agent */
    LOG_AGENT_CHAT?: boolean;
    /** If true, logs the chat interactions with the classifier */
    LOG_CLASSIFIER_CHAT?: boolean;
    /** If true, logs the raw, unprocessed output from the classifier */
    LOG_CLASSIFIER_RAW_OUTPUT?: boolean;
    /** If true, logs the processed output from the classifier */
    LOG_CLASSIFIER_OUTPUT?: boolean;
    /** If true, logs the execution times of various operations */
    LOG_EXECUTION_TIMES?: boolean;
    /** The maximum number of retry attempts for the classifier if it receives a bad XML response */
    MAX_RETRIES?: number;
    /**
     * If true, uses the default agent when no agent is identified during intent classification.
     *
     * When set to true:
     * - If no agent is identified, the system will fall back to using a predefined default agent.
     * - This ensures that user requests are still processed, even if a specific agent cannot be determined.
     *
     * When set to false:
     * - If no agent is identified, the system will return an error message to the user.
     * - This prompts the user to rephrase their request for better agent identification.
     *
     * Use this option to balance between always providing a response (potentially less accurate)
     * and ensuring high confidence in agent selection before proceeding.
     */
    USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED?: boolean;
    /**
     * The error message to display when a classification error occurs.
     *
     * This message is shown to the user when there's an internal error during the intent classification process,
     * separate from cases where no agent is identified.
     */
    CLASSIFICATION_ERROR_MESSAGE?: string;
    /**
     * The message to display when no agent is selected to handle the user's request.
     *
     * This message is shown when the classifier couldn't determine an appropriate agent
     * and USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED is set to false.
     */
    NO_SELECTED_AGENT_MESSAGE?: string;
    /**
     * The general error message to display when an error occurs during request routing.
     *
     * This message is shown when an unexpected error occurs during the processing of a user's request,
     * such as errors in agent dispatch or processing.
     */
    GENERAL_ROUTING_ERROR_MSG_MESSAGE?: string;
    /**
     * Maximum number of message pairs (user-assistant interactions) to retain per agent.
     *
     * This constant defines the upper limit for the conversation history stored for each agent.
     * Each pair consists of a user message and its corresponding assistant response.
     *
     * Usage:
     * - When saving messages: pass (MAX_MESSAGE_PAIRS_PER_AGENT * 2) as maxHistorySize
     * - When fetching chats: pass (MAX_MESSAGE_PAIRS_PER_AGENT * 2) as maxHistorySize
     *
     * Note: The actual number of messages stored will be twice this value,
     * as each pair consists of two messages (user and assistant).
     *
     * Example:
     * If MAX_MESSAGE_PAIRS_PER_AGENT is 5, up to 10 messages (5 pairs) will be stored per agent.
     */
    MAX_MESSAGE_PAIRS_PER_AGENT?: number;
}
export declare const DEFAULT_CONFIG: OrchestratorConfig;
export interface DispatchToAgentsParams {
    userInput: string;
    userId: string;
    sessionId: string;
    classifierResult: ClassifierResult;
    additionalParams?: Record<string, any>;
}
/**
 * Configuration options for the Orchestrator.
 * @property storage - Optional ChatStorage instance for persisting conversations.
 * @property config - Optional partial configuration for the Orchestrator.
 * @property logger - Optional logging mechanism.
 */
export interface OrchestratorOptions {
    storage?: ChatStorage;
    config?: Partial<OrchestratorConfig>;
    logger?: any;
    classifier?: Classifier;
    defaultAgent?: Agent;
    errorHandler?: ErrorHandler;
}
export interface RequestMetadata {
    userInput: string;
    agentId: string;
    agentName: string;
    userId: string;
    sessionId: string;
    additionalParams: Record<string, string>;
    errorType?: 'classification_failed';
}
export declare class MultiAgentOrchestrator {
    private config;
    private storage;
    private agents;
    classifier: Classifier;
    private executionTimes;
    private logger;
    private defaultAgent;
    private errorHandler?;
    constructor(options?: OrchestratorOptions);
    setErrorHandler(errorHandler: ErrorHandler): void;
    analyzeAgentOverlap(): void;
    addAgent(agent: Agent): void;
    getDefaultAgent(): Agent;
    setDefaultAgent(agent: Agent): void;
    setClassifier(intentClassifier: Classifier): void;
    getAllAgents(): {
        [key: string]: {
            name: string;
            description: string;
        };
    };
    private isAsyncIterable;
    dispatchToAgent(params: DispatchToAgentsParams): Promise<string | AsyncIterable<any>>;
    routeRequest(userInput: string, userId: string, sessionId: string, additionalParams?: Record<any, any>, selectedAgentId?: string, afterAgentDispatch?: (response: AgentResponse) => void): Promise<AgentResponse>;
    private processStreamInBackground;
    private measureExecutionTime;
    private createMetadata;
    private getFallbackResult;
}
