/**
 * Cross-Chain Bridge Structures
 * Defines data structures for universal blockchain bridge operations
 */

export interface BridgeConfig {
  supportedChains: string[];
  minConfirmations: number;
  maxTransferAmount: bigint;
  bridgeFee: number;
  emergencyPause: boolean;
  liquidityThreshold: bigint;
  securityLevel: SecurityLevel;
}

export interface CrossChainTransfer {
  transferId: string;
  fromChain: string;
  toChain: string;
  fromAddress: string;
  toAddress: string;
  token: string;
  amount: bigint;
  fee: bigint;
  nonce: bigint;
  timestamp: bigint;
  status: TransferStatus;
  confirmations: number;
  requiredConfirmations: number;
  relayData?: string;
  completedAt?: bigint;
}

export interface BridgeLiquidityPool {
  poolId: string;
  token: string;
  chain: string;
  totalLiquidity: bigint;
  availableLiquidity: bigint;
  lockedLiquidity: bigint;
  liquidityProviders: LiquidityProvider[];
  feeRate: number;
  lastUpdate: bigint;
}

export interface LiquidityProvider {
  provider: string;
  amount: bigint;
  shares: bigint;
  rewardsEarned: bigint;
  lastDeposit: bigint;
  isActive: boolean;
}

export interface BridgeValidator {
  validatorId: string;
  address: string;
  chain: string;
  stake: bigint;
  reputation: number;
  isActive: boolean;
  lastValidation: bigint;
  totalValidations: number;
  successfulValidations: number;
  commissionRate: number;
}

export interface TransferValidation {
  validationId: string;
  transferId: string;
  validatorId: string;
  isValid: boolean;
  signature: string;
  timestamp: bigint;
  evidence?: string;
}

export interface BridgeGovernance {
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

export interface ChainMetadata {
  chainId: string;
  name: string;
  nativeToken: string;
  blockTime: number;
  finality: number;
  bridgeContract: string;
  isActive: boolean;
  supportedTokens: string[];
  minGas: bigint;
  maxGas: bigint;
}

export interface BridgeFee {
  feeId: string;
  transferId: string;
  amount: bigint;
  type: FeeType;
  recipient: string;
  timestamp: bigint;
  isDistributed: boolean;
}

export interface EmergencyAction {
  actionId: string;
  type: EmergencyType;
  initiator: string;
  target: string;
  reason: string;
  timestamp: bigint;
  executed: boolean;
  approvals: string[];
}

export interface BridgeMetrics {
  totalTransfers: number;
  successfulTransfers: number;
  totalVolume: bigint;
  totalFees: bigint;
  activeValidators: number;
  totalLiquidity: bigint;
  averageTransferTime: number;
  chainUtilization: { [chainId: string]: number };
  tokenUtilization: { [token: string]: number };
}

export interface RelayerMessage {
  messageId: string;
  transferId: string;
  sourceChain: string;
  targetChain: string;
  payload: any;
  signature: string;
  timestamp: bigint;
  relayed: boolean;
  attempts: number;
}

export interface BridgeToken {
  tokenId: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: bigint;
  chains: string[];
  bridgeFee: number;
  isActive: boolean;
  metadata: TokenMetadata;
}

export interface TokenMetadata {
  icon: string;
  description: string;
  website: string;
  socialLinks: { platform: string; url: string }[];
  verificationStatus: VerificationStatus;
}

export interface CrossChainSwap {
  swapId: string;
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  fromAmount: bigint;
  toAmount: bigint;
  slippage: number;
  recipient: string;
  timestamp: bigint;
  status: SwapStatus;
  route: SwapRoute[];
}

export interface SwapRoute {
  fromToken: string;
  toToken: string;
  chain: string;
  exchange: string;
  rate: number;
  fee: number;
}

export interface BridgeSecurity {
  securityId: string;
  type: SecurityType;
  level: SecurityLevel;
  parameters: any;
  isActive: boolean;
  lastTriggered: bigint;
  triggerCount: number;
}

export interface LiquidityReward {
  rewardId: string;
  provider: string;
  poolId: string;
  amount: bigint;
  type: RewardType;
  period: bigint;
  claimed: boolean;
  timestamp: bigint;
}

export interface BridgeAudit {
  auditId: string;
  auditor: string;
  scope: AuditScope;
  findings: AuditFinding[];
  score: number;
  timestamp: bigint;
  recommendations: string[];
}

export enum TransferStatus {
  PENDING = 0,
  CONFIRMED = 1,
  VALIDATING = 2,
  VALIDATED = 3,
  RELAYING = 4,
  COMPLETED = 5,
  FAILED = 6,
  REFUNDED = 7,
  CANCELLED = 8
}

export enum SecurityLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum GovernanceType {
  PARAMETER_CHANGE = 0,
  CHAIN_MANAGEMENT = 1,
  TOKEN_MANAGEMENT = 2,
  FEE_ADJUSTMENT = 3,
  SECURITY_UPDATE = 4,
  EMERGENCY_ACTION = 5
}

export enum FeeType {
  TRANSFER = 0,
  VALIDATION = 1,
  RELAY = 2,
  LIQUIDITY = 3,
  GOVERNANCE = 4
}

export enum EmergencyType {
  PAUSE_TRANSFERS = 0,
  PAUSE_VALIDATORS = 1,
  FREEZE_LIQUIDITY = 2,
  EMERGENCY_WITHDRAW = 3,
  CANCEL_TRANSFER = 4,
  UPDATE_CONFIG = 5
}

export enum VerificationStatus {
  UNVERIFIED = 0,
  PENDING = 1,
  VERIFIED = 2,
  REJECTED = 3
}

export enum SwapStatus {
  PENDING = 0,
  SEARCHING = 1,
  EXECUTING = 2,
  COMPLETED = 3,
  FAILED = 4,
  REFUNDED = 5
}

export enum SecurityType {
  ANOMALY_DETECTION = 0,
  FRAUD_PREVENTION = 1,
  RATE_LIMITING = 2,
  VALIDATION_REQUIRED = 3,
  TIME_LOCK = 4
}

export enum RewardType {
  LIQUIDITY_PROVIDING = 0,
  VALIDATION = 1,
  RELAYING = 2,
  GOVERNANCE = 3
}

export enum AuditScope {
  SECURITY = 0,
  PERFORMANCE = 1,
  COMPLIANCE = 2,
  LIQUIDITY = 3,
  GOVERNANCE = 4
}

export interface AuditFinding {
  severity: FindingSeverity;
  category: FindingCategory;
  description: string;
  impact: string;
  recommendation: string;
  evidence?: string;
}

export enum FindingSeverity {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum FindingCategory {
  SECURITY = 0,
  PERFORMANCE = 1,
  COMPLIANCE = 2,
  OPERATIONAL = 3,
  FINANCIAL = 4
}

export interface BridgeEvent {
  eventId: string;
  type: EventType;
  transferId?: string;
  chain: string;
  data: any;
  timestamp: bigint;
  processed: boolean;
}

export enum EventType {
  TRANSFER_INITIATED = 0,
  TRANSFER_CONFIRMED = 1,
  TRANSFER_VALIDATED = 2,
  TRANSFER_RELAYED = 3,
  TRANSFER_COMPLETED = 4,
  TRANSFER_FAILED = 5,
  LIQUIDITY_ADDED = 6,
  LIQUIDITY_REMOVED = 7,
  VALIDATOR_REGISTERED = 8,
  VALIDATOR_SLASHED = 9,
  EMERGENCY_TRIGGERED = 10,
  CONFIG_UPDATED = 11
}
