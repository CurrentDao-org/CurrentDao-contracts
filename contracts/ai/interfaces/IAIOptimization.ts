import { Address } from '../structures/AIOptStructs';

export interface IAIOptimization {
  submitPrediction(
    strategy: string,
    expectedSavings: number,
    confidence: number,
    oracle: Address
  ): Promise<string>;

  executeDecision(id: string): Promise<void>;

  updateModel(version: string, accuracy: number): Promise<void>;

  getModel(): Promise<any>;
}