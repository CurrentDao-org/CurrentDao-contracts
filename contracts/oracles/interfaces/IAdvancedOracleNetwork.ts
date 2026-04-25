/**
 * Advanced Oracle Network Interface
 * Defines the contract interface for decentralized oracle infrastructure
 */

import {
  OracleNode,
  DataRequest,
  OracleResponse,
  DataValidation,
  ReputationMetrics,
  FailoverConfig,
  OracleIncentive,
  DataQuality,
  NetworkMetrics,
  DataSource,
  AggregationRule,
  OracleStake,
  SlashingCondition,
  OracleNetworkConfig,
  HealthCheck,
  DataSubscription,
  OracleGovernance,
  CrossChainData,
  OracleAudit,
  RequestStatus,
  AggregationMethod,
  DataType,
  IncentiveType,
  SlashingSeverity,
  GovernanceType,
  AuditType
} from '../structures/OracleStructs';

export interface IAdvancedOracleNetwork {
  // Node Management
  registerNode(
    endpoint: string,
    stakeAmount: bigint,
    dataSources: string[],
    commissionRate: number,
    minResponseTime: number
  ): Promise<string>;
  
  unregisterNode(nodeId: string): Promise<void>;
  updateNodeEndpoint(nodeId: string, newEndpoint: string): Promise<void>;
  updateNodeStake(nodeId: string, additionalStake: bigint): Promise<void>;
  withdrawStake(nodeId: string): Promise<void>;
  
  // Data Request Operations
  requestData(
    dataSources: string[],
    parameters: any,
    callbackAddress: string,
    callbackFunction: string,
    timeout: bigint,
    bounty: bigint,
    minResponses: number,
    maxResponses: number,
    aggregationMethod: AggregationMethod,
    gasLimit: bigint
  ): Promise<string>;
  
  cancelRequest(requestId: string): Promise<void>;
  extendRequestTimeout(requestId: string, additionalTime: bigint): Promise<void>;
  
  // Response Operations
  submitResponse(
    requestId: string,
    data: any,
    signature: string
  ): Promise<string>;
  
  validateResponse(responseId: string): Promise<void>;
  disputeResponse(responseId: string, reason: string): Promise<void>;
  
  // Data Validation
  validateData(requestId: string): Promise<string>;
  reportBadData(requestId: string, nodeId: string, reason: string): Promise<void>;
  calculateDataQuality(requestId: string): DataQuality;
  
  // Reputation System
  updateReputation(nodeId: string, metrics: Partial<ReputationMetrics>): Promise<void>;
  getReputation(nodeId: string): ReputationMetrics;
  getTopNodes(limit: number): OracleNode[];
  
  // Failover Mechanisms
  configureFailover(config: FailoverConfig): Promise<void>;
  triggerFailover(primaryNodeId: string): Promise<void>;
  recoverNode(nodeId: string): Promise<void>;
  performHealthCheck(nodeId: string): Promise<HealthCheck>;
  
  // Incentive System
  createIncentive(
    nodeId: string,
    type: IncentiveType,
    amount: bigint,
    criteria: string
  ): Promise<string>;
  
  claimIncentive(incentiveId: string): Promise<void>;
  distributeRewards(requestId: string): Promise<void>;
  
  // Data Source Management
  registerDataSource(
    name: string,
    endpoint: string,
    dataType: DataType,
    updateFrequency: number,
    reliability: number,
    supportedChains: string[],
    authentication: string,
    rateLimit: number
  ): Promise<string>;
  
  updateDataSource(sourceId: string, updates: Partial<DataSource>): Promise<void>;
  deactivateDataSource(sourceId: string): Promise<void>;
  
  // Aggregation Rules
  createAggregationRule(
    name: string,
    method: AggregationMethod,
    parameters: any,
    weights: { nodeId: string; weight: number }[]
  ): Promise<string>;
  
  updateAggregationRule(ruleId: string, updates: Partial<AggregationRule>): Promise<void>;
  applyAggregationRule(requestId: string, ruleId: string): Promise<any>;
  
