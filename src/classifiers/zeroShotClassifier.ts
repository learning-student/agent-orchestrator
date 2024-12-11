import { pipeline, ZeroShotClassificationPipeline } from '@xenova/transformers';
import { Classifier } from './classifier';
import { ClassifierResult } from './classifier';
import { ConversationMessage } from '../types';
import { Logger } from '../utils/logger';

export interface ZeroShotClassifierOptions {
  modelId?: string;
  multiLabel?: boolean;
  hypothesisTemplate?: string;
}

export class ZeroShotClassifier extends Classifier {
  private classifier: ZeroShotClassificationPipeline | null = null;
  private initialized: boolean = false;
  private readonly defaultOptions = {
    multiLabel: false,
    hypothesisTemplate: 'This example is {}.'
  };

  constructor(options: ZeroShotClassifierOptions = {}) {
    super();
    this.modelId = options.modelId || 'facebook/bart-large-mnli';
  }

  public async initialize(): Promise<void> {
    try {
      this.classifier = await pipeline('zero-shot-classification', this.modelId);
      this.initialized = true;
      Logger.logger.info('ZeroShot Classifier model loaded successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during initialization';
      Logger.logger.error(`Failed to initialize ZeroShot classifier: ${message}`);
      throw new Error(`Failed to initialize classifier: ${message}`);
    }
  }

  async processRequest(
    inputText: string,
    _chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {
    if (!this.initialized || !this.classifier) {
      throw new Error('Classifier has not been initialized');
    }

    try {
      // Extract agent IDs as classification labels
      const labels = Object.keys(this.agents);
      
      const result = await this.classifier.call(
        inputText, 
        labels,
        {
          multi_label: false,
          hypothesis_template: this.defaultOptions.hypothesisTemplate
        }
      );

      // Find the agent with highest confidence score
      const maxScoreIndex = result.scores.indexOf(Math.max(...result.scores));
      const selectedAgentId = result.labels[maxScoreIndex];
      
      return {
        selectedAgent: this.getAgentById(selectedAgentId),
        confidence: result.scores[maxScoreIndex]
      };
    } catch (error) {
      Logger.logger.error('Error in ZeroShot classification:', error);
      throw error;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
} 