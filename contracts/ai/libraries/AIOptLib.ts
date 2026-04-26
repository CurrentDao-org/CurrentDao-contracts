import { OptimizationDecision } from '../structures/AIOptStructs';

export class AIOptLib {
  static validateConfidence(confidence: number, min: number) {
    if (confidence < min) {
      throw new Error('Confidence too low');
    }
  }

  static ensureNotExecuted(decision: OptimizationDecision) {
    if (decision.executed) {
      throw new Error('Already executed');
    }
  }
}