  // Staking Operations
  stakeNode(nodeId: string, amount: bigint, stakingPeriod: bigint): Promise<string>;
  unstakeNode(stakeId: string): Promise<void>;
  claimStakingRewards(stakeId: string): Promise<bigint>;
  
  // Slashing Operations
  slashNode(nodeId: string, reason: string, severity: SlashingSeverity, amount: bigint): Promise<string>;
  disputeSlash(slashId: string): Promise<void>;
  executeSlash(slashId: string): Promise<void>;
  
  // Network Configuration
  updateNetworkConfig(config: Partial<OracleNetworkConfig>): Promise<void>;
  getNetworkConfig(): OracleNetworkConfig;
  pauseNetwork(): void;
  unpauseNetwork(): void;
  
  // Query Functions
  getNode(nodeId: string): OracleNode;
  getAllNodes(): OracleNode[];
  getActiveNodes(): OracleNode[];
  getRequest(requestId: string): DataRequest;
  getActiveRequests(): DataRequest[];
  getResponse(responseId: string): OracleResponse;
  getResponsesForRequest(requestId: string): OracleResponse[];
  getValidation(validationId: string): DataValidation;
  getValidationsForRequest(requestId: string): DataValidation[];
  getIncentive(incentiveId: string): OracleIncentive;
  getIncentivesForNode(nodeId: string): OracleIncentive[];
  getDataSource(sourceId: string): DataSource;
  getDataSources(): DataSource[];
  getAggregationRule(ruleId: string): AggregationRule;
  getAggregationRules(): AggregationRule[];
  getStake(stakeId: string): OracleStake;
  getStakesForNode(nodeId: string): OracleStake[];
  getSlashingCondition(slashId: string): SlashingCondition;
  getSlashingConditionsForNode(nodeId: string): SlashingCondition[];
  getNetworkMetrics(): NetworkMetrics;
  getHealthChecks(): HealthCheck[];
  
  // Subscription Operations
  subscribeToData(
    dataSource: string,
    updateFrequency: number,
    callbackAddress: string
  ): Promise<string>;
  
  unsubscribeFromData(subscriptionId: string): Promise<void>;
  updateSubscription(subscriptionId: string, updates: Partial<DataSubscription>): Promise<void>;
  getSubscription(subscriptionId: string): DataSubscription;
  getSubscriptionsForSubscriber(subscriber: string): DataSubscription[];
  
  // Governance Operations
  proposeGovernanceChange(
    type: GovernanceType,
    description: string,
    parameters: any,
    votingDeadline: bigint
  ): Promise<string>;
  
  voteOnProposal(proposalId: string, support: boolean): Promise<void>;
  executeGovernanceProposal(proposalId: string): Promise<void>;
  getGovernanceProposal(proposalId: string): OracleGovernance;
  getActiveProposals(): OracleGovernance[];
  
  // Cross-Chain Operations
  submitCrossChainData(
    chainId: string,
    blockNumber: bigint,
    data: any,
    confirmations: number
  ): Promise<string>;
  
  validateCrossChainData(dataId: string): Promise<void>;
  getCrossChainData(dataId: string): CrossChainData;
  
  // Audit Operations
  initiateAudit(nodeId: string, auditType: AuditType, auditor: string): Promise<string>;
  submitAuditReport(auditId: string, findings: any[], score: number, recommendations: string[]): Promise<void>;
  getAudit(auditId: string): OracleAudit;
  getAuditsForNode(nodeId: string): OracleAudit[];
  
  // Emergency Functions
  emergencyPause(): void;
  emergencyUnpause(): void;
  emergencySlashNode(nodeId: string, reason: string): Promise<void>;
  emergencyWithdrawStake(nodeId: string): Promise<void>;
  emergencyCancelRequest(requestId: string): Promise<void>;
}

