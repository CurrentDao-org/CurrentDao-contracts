export interface NetworkConditions {
  congestionLevel: number;       // 0–100
  lastUpdatedTimestamp: number;  // Unix ms
  averageBlockTime: number;      // seconds, > 0
}

export interface UserMetrics {
  tradeVolume30d: number;        // USD equivalent, >= 0
  interactionScore: number;      // 0–100
}

export interface FeeTier {
  baseFeeBps: number;
  minFeeBps: number;
  maxFeeBps: number;
}

export interface EmergencyModeEvent {
  isEmergency: boolean;
  safeFeeBps: number;
  timestamp: number;
}

export interface DistributionRecord {
  timestamp: number;
  totalAmount: number;
  recipients: Array<{ address: string; amount: number }>;
}

export interface Recipient {
  address: string;
  allocationBps: number;
  name: string;
}

export interface IDynamicFeeSwitch {
  calculateDynamicFee(userAddress: string, transactionVolume: number): number;
  updateNetworkConditions(conditions: NetworkConditions): void;
  triggerEmergencyMode(isEmergency: boolean, safeFeeBps: number): void;
}
