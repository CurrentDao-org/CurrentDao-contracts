import {
  DemandEvent,
  Participant,
  SmartMeterReading,
  DemandResponseIncentive,
  GridStabilityMetrics,
  RewardCalculation,
  DemandEventParticipation,
  DemandEventStatus,
  ParticipantStatus,
  RewardTier,
  IncentiveType
} from '../interfaces/IDemandResponse';

// Extended data structures for internal use and optimization

export interface DemandEventStore {
  events: Map<string, DemandEvent>;
  activeEvents: Set<string>;
  eventsByRegion: Map<string, Set<string>>;
  eventsByStatus: Map<DemandEventStatus, Set<string>>;
  eventTimeline: Array<{
    eventId: string;
    timestamp: number;
    action: 'CREATED' | 'ACTIVATED' | 'COMPLETED' | 'CANCELLED';
  }>;
}

export interface ParticipantStore {
  participants: Map<string, Participant>;
  participantsByRegion: Map<string, Set<string>>;
  participantsByStatus: Map<ParticipantStatus, Set<string>>;
  participantsByTier: Map<RewardTier, Set<string>>;
  addressToParticipantId: Map<string, string>;
  smartMeterToParticipantId: Map<string, string>;
}

export interface ParticipationStore {
  participations: Map<string, DemandEventParticipation>; // key: eventId-participantId
  participationsByEvent: Map<string, Set<string>>; // eventId -> participantIds
  participationsByParticipant: Map<string, Set<string>>; // participantId -> eventIds
  activeParticipations: Set<string>; // currently active participations
}

export interface SmartMeterStore {
  readings: Map<string, SmartMeterReading>;
  readingsByParticipant: Map<string, Set<string>>; // participantId -> readingIds
  readingsByEvent: Map<string, Set<string>>; // eventId -> readingIds
  readingsByTimeRange: Map<number, Set<string>>; // timestamp bucket -> readingIds
  unverifiedReadings: Set<string>;
}

export interface IncentiveStore {
  incentives: Map<string, DemandResponseIncentive>;
  incentivesByEvent: Map<string, Set<string>>; // eventId -> incentiveIds
  incentivesByParticipant: Map<string, Set<string>>; // participantId -> incentiveIds
  pendingDistribution: Set<string>;
  distributedIncentives: Set<string>;
}

export interface GridMetricsStore {
  currentMetrics: GridStabilityMetrics;
  historicalMetrics: GridStabilityMetrics[];
  alerts: Array<{
    id: string;
    type: 'FREQUENCY_DEVIATION' | 'VOLTAGE_INSTABILITY' | 'LOAD_IMBALANCE' | 'CAPACITY_SHORTAGE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    timestamp: number;
    resolved: boolean;
    resolvedAt?: number;
  }>;
}

export interface PerformanceMetrics {
  totalEvents: number;
  successfulEvents: number;
  totalParticipants: number;
  activeParticipants: number;
  totalLoadReduction: number; // kWh
  averageParticipationRate: number; // percentage
  averagePerformanceScore: number; // 0-100
  totalRewardsDistributed: number;
  gridStabilityEvents: number;
  responseTime: number; // average response time in seconds
}

export interface DemandResponseStatistics {
  participantStats: {
    total: number;
    byRegion: Record<string, number>;
    byTier: Record<RewardTier, number>;
    byStatus: Record<ParticipantStatus, number>;
    averageBaselineLoad: number;
    averageReductionCapacity: number;
  };
  eventStats: {
    total: number;
    byStatus: Record<DemandEventStatus, number>;
    byPriority: Record<string, number>;
    byRegion: Record<string, number>;
    averageParticipants: number;
    averageLoadReduction: number;
    successRate: number;
  };
  rewardStats: {
    totalDistributed: number;
    averagePerEvent: number;
    averagePerParticipant: number;
    byTier: Record<RewardTier, number>;
    byIncentiveType: Record<IncentiveType, number>;
  };
  gridStats: {
    stabilityEvents: number;
    averageFrequency: number;
    averageVoltageStability: number;
    demandResponseContribution: number; // percentage of stability maintained
  };
  performanceMetrics: PerformanceMetrics;
}

export interface RegionalDemandData {
  region: string;
  currentLoad: number;
  baselineLoad: number;
  availableReductionCapacity: number;
  activeParticipants: number;
  totalParticipants: number;
  gridFrequency: number;
  voltageStability: number;
  forecastedLoad: number;
  weatherImpact: number; // weather factor affecting demand
}

export interface DemandForecast {
  region: string;
  timestamp: number;
  forecastedLoad: number;
  confidence: number; // 0-1
  factors: {
    weather: number;
    timeOfDay: number;
    dayOfWeek: number;
    seasonal: number;
    events: number;
  };
  recommendedActions: Array<{
    action: 'REDUCE_LOAD' | 'SHIFT_LOAD' | 'INCREASE_SUPPLY' | 'ACTIVATE_DR';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedImpact: number;
    cost: number;
  }>;
}