export interface IAdvancedOracleNetworkEvents {
  NodeRegistered(nodeId: string, operator: string, endpoint: string, stakeAmount: bigint);
  NodeUnregistered(nodeId: string, operator: string);
  NodeEndpointUpdated(nodeId: string, oldEndpoint: string, newEndpoint: string);
  NodeStakeUpdated(nodeId: string, oldStake: bigint, newStake: bigint);
  StakeWithdrawn(nodeId: string, amount: bigint);
  
  DataRequested(requestId: string, requester: string, dataSources: string[], bounty: bigint);
  RequestCancelled(requestId: string, requester: string);
  RequestTimeoutExtended(requestId: string, additionalTime: bigint);
  
  ResponseSubmitted(responseId: string, requestId: string, nodeId: string, timestamp: bigint);
  ResponseValidated(responseId: string, isValid: boolean);
  ResponseDisputed(responseId: string, nodeId: string, reason: string);
  
  DataValidated(validationId: string, requestId: string, validatorId: string, isValid: boolean);
  BadDataReported(requestId: string, nodeId: string, reason: string);
  DataQualityCalculated(requestId: string, qualityScore: number);
  
  ReputationUpdated(nodeId: string, newScore: number);
  NodePromoted(nodeId: string, newRank: string);
  NodeDemoted(nodeId: string, newRank: string);
  
  FailoverTriggered(primaryNodeId: string, backupNodeId: string);
  NodeRecovered(nodeId: string);
  HealthCheckCompleted(nodeId: string, isHealthy: boolean);
  
  IncentiveCreated(incentiveId: string, nodeId: string, type: IncentiveType, amount: bigint);
  IncentiveClaimed(incentiveId: string, nodeId: string, amount: bigint);
  RewardsDistributed(requestId: string, totalRewards: bigint);
  
  DataSourceRegistered(sourceId: string, name: string, dataType: DataType);
  DataSourceUpdated(sourceId: string, name: string);
  DataSourceDeactivated(sourceId: string, name: string);
  
  AggregationRuleCreated(ruleId: string, name: string, method: AggregationMethod);
  AggregationRuleUpdated(ruleId: string, name: string);
  AggregationRuleApplied(requestId: string, ruleId: string, result: any);
  
  NodeStaked(stakeId: string, nodeId: string, amount: bigint, stakingPeriod: bigint);
  NodeUnstaked(stakeId: string, nodeId: string, amount: bigint);
  StakingRewardsClaimed(stakeId: string, nodeId: string, rewardAmount: bigint);
  
  NodeSlashed(slashId: string, nodeId: string, reason: string, severity: SlashingSeverity, amount: bigint);
  SlashDisputed(slashId: string, nodeId: string);
  SlashExecuted(slashId: string, nodeId: string, amount: bigint);
  
  NetworkConfigUpdated(parameter: string, oldValue: any, newValue: any);
  NetworkPaused();
  NetworkUnpaused();
  
  DataSubscribed(subscriptionId: string, subscriber: string, dataSource: string);
  DataUnsubscribed(subscriptionId: string, subscriber: string);
  SubscriptionUpdated(subscriptionId: string, subscriber: string);
  
  GovernanceProposalCreated(proposalId: string, proposer: string, type: GovernanceType);
  VoteCast(proposalId: string, voter: string, support: boolean, weight: bigint);
  ProposalExecuted(proposalId: string, executor: string);
  
  CrossChainDataSubmitted(dataId: string, chainId: string, blockNumber: bigint);
  CrossChainDataValidated(dataId: string, isValid: boolean);
  
  AuditInitiated(auditId: string, nodeId: string, auditType: AuditType);
  AuditReportSubmitted(auditId: string, nodeId: string, score: number);
  
  EmergencyPauseTriggered();
  EmergencyUnpauseTriggered();
  EmergencySlashExecuted(nodeId: string, reason: string);
  EmergencyStakeWithdrawn(nodeId: string, amount: bigint);
  EmergencyRequestCancellation(requestId: string);
}

