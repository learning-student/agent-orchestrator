export interface OverlapResult {
    overlapPercentage: string;
    potentialConflict: "High" | "Medium" | "Low";
}
export interface UniquenessScore {
    agent: string;
    uniquenessScore: string;
}
export interface AnalysisResult {
    pairwiseOverlap: {
        [key: string]: OverlapResult;
    };
    uniquenessScores: UniquenessScore[];
}
export declare class AgentOverlapAnalyzer {
    private agents;
    constructor(agents: {
        [key: string]: {
            name: string;
            description: string;
        };
    });
    analyzeOverlap(): void;
    private calculateCosineSimilarity;
}
