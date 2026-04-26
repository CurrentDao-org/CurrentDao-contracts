export type Address = string;

export interface EnergyDataPoint {
  timestamp: number;
  demand: number;
  supply: number;
}

export interface OptimizationDecision {
  id: string;
  strategy: string;
  expectedSavings: number;
  confidence: number; // 0 - 1
  executed: boolean;
}

export interface ModelMetadata {
  version: string;
  accuracy: number;
  lastTrained: number;
}

export interface AIConfig {
  oracle: Address; // trusted AI provider
  minConfidence: number;
}