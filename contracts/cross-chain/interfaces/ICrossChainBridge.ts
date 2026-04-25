/**
 * Cross-Chain Bridge Interface
 * Defines the contract interface for universal blockchain bridge operations
 */

import {
  BridgeConfig,
  CrossChainTransfer,
  BridgeLiquidityPool,
  BridgeValidator,
  TransferValidation,
  BridgeGovernance,
  ChainMetadata,
  BridgeFee,
  EmergencyAction,
  BridgeMetrics,
  RelayerMessage,
  BridgeToken,
  CrossChainSwap,
  BridgeSecurity,
  LiquidityReward,
  BridgeAudit,
  TransferStatus,
  SecurityLevel,
  GovernanceType,
  FeeType,
  EmergencyType,
  VerificationStatus,
  SwapStatus,
  SecurityType,
  RewardType,
  AuditScope,
  EventType,
  SwapRoute
} from '../structures/CrossChainStructs';

export interface ICrossChainBridge {
  // Bridge Configuration
  initializeBridge(config: BridgeConfig): Promise<void>;
  updateConfig(config: Partial<BridgeConfig>): Promise<void>;
  getConfig(): BridgeConfig;
  
  // Chain Management
  addChain(chain: ChainMetadata): Promise<void>;
  removeChain(chainId: string): Promise<void>;
  updateChain(chainId: string, updates: Partial<ChainMetadata>): Promise<void>;
  getChain(chainId: string): ChainMetadata;
  getSupportedChains(): ChainMetadata[];
  
  // Token Management
  addToken(token: BridgeToken): Promise<void>;
  removeToken(tokenId: string): Promise<void>;
  updateToken(tokenId: string, updates: Partial<BridgeToken>): Promise<void>;
  getToken(tokenId: string): BridgeToken;
  getSupportedTokens(): BridgeToken[];
  
  // Transfer Operations
  initiateTransfer(
    fromChain: string,
    toChain: string,
    fromAddress: string,
    toAddress: string,
    token: string,
    amount: bigint,
    fee: bigint
  ): Promise<string>;
  
  confirmTransfer(transferId: string, blockNumber: bigint, transactionHash: string): Promise<void>;
  validateTransfer(transferId: string, validatorId: string, isValid: boolean, signature: string): Promise<void>;
  relayTransfer(transferId: string, relayData: string): Promise<void>;
  completeTransfer(transferId: string): Promise<void>;
  cancelTransfer(transferId: string, reason: string): Promise<void>;
  
  // Liquidity Management
  addLiquidity(poolId: string, amount: bigint): Promise<string>;
  removeLiquidity(poolId: string, amount: bigint): Promise<string>;
  createLiquidityPool(token: string, chain: string, feeRate: number): Promise<string>;
  getLiquidityPool(poolId: string): BridgeLiquidityPool;
  getLiquidityPools(): BridgeLiquidityPool[];
  
  // Validator Operations
  registerValidator(chain: string, stake: bigint, commissionRate: number): Promise<string>;
  unregisterValidator(validatorId: string): Promise<void>;
  updateValidatorStake(validatorId: string, additionalStake: bigint): Promise<void>;
  withdrawValidatorStake(validatorId: string): Promise<void>;
  getValidator(validatorId: string): BridgeValidator;
  getActiveValidators(): BridgeValidator[];
  
  // Validation Operations
  submitValidation(
    transferId: string,
    validatorId: string,
    isValid: boolean,
    signature: string,
    evidence?: string
  ): Promise<string>;
  
  getValidation(validationId: string): TransferValidation;
  getValidationsForTransfer(transferId: string): TransferValidation[];
  
  // Fee Management
  calculateBridgeFee(
    fromChain: string,
    toChain: string,
    token: string,
    amount: bigint
  ): bigint;
  
  distributeFees(transferId: string): Promise<void>;
  getFee(feeId: string): BridgeFee;
  getFeesForTransfer(transferId: string): BridgeFee[];
  
  // Governance Operations
  proposeGovernanceChange(
    type: GovernanceType,
    description: string,
    parameters: any,
    votingDeadline: bigint
  ): Promise<string>;
  
  voteOnProposal(proposalId: string, support: boolean): Promise<void>;
  executeGovernanceProposal(proposalId: string): Promise<void>;
  getGovernanceProposal(proposalId: string): BridgeGovernance;
  getActiveProposals(): BridgeGovernance[];
  
  // Emergency Operations
  initiateEmergencyAction(
    type: EmergencyType,
    target: string,
    reason: string
  ): Promise<string>;
  
  approveEmergencyAction(actionId: string): Promise<void>;
  executeEmergencyAction(actionId: string): Promise<void>;
  getEmergencyAction(actionId: string): EmergencyAction;
  getActiveEmergencyActions(): EmergencyAction[];
  