export interface IAdvancedOracleNetworkErrors {
  NodeNotFound(nodeId: string);
  NodeNotActive(nodeId: string);
  InsufficientStake(required: bigint, provided: bigint);
  NodeAlreadyRegistered(nodeId: string);
  InvalidEndpoint(endpoint: string);
  InvalidStakeAmount(amount: bigint);
  StakeNotWithdrawn(nodeId: string);
  
  RequestNotFound(requestId: string);
  RequestAlreadyCompleted(requestId: string);
  RequestNotActive(requestId: string);
  InsufficientBounty(required: bigint, provided: bigint);
  InvalidTimeout(timeout: bigint);
  TooManyResponses(requestId: string);
  MinResponsesNotMet(requestId: string, required: number, received: number);
  
  ResponseNotFound(responseId: string);
  ResponseAlreadySubmitted(responseId: string);
  InvalidSignature(signature: string);
  ResponseTimeout(responseId: string);
  DuplicateResponse(nodeId: string, requestId: string);
  
  ValidationNotFound(validationId: string);
  ValidationAlreadyPerformed(validationId: string);
  InvalidValidator(validatorId: string);
  InsufficientConfidence(confidence: number, required: number);
  
  InvalidReputationScore(score: number);
  ReputationUpdateFailed(nodeId: string);
  NodeNotQualified(nodeId: string);
  
  FailoverNotConfigured();
  PrimaryNodeHealthy(nodeId: string);
  BackupNodeUnavailable(nodeId: string);
  RecoveryInProgress(nodeId: string);
  
  IncentiveNotFound(incentiveId: string);
  IncentiveAlreadyClaimed(incentiveId: string);
  InsufficientIncentiveBalance(amount: bigint);
  IncentiveCriteriaNotMet(incentiveId: string);
  
  DataSourceNotFound(sourceId: string);
  DataSourceAlreadyExists(sourceId: string);
  InvalidDataType(dataType: DataType);
  UnsupportedChain(chainId: string);
  RateLimitExceeded(sourceId: string);
  
  AggregationRuleNotFound(ruleId: string);
  InvalidAggregationMethod(method: AggregationMethod);
  InvalidWeights(weights: { nodeId: string; weight: number }[]);
  RuleNotApplicable(ruleId: string, requestId: string);
  
  StakeNotFound(stakeId: string);
  StakeNotMatured(stakeId: string);
  InsufficientStakingBalance(nodeId: string, amount: bigint);
  StakingPeriodTooShort(period: bigint);
  
  SlashingConditionNotFound(slashId: string);
  SlashAlreadyExecuted(slashId: string);
  InsufficientSlashAmount(nodeId: string, amount: bigint);
  InvalidSlashingSeverity(severity: SlashingSeverity);
  
  NetworkPaused();
  UnauthorizedConfiguration();
  InvalidConfiguration(parameter: string);
  ConfigurationLocked();
  
  SubscriptionNotFound(subscriptionId: string);
  SubscriptionAlreadyActive(subscriptionId: string);
  InvalidUpdateFrequency(frequency: number);
  CallbackFailed(subscriptionId: string);
  
  GovernanceProposalNotFound(proposalId: string);
  ProposalAlreadyExecuted(proposalId: string);
  VotingPeriodEnded(proposalId: string);
  InsufficientVotingPower(voter: string);
  VoteAlreadyCast(voter: string, proposalId: string);
  
  CrossChainDataNotFound(dataId: string);
  InvalidChainId(chainId: string);
  InsufficientConfirmations(required: number, provided: number);
  CrossChainValidationFailed(dataId: string);
  
  AuditNotFound(auditId: string);
  AuditAlreadyCompleted(auditId: string);
  InvalidAuditor(auditor: string);
  AuditReportRequired(auditId: string);
  
  EmergencyModeActive();
  EmergencyActionFailed(action: string);
  InsufficientEmergencyPermissions(caller: string);
  EmergencyConditionsNotMet();
}
