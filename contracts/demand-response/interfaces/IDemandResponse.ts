export enum DemandEventStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EMERGENCY = 'EMERGENCY'
}

export enum ParticipantStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum RewardTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM'
}

export enum IncentiveType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
  PERFORMANCE = 'PERFORMANCE',
  BONUS = 'BONUS'
}

export interface DemandEvent {
  id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  targetLoadReduction: number; // in kWh
  actualLoadReduction: number; // in kWh
  region: string;
  status: DemandEventStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maxParticipants: number;
  currentParticipants: number;
  incentiveRate: number; // reward per kWh reduced
  createdBy: string;
  createdAt: number;
  metadata: Record<string, string | number | boolean>;
}

export interface Participant {
  id: string;
  address: string;
  smartMeterId: string;
  region: string;
  status: ParticipantStatus;
  baselineLoad: number; // average kWh consumption
  maxReductionCapacity: number; // maximum kWh they can reduce
  currentReduction: number; // current reduction in kWh
  rewardTier: RewardTier;
  totalEventsParticipated: number;
  successfulParticipations: number;
  totalRewardsEarned: number; // in token units
  registrationDate: number;
  lastActiveDate: number;
  metadata: Record<string, string | number | boolean>;
}

export interface SmartMeterReading {
  id: string;
  participantId: string;
  meterId: string;
  timestamp: number;
  consumption: number; // kWh
  baseline: number; // expected consumption
  reduction: number; // actual reduction achieved
  eventId?: string; // associated demand event if any
  verified: boolean;
  verificationTimestamp?: number;
}

export interface DemandResponseIncentive {
  id: string;
  eventId: string;
  participantId: string;
  type: IncentiveType;
  baseRate: number;
  performanceMultiplier: number;
  totalAmount: number;
  calculatedAt: number;
  distributed: boolean;
  distributedAt?: number;
  transactionHash?: string;
}

export interface GridStabilityMetrics {
  timestamp: number;
  totalLoad: number;
  targetLoad: number;
  loadReduction: number;
  frequency: number; // grid frequency in Hz
  voltageStability: number; // voltage stability index
  demandResponseActive: boolean;
  activeEvents: number;
  participatingConsumers: number;
  regionMetrics: Record<string, {
    load: number;
    reduction: number;
    participants: number;
  }>;
}

export interface RewardCalculation {
  participantId: string;
  eventId: string;
  baselineReduction: number;
  actualReduction: number;
  performanceRatio: number; // actual/expected
  baseReward: number;
  performanceBonus: number;
  tierMultiplier: number;
  totalReward: number;
}

export interface DemandEventParticipation {
  eventId: string;
  participantId: string;
  committedReduction: number;
  actualReduction: number;
  startTime: number;
  endTime: number;
  status: 'COMMITTED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  performanceScore: number; // 0-100
  rewardEarned: number;
}

export interface DemandResponseConfig {
  minParticipantsPerEvent: number;
  maxEventsPerDay: number;
  minReductionThreshold: number; // minimum kWh reduction to qualify
  rewardDistributionDelay: number; // seconds after event completion
  performanceThreshold: number; // minimum performance ratio for rewards
  emergencyEventMultiplier: number; // reward multiplier for emergency events
  smartMeterVerificationWindow: number; // time window for meter reading verification
  gridStabilityThreshold: number; // frequency deviation threshold
  maxRewardPerEvent: number; // maximum reward per participant per event
}

export interface DemandResponseEvents {
  onEventCreated?: (event: DemandEvent) => void;
  onEventActivated?: (event: DemandEvent) => void;
  onEventCompleted?: (event: DemandEvent) => void;
  onParticipantRegistered?: (participant: Participant) => void;
  onParticipantParticipated?: (participation: DemandEventParticipation) => void;
  onRewardCalculated?: (reward: RewardCalculation) => void;
  onRewardDistributed?: (incentive: DemandResponseIncentive) => void;
  onGridStabilityAlert?: (metrics: GridStabilityMetrics) => void;
  onSmartMeterReading?: (reading: SmartMeterReading) => void;
}

export interface IDemandResponse {
  // Event Management
  createDemandEvent(
    title: string,
    description: string,
    startTime: number,
    endTime: number,
    targetLoadReduction: number,
    region: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    maxParticipants: number,
    incentiveRate: number,
    creator: string,
    metadata?: Record<string, string | number | boolean>
  ): Promise<DemandEvent>;