  // Relayer Operations
  submitRelayerMessage(
    transferId: string,
    sourceChain: string,
    targetChain: string,
    payload: any,
    signature: string
  ): Promise<string>;
  
  processRelayerMessage(messageId: string): Promise<void>;
  getRelayerMessage(messageId: string): RelayerMessage;
  getPendingRelayerMessages(): RelayerMessage[];
  
  // Cross-Chain Swap Operations
  initiateCrossChainSwap(
    fromToken: string,
    toToken: string,
    fromChain: string,
    toChain: string,
    fromAmount: bigint,
    slippage: number,
    recipient: string
  ): Promise<string>;
  
  executeCrossChainSwap(swapId: string, route: SwapRoute[]): Promise<void>;
  getCrossChainSwap(swapId: string): CrossChainSwap;
  getActiveSwaps(): CrossChainSwap[];
  
  // Security Operations
  addSecurityRule(
    type: SecurityType,
    level: SecurityLevel,
    parameters: any
  ): Promise<string>;
  
  updateSecurityRule(securityId: string, updates: any): Promise<void>;
  removeSecurityRule(securityId: string): Promise<void>;
  getSecurityRule(securityId: string): BridgeSecurity;
  getActiveSecurityRules(): BridgeSecurity[];
  
  // Reward Operations
  distributeLiquidityRewards(poolId: string): Promise<void>;
  claimReward(rewardId: string): Promise<void>;
  getReward(rewardId: string): LiquidityReward;
  getRewardsForProvider(provider: string): LiquidityReward[];
  
  // Audit Operations
  initiateAudit(scope: AuditScope, auditor: string): Promise<string>;
  submitAuditReport(
    auditId: string,
    findings: any[],
    score: number,
    recommendations: string[]
  ): Promise<void>;
  
  getAudit(auditId: string): BridgeAudit;
  getAuditsForScope(scope: AuditScope): BridgeAudit[];
  
  // Query Functions
  getTransfer(transferId: string): CrossChainTransfer;
  getTransfersByStatus(status: TransferStatus): CrossChainTransfer[];
  getTransfersByChain(chainId: string): CrossChainTransfer[];
  getTransfersByUser(user: string): CrossChainTransfer[];
  getBridgeMetrics(): BridgeMetrics;
  
  // Event Functions
  getEvent(eventId: string): any;
  getEventsByType(type: EventType): any[];
  getEventsByChain(chainId: string): any[];
  
  // Utility Functions
  generateTransferId(fromChain: string, toChain: string, nonce: bigint): string;
  validateTransferParameters(
    fromChain: string,
    toChain: string,
    token: string,
    amount: bigint
  ): boolean;
  estimateTransferTime(fromChain: string, toChain: string): number;
  calculateSlippage(fromAmount: bigint, route: SwapRoute[]): number;
}

export interface ICrossChainBridgeEvents {
  BridgeInitialized(config: BridgeConfig);
  ChainAdded(chainId: string, metadata: ChainMetadata);
  ChainRemoved(chainId: string);
  ChainUpdated(chainId: string, updates: Partial<ChainMetadata>);
  
  TokenAdded(tokenId: string, token: BridgeToken);
  TokenRemoved(tokenId: string);
  TokenUpdated(tokenId: string, updates: Partial<BridgeToken>);
  
  TransferInitiated(transferId: string, fromChain: string, toChain: string, amount: bigint);
  TransferConfirmed(transferId: string, blockNumber: bigint);
  TransferValidated(transferId: string, validatorId: string, isValid: boolean);
  TransferRelayed(transferId: string, relayData: string);
  TransferCompleted(transferId: string, completedAt: bigint);
  TransferFailed(transferId: string, reason: string);
  TransferCancelled(transferId: string, reason: string);
  
  LiquidityPoolCreated(poolId: string, token: string, chain: string);
  LiquidityAdded(poolId: string, provider: string, amount: bigint);
  LiquidityRemoved(poolId: string, provider: string, amount: bigint);
  
  ValidatorRegistered(validatorId: string, chain: string, stake: bigint);
  ValidatorUnregistered(validatorId: string);
  ValidatorStakeUpdated(validatorId: string, newStake: bigint);
  ValidatorSlashed(validatorId: string, amount: bigint);
  
  ValidationSubmitted(validationId: string, transferId: string, validatorId: string, isValid: boolean);
  
  FeeDistributed(transferId: string, totalFees: bigint);
  
  GovernanceProposalCreated(proposalId: string, type: GovernanceType, description: string);
  VoteCast(proposalId: string, voter: string, support: boolean, weight: bigint);
  ProposalExecuted(proposalId: string);
  
  EmergencyActionInitiated(actionId: string, type: EmergencyType, target: string);
  EmergencyActionApproved(actionId: string, approver: string);
  EmergencyActionExecuted(actionId: string);
  
  RelayerMessageSubmitted(messageId: string, transferId: string, sourceChain: string, targetChain: string);
  RelayerMessageProcessed(messageId: string);
  
