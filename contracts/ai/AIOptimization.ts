import crypto from 'crypto';
import {
  OptimizationDecision,
  ModelMetadata,
  AIConfig,
  Address,
} from './structures/AIOptStructs';

import { IAIOptimization } from './interfaces/IAIOptimization';
import { AIOptLib } from './libraries/AIOptLib';

export class AIOptimization implements IAIOptimization {
  private decisions: Map<string, OptimizationDecision> = new Map();
  private model: ModelMetadata;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;

    this.model = {
      version: 'v1',
      accuracy: 0.8,
      lastTrained: Date.now(),
    };
  }

  private verifyOracle(addr: Address) {
    if (addr !== this.config.oracle) {
      throw new Error('Untrusted oracle');
    }
  }

  async submitPrediction(
    strategy: string,
    expectedSavings: number,
    confidence: number,
    oracle: Address
  ) {
    this.verifyOracle(oracle);

    AIOptLib.validateConfidence(confidence, this.config.minConfidence);

    const id = crypto.randomUUID();

    this.decisions.set(id, {
      id,
      strategy,
      expectedSavings,
      confidence,
      executed: false,
    });

    return id;
  }

  async executeDecision(id: string) {
    const decision = this.decisions.get(id);
    if (!decision) throw new Error('Decision not found');

    AIOptLib.ensureNotExecuted(decision);

    // ⚡ Simulate execution (real system = call energy system)
    decision.executed = true;

    // 📈 Continuous learning simulation
    this.model.accuracy = Math.min(1, this.model.accuracy + 0.01);
  }

  async updateModel(version: string, accuracy: number) {
    this.model = {
      version,
      accuracy,
      lastTrained: Date.now(),
    };
  }

  async getModel() {
    return this.model;
  }
}