  activateDemandEvent(eventId: string, operator: string): Promise<void>;
  completeDemandEvent(eventId: string, operator: string): Promise<void>;
  cancelDemandEvent(eventId: string, reason: string, operator: string): Promise<void>;

  // Participant Management
  registerParticipant(
    address: string,
    smartMeterId: string,
    region: string,
    baselineLoad: number,
    maxReductionCapacity: number,
    metadata?: Record<string, string | number | boolean>
  ): Promise<Participant>;

  updateParticipantProfile(
    participantId: string,
    updates: Partial<Pick<Participant, 'baselineLoad' | 'maxReductionCapacity' | 'metadata'>>,
    operator: string
  ): Promise<void>;

  suspendParticipant(participantId: string, reason: string, operator: string): Promise<void>;
  reactivateParticipant(participantId: string, operator: string): Promise<void>;

  // Event Participation
  commitToEvent(
    eventId: string,
    participantId: string,
    committedReduction: number
  ): Promise<DemandEventParticipation>;

  recordParticipation(
    eventId: string,
    participantId: string,
    actualReduction: number,
    startTime: number,
    endTime: number
  ): Promise<DemandEventParticipation>;

  // Smart Meter Integration
  submitSmartMeterReading(
    participantId: string,
    meterId: string,
    timestamp: number,
    consumption: number,
    baseline: number,
    eventId?: string
  ): Promise<SmartMeterReading>;

  verifySmartMeterReading(readingId: string, verified: boolean, operator: string): Promise<void>;

  // Incentive and Reward Management
  calculateEventRewards(eventId: string): Promise<RewardCalculation[]>;
  distributeRewards(eventId: string, distributor: string): Promise<DemandResponseIncentive[]>;

  // Grid Stability Monitoring
  getGridStabilityMetrics(): Promise<GridStabilityMetrics>;
  updateGridStabilityMetrics(metrics: Partial<GridStabilityMetrics>, operator: string): Promise<void>;

  // Query Functions
  getDemandEvent(eventId: string): DemandEvent | undefined;
  getActiveEvents(): DemandEvent[];
  getParticipant(participantId: string): Participant | undefined;
  getParticipantsByRegion(region: string): Participant[];
  getEventParticipations(eventId: string): DemandEventParticipation[];
  getParticipantHistory(participantId: string): DemandEventParticipation[];
  getSmartMeterReadings(participantId: string, startTime?: number, endTime?: number): SmartMeterReading[];
  getPendingRewards(participantId: string): DemandResponseIncentive[];

  // Configuration
  getConfig(): DemandResponseConfig;
  updateConfig(updates: Partial<DemandResponseConfig>, operator: string): Promise<void>;
}

export const DEMAND_RESPONSE_ERRORS = {
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  EVENT_ALREADY_ACTIVE: 'EVENT_ALREADY_ACTIVE',
  EVENT_NOT_ACTIVE: 'EVENT_NOT_ACTIVE',
  PARTICIPANT_NOT_FOUND: 'PARTICIPANT_NOT_FOUND',
  PARTICIPANT_ALREADY_REGISTERED: 'PARTICIPANT_ALREADY_REGISTERED',
  PARTICIPANT_SUSPENDED: 'PARTICIPANT_SUSPENDED',
  INSUFFICIENT_CAPACITY: 'INSUFFICIENT_CAPACITY',
  EVENT_FULL: 'EVENT_FULL',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  REDUCTION_BELOW_THRESHOLD: 'REDUCTION_BELOW_THRESHOLD',
  SMART_METER_NOT_FOUND: 'SMART_METER_NOT_FOUND',
  READING_ALREADY_VERIFIED: 'READING_ALREADY_VERIFIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  REWARDS_ALREADY_DISTRIBUTED: 'REWARDS_ALREADY_DISTRIBUTED',
  GRID_STABILITY_CRITICAL: 'GRID_STABILITY_CRITICAL'
} as const;

export const DEFAULT_DEMAND_RESPONSE_CONFIG: DemandResponseConfig = {
  minParticipantsPerEvent: 10,
  maxEventsPerDay: 5,
  minReductionThreshold: 0.1, // kWh
  rewardDistributionDelay: 3600, // 1 hour
  performanceThreshold: 0.8, // 80%
  emergencyEventMultiplier: 2.0,
  smartMeterVerificationWindow: 300, // 5 minutes
  gridStabilityThreshold: 0.5, // Hz
  maxRewardPerEvent: 1000 // token units
};