  CrossChainSwapInitiated(swapId: string, fromToken: string, toToken: string, fromAmount: bigint);
  CrossChainSwapExecuted(swapId: string, toAmount: bigint);
  CrossChainSwapFailed(swapId: string, reason: string);
  
  SecurityRuleAdded(securityId: string, type: SecurityType, level: SecurityLevel);
  SecurityRuleUpdated(securityId: string, updates: any);
  SecurityRuleRemoved(securityId: string);
  SecurityRuleTriggered(securityId: string, details: any);
  
  LiquidityRewardDistributed(poolId: string, totalRewards: bigint);
  RewardClaimed(rewardId: string, provider: string, amount: bigint);
  
  AuditInitiated(auditId: string, scope: AuditScope, auditor: string);
  AuditReportSubmitted(auditId: string, score: number);
  
  ConfigUpdated(parameter: string, oldValue: any, newValue: any);
}

export interface ICrossChainBridgeErrors {
  BridgeNotInitialized(): void;
  ChainNotSupported(chainId: string): void;
  TokenNotSupported(tokenId: string): void;
  InsufficientLiquidity(poolId: string, required: bigint, available: bigint): void;
  TransferNotFound(transferId: string): void;
  InvalidTransferStatus(transferId: string, current: TransferStatus, expected: TransferStatus): void;
  InsufficientConfirmations(transferId: string, current: number, required: number): void;
  ValidationFailed(transferId: string, reason: string): void;
  ValidatorNotFound(validatorId: string): void;
  ValidatorNotActive(validatorId: string): void;
  InsufficientValidatorStake(validatorId: string, required: bigint, provided: bigint): void;
  DuplicateValidation(transferId: string, validatorId: string): void;
  LiquidityPoolNotFound(poolId: string): void;
  InsufficientLiquidityShares(provider: string, poolId: string, required: bigint, available: bigint): void;
  GovernanceProposalNotFound(proposalId: string): void;
  ProposalAlreadyExecuted(proposalId: string): void;
  VotingPeriodEnded(proposalId: string): void;
  InsufficientVotingPower(voter: string): void;
  VoteAlreadyCast(voter: string, proposalId: string): void;
  EmergencyActionNotFound(actionId: string): void;
  EmergencyActionAlreadyExecuted(actionId: string): void;
  InsufficientApprovals(actionId: string, current: number, required: number): void;
  RelayerMessageNotFound(messageId: string): void;
  MessageAlreadyProcessed(messageId: string): void;
  InvalidMessageSignature(messageId: string): void;
  CrossChainSwapNotFound(swapId: string): void;
  InvalidSwapRoute(swapId: string): void;
  InsufficientSwapLiquidity(swapId: string): void;
  SlippageExceeded(swapId: string, expected: number, actual: number): void;
  SecurityRuleNotFound(securityId: string): void;
  SecurityRuleNotActive(securityId: string): void;
  RewardNotFound(rewardId: string): void;
  RewardAlreadyClaimed(rewardId: string): void;
  AuditNotFound(auditId: string): void;
  AuditAlreadyCompleted(auditId: string): void;
  InvalidAuditScope(scope: AuditScope): void;
  InvalidTransferParameters(fromChain: string, toChain: string, token: string, amount: bigint): void;
  TransferAmountExceedsLimit(amount: bigint, limit: bigint): void;
  BridgeFeeInsufficient(required: bigint, provided: bigint): void;
  NonceInvalid(nonce: bigint): void;
  TransferExpired(transferId: string): void;
  RelayDataInvalid(transferId: string): void;
  TargetChainNotActive(chainId: string): void;
  SourceChainNotActive(chainId: string): void;
  BridgePaused(): void;
  EmergencyModeActive(): void;
  UnauthorizedAccess(caller: string): void;
  ConfigurationLocked(): void;
  InvalidConfiguration(parameter: string): void;
  LiquidityWithdrawalLocked(poolId: string): void;
  ValidatorStakeLocked(validatorId: string): void;
  TransferValidationFailed(transferId: string): void;
  CrossChainMessageFailed(messageId: string): void;
  InsufficientGas(chainId: string, required: bigint, provided: bigint): void;
  TransactionReverted(chainId: string, reason: string): void;
  InvalidContractAddress(chainId: string, address: string): void;
  TokenContractInvalid(tokenId: string): void;
  BridgeContractInvalid(chainId: string): void;
  InsufficientPermissions(caller: string, operation: string): void;
  RateLimitExceeded(caller: string, operation: string): void;
  AnomalyDetected(details: any): void;
  SecurityBreach(details: any): void;
  LiquidityPoolImbalanced(poolId: string): void;
  ValidatorConsensusFailed(transferId: string): void;
  CrossChainCommunicationFailed(chainId: string): void;
  DataIntegrityViolation(details: any): void;
}
