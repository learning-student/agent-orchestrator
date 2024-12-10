import { ConversationMessage } from "../types";
import { OrchestratorConfig } from "../orchestrator";
import { ClassifierResult } from "../classifiers/classifier";
export declare class Logger {
    static logger: any | Console;
    private config;
    constructor(config?: Partial<OrchestratorConfig>, logger?: any);
    private setLogger;
    info(message: string, ...params: any[]): void;
    warn(message: string, ...params: any[]): void;
    error(message: string, ...params: any[]): void;
    debug(message: string, ...params: any[]): void;
    log(message: string, ...params: any[]): void;
    private logHeader;
    printChatHistory(chatHistory: ConversationMessage[], agentId?: string | null): void;
    logClassifierOutput(output: any, isRaw?: boolean): void;
    printIntent(userInput: string, intentClassifierResult: ClassifierResult): void;
    printExecutionTimes(executionTimes: Map<string, number>): void;
}
