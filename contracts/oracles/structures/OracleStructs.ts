/**
 * Oracle Network Structures
 * Defines data structures for oracle network operations
 */

export interface OracleNode {
  nodeId: string;
  operator: string;
  endpoint: string;
  reputationScore: number;
  isActive: boolean;
  stakeAmount: bigint;
  lastResponseTime: bigint;
  totalResponses: number;
  successfulResponses: number;
  registeredAt: bigint;
  dataSources: string[];
  commissionRate: number;
  minResponseTime: number;
}

export interface DataRequest {
  requestId: string;
  requester: string;
  dataSources: string[];
  parameters: any;
  callbackAddress: string;
  callbackFunction: string;
  timeout: bigint;
  bounty: bigint;
  minResponses: number;
  maxResponses: number;
  aggregationMethod: AggregationMethod;
  status: RequestStatus;
  createdAt: bigint;
  responses: OracleResponse[];
  finalResult?: any;
  gasLimit: bigint;
}

export interface OracleResponse {
  responseId: string;
  requestId: string;
  nodeId: string;
  data: any;
  signature: string;
  timestamp: bigint;
  responseTime: number;
  isValid: boolean;
  reputationWeight: number;
}

export interface DataValidation {
  validationId: string;
  requestId: string;
  validatorId: string;
  isValid: boolean;
  confidence: number;
  anomalies: string[];
  timestamp: bigint;
}

export interface ReputationMetrics {
  nodeId: string;
  accuracy: number;
  reliability: number;
  speed: number;
  honesty: number;
  overallScore: number;
  lastUpdated: bigint;
  responseHistory: ResponseRecord[];
}

export interface ResponseRecord {
  timestamp: bigint;
  responseTime: number;
  success: boolean;
  accuracy: number;
  stake: bigint;
}

export interface FailoverConfig {
  primaryNodes: string[];
  backupNodes: string[];
  failoverThreshold: number;
  recoveryThreshold: number;
  maxFailures: number;
  healthCheckInterval: number;
}

export interface OracleIncentive {
  incentiveId: string;
  nodeId: string;
  type: IncentiveType;
  amount: bigint;
  criteria: string;
  isClaimed: boolean;
  createdAt: bigint;
  claimedAt?: bigint;
}

export interface DataQuality {
  requestId: string;
  qualityScore: number;
  freshness: number;
  completeness: number;
  consistency: number;
  accuracy: number;
  timestamp: bigint;
}

export interface NetworkMetrics {
  totalNodes: number;
  activeNodes: number;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  networkHealth: number;
  dataQualityScore: number;
  totalStaked: bigint;
  rewardsDistributed: bigint;
}

export interface DataSource {
  sourceId: string;
  name: string;
  endpoint: string;
  dataType: DataType;
  updateFrequency: number;
  reliability: number;
  isActive: boolean;
  supportedChains: string[];
  authentication: string;
  rateLimit: number;
}

export interface AggregationRule {
  ruleId: string;
  name: string;
  method: AggregationMethod;
  parameters: any;
  weights: { nodeId: string; weight: number }[];
  isActive: boolean;
  createdAt: bigint;
}

export interface OracleStake {
  stakeId: string;
  nodeId: string;
  amount: bigint;
  stakingPeriod: bigint;
  rewardRate: number;
  rewardsEarned: bigint;
  lastUpdateTime: bigint;
  isActive: boolean;
  unlockTime: bigint;
}

export interface SlashingCondition {
  conditionId: string;
  nodeId: string;
  reason: string;
  severity: SlashingSeverity;
  amount: bigint;
  timestamp: bigint;
  isExecuted: boolean;
  evidence: string;
}

export enum RequestStatus {
  PENDING = 0,
  ACTIVE = 1,
  COMPLETED = 2,
  FAILED = 3,
  CANCELLED = 4,
  TIMEOUT = 5
}

export enum AggregationMethod {
  MEDIAN = 0,
  WEIGHTED_AVERAGE = 1,
  MAJORITY_VOTE = 2,
  TRIMMED_MEAN = 3,
  EXPONENTIAL_WEIGHTED = 4,
  REPUTATION_WEIGHTED = 5
}

export enum DataType {
  PRICE = 0,
  VOLUME = 1,
  WEATHER = 2,
  ENERGY_PRODUCTION = 3,
  ENERGY_CONSUMPTION = 4,
  CARBON_CREDITS = 5,
  MARKET_DATA = 6,
  CUSTOM = 7
}

export enum IncentiveType {
  RESPONSE_BOUNTY = 0,
  ACCURACY_BONUS = 1,
  SPEED_BONUS = 2,
  AVAILABILITY_BONUS = 3,
  STAKING_REWARD = 4,
  DISCOVERY_REWARD = 5
}

export enum SlashingSeverity {
  MINOR = 0,
  MAJOR = 1,
  CRITICAL = 2
}

export interface OracleNetworkConfig {
  minStakeAmount: bigint;
  maxNodes: number;
  minReputationScore: number;
  maxResponseTime: number;
  defaultTimeout: bigint;
  networkFee: number;
  slashingPenalty: number;
  rewardMultiplier: number;
  dataQualityThreshold: number;
}

export interface HealthCheck {
  nodeId: string;
  lastCheck: bigint;
  responseTime: number;
  successRate: number;
  isHealthy: boolean;
  issues: string[];
}

export interface DataSubscription {
  subscriptionId: string;
  subscriber: string;
  dataSource: string;
  updateFrequency: number;
  isActive: boolean;
  lastUpdate: bigint;
  callbackAddress: string;
}

export interface OracleGovernance {
  proposalId: string;
  proposer: string;
  type: GovernanceType;
  description: string;
  parameters: any;
  votingDeadline: bigint;
  votes: { voter: string; support: boolean; weight: bigint }[];
  executed: boolean;
  createdAt: bigint;
}

export enum GovernanceType {
  PARAMETER_CHANGE = 0,
  NODE_MANAGEMENT = 1,
  FEE_ADJUSTMENT = 2,
  SLASHING_RULE = 3,
  NETWORK_UPGRADE = 4
}

export interface CrossChainData {
  chainId: string;
  blockNumber: bigint;
  timestamp: bigint;
  data: any;
  confirmations: number;
  isValid: boolean;
}

export interface OracleAudit {
  auditId: string;
  nodeId: string;
  auditor: string;
  auditType: AuditType;
  findings: AuditFinding[];
  score: number;
  timestamp: bigint;
  recommendations: string[];
}

export enum AuditType {
  PERFORMANCE = 0,
  SECURITY = 1,
  COMPLIANCE = 2,
  DATA_QUALITY = 3
}

export interface AuditFinding {
  severity: FindingSeverity;
  description: string;
  impact: string;
  recommendation: string;
}

export enum FindingSeverity {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}