export interface RewardTierBenefits {
  tier: RewardTier;
  requirements: {
    minEvents: number;
    minSuccessRate: number;
    minTotalReduction: number;
    minParticipationMonths: number;
  };
  benefits: {
    rewardMultiplier: number;
    priorityAccess: boolean;
    advancedNotifications: number; // hours in advance
    bonusEligibility: boolean;
    reducedFees: number; // percentage
  };
}

export interface DemandResponseOptimization {
  targetLoadReduction: number;
  availableParticipants: string[];
  participantEfficiency: Map<string, number>; // participantId -> efficiency score
  recommendedAllocation: Map<string, number>; // participantId -> recommended reduction
  estimatedCost: number;
  estimatedGridImpact: number;
  confidence: number;
}

export interface ComplianceReport {
  period: {
    start: number;
    end: number;
  };
  totalEvents: number;
  complianceRate: number;
  averageReduction: number;
  participantAdherence: number;
  gridStabilityContribution: number;
  violations: Array<{
    type: string;
    description: string;
    participantId?: string;
    eventId?: string;
    timestamp: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    resolved: boolean;
  }>;
  recommendations: string[];
}

export interface DemandResponseAudit {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  targetId?: string;
  targetType?: 'EVENT' | 'PARTICIPANT' | 'READING' | 'INCENTIVE' | 'CONFIG';
  details: Record<string, any>;
  previousState?: any;
  newState?: any;
  success: boolean;
  reason?: string;
}

export interface EmergencyDemandResponse {
  id: string;
  triggerType: 'FREENCY_DEVIATION' | 'VOLTAGE_DROP' | 'GENERATION_LOSS' | 'TRANSMISSION_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredReduction: number;
  responseTime: number; // seconds
  autoActivate: boolean;
  affectedRegions: string[];
  notificationMessage: string;
  createdAt: number;
  resolvedAt?: number;
  actualReduction?: number;
  participantResponse: Map<string, {
    committed: number;
    actual: number;
    responseTime: number;
  }>;
}

// Utility types for internal operations
export type EventId = string;
export type ParticipantId = string;
export type ReadingId = string;
export type IncentiveId = string;
export type RegionId = string;
export type MeterId = string;

export interface DemandResponseState {
  events: DemandEventStore;
  participants: ParticipantStore;
  participations: ParticipationStore;
  smartMeters: SmartMeterStore;
  incentives: IncentiveStore;
  gridMetrics: GridMetricsStore;
  statistics: DemandResponseStatistics;
  auditTrail: DemandResponseAudit[];
  emergencyResponses: Map<string, EmergencyDemandResponse>;
}

export interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

export interface BatchOperation<T> {
  items: T[];
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  batchSize: number;
  parallel: boolean;
  validation: boolean;
}

export interface DemandResponseCache {
  participantProfiles: Map<ParticipantId, Participant>;
  eventSummaries: Map<EventId, Partial<DemandEvent>>;
  recentReadings: Map<ParticipantId, SmartMeterReading[]>;
  gridMetrics: GridStabilityMetrics;
  rewardCalculations: Map<string, RewardCalculation>;
}

export interface DemandResponseConfigValidation {
  minParticipantsPerEvent: ValidationRule;
  maxEventsPerDay: ValidationRule;
  minReductionThreshold: ValidationRule;
  rewardDistributionDelay: ValidationRule;
  performanceThreshold: ValidationRule;
  emergencyEventMultiplier: ValidationRule;
  smartMeterVerificationWindow: ValidationRule;
  gridStabilityThreshold: ValidationRule;
  maxRewardPerEvent: ValidationRule;
}

export const DEMAND_RESPONSE_VALIDATION_RULES: DemandResponseConfigValidation = {
  minParticipantsPerEvent: {
    field: 'minParticipantsPerEvent',
    required: true,
    type: 'number',
    min: 1,
    max: 1000000
  },
  maxEventsPerDay: {
    field: 'maxEventsPerDay',
    required: true,
    type: 'number',
    min: 1,
    max: 100
  },
  minReductionThreshold: {
    field: 'minReductionThreshold',
    required: true,
    type: 'number',
    min: 0.001,
    max: 1000
  },
  rewardDistributionDelay: {
    field: 'rewardDistributionDelay',
    required: true,
    type: 'number',
    min: 0,
    max: 86400
  },
  performanceThreshold: {
    field: 'performanceThreshold',
    required: true,
    type: 'number',
    min: 0,
    max: 1
  },
  emergencyEventMultiplier: {
    field: 'emergencyEventMultiplier',
    required: true,
    type: 'number',
    min: 1,
    max: 10
  },
  smartMeterVerificationWindow: {
    field: 'smartMeterVerificationWindow',
    required: true,
    type: 'number',
    min: 60,
    max: 3600
  },
  gridStabilityThreshold: {
    field: 'gridStabilityThreshold',
    required: true,
    type: 'number',
    min: 0.1,
    max: 5
  },
  maxRewardPerEvent: {
    field: 'maxRewardPerEvent',
    required: true,
    type: 'number',
    min: 0,
    max: 1000000
  }
};
