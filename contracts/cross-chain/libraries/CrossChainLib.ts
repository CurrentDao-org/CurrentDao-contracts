/**
 * Cross-Chain Bridge Library
 * Provides utility functions for universal blockchain bridge operations
 */

import {
  BridgeConfig,
  CrossChainTransfer,
  BridgeLiquidityPool,
  BridgeValidator,
  TransferValidation,
  ChainMetadata,
  BridgeToken,
  CrossChainSwap,
  BridgeSecurity,
  TransferStatus,
  SecurityLevel,
  FeeType,
  SwapStatus,
  SecurityType,
  SwapRoute
} from '../structures/CrossChainStructs';

export class CrossChainLib {
  // Constants
  private static readonly BASIS_POINTS = 10000;
  private static readonly DEFAULT_FEE_RATE = 30; // 0.3%
  private static readonly MIN_CONFIRMATIONS = 6;
  private static readonly MAX_TRANSFER_AMOUNT = 1000000n * 10n**18n; // 1M tokens
  private static readonly EMERGENCY_HOLD_TIME = 86400000n; // 24 hours
  
  /**
   * Generate unique transfer ID
   */
  static generateTransferId(fromChain: string, toChain: string, nonce: bigint): string {
    const combined = fromChain + toChain + nonce.toString() + Date.now().toString();
    return '0x' + Buffer.from(combined).toString('hex').slice(0, 64);
  }
  
  /**
   * Validate transfer parameters
   */
  static validateTransferParameters(
    fromChain: string,
    toChain: string,
    token: string,
    amount: bigint
  ): boolean {
    if (fromChain === toChain) {
      return false; // Same chain transfer not allowed
    }
    
    if (!token || token.trim().length === 0) {
      return false;
    }
    
    if (amount <= 0n) {
      return false;
    }
    
    if (amount > CrossChainLib.MAX_TRANSFER_AMOUNT) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate bridge fee
   */
  static calculateBridgeFee(
    fromChain: string,
    toChain: string,
    token: string,
    amount: bigint,
    feeRate: number = CrossChainLib.DEFAULT_FEE_RATE
  ): bigint {
    // Base fee calculation
    let baseFee = (amount * BigInt(feeRate)) / BigInt(CrossChainLib.BASIS_POINTS);
    
    // Chain-specific adjustments
    const chainMultiplier = this.getChainFeeMultiplier(fromChain, toChain);
    baseFee = (baseFee * BigInt(Math.floor(chainMultiplier * 100))) / 100n;
    
    // Token-specific adjustments
    const tokenMultiplier = this.getTokenFeeMultiplier(token);
    baseFee = (baseFee * BigInt(Math.floor(tokenMultiplier * 100))) / 100n;
    
    // Minimum fee
    const minFee = BigInt(1000000); // 0.001 ETH equivalent
    return baseFee < minFee ? minFee : baseFee;
  }
  
  /**
   * Get chain-specific fee multiplier
   */
  private static getChainFeeMultiplier(fromChain: string, toChain: string): number {
    // Higher fees for slower chains or chains with higher gas costs
    const highGasChains = ['ethereum', 'bitcoin'];
    const mediumGasChains = ['polygon', 'arbitrum', 'optimism'];
    
    if (highGasChains.includes(fromChain) || highGasChains.includes(toChain)) {
      return 1.5;
    }
    
    if (mediumGasChains.includes(fromChain) || mediumGasChains.includes(toChain)) {
      return 1.2;
    }
    
    return 1.0;
  }
  
  /**
   * Get token-specific fee multiplier
   */
  private static getTokenFeeMultiplier(token: string): number {
    // Higher fees for stablecoins (more transactions)
    const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'USDP'];
    
    if (stablecoins.includes(token.toUpperCase())) {
      return 1.1;
    }
    
    return 1.0;
  }
  
  /**
   * Estimate transfer time
   */
  static estimateTransferTime(fromChain: string, toChain: string): number {
    const chainTimes: { [key: string]: number } = {
      'ethereum': 15, // minutes
      'polygon': 5,
      'arbitrum': 8,
      'optimism': 8,
      'bitcoin': 60,
      'bsc': 5,
      'avalanche': 3,
      'fantom': 2,
      'solana': 2
    };
    
    const fromTime = chainTimes[fromChain] || 15;
    const toTime = chainTimes[toChain] || 15;
    
    // Add relay and confirmation time
    const relayTime = 5;
    const confirmationTime = Math.max(fromTime, toTime);
    
    return fromTime + toTime + relayTime + confirmationTime;
  }
  
  /**
   * Calculate slippage for cross-chain swap
   */
  static calculateSlippage(fromAmount: bigint, route: SwapRoute[]): number {
    if (route.length === 0) {
      return 0;
    }
    
    let totalSlippage = 0;
    let currentAmount = fromAmount;
    
    for (const hop of route) {
      const hopSlippage = hop.fee / 100; // Convert percentage to decimal
      const hopAmount = (currentAmount * BigInt(Math.floor((1 - hopSlippage) * 1000))) / 1000n;
      totalSlippage += Number(currentAmount - hopAmount) / Number(currentAmount);
      currentAmount = hopAmount;
    }
    
    return totalSlippage;
  }
  
  /**
   * Validate liquidity pool
   */
  static validateLiquidityPool(pool: BridgeLiquidityPool): boolean {
    if (pool.totalLiquidity <= 0n) {
      return false;
    }
    
    if (pool.availableLiquidity < 0n || pool.lockedLiquidity < 0n) {
      return false;
    }
    
    if (pool.availableLiquidity + pool.lockedLiquidity !== pool.totalLiquidity) {
      return false;
    }
    
    if (pool.feeRate < 0 || pool.feeRate > 10000) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate liquidity provider shares
   */
  static calculateLiquidityShares(
    poolAmount: bigint,
    providerAmount: bigint,
    totalShares: bigint
  ): bigint {
    if (poolAmount === 0n) {
      return providerAmount; // First provider gets 1:1 shares
    }
    
    return (providerAmount * totalShares) / poolAmount;
  }
  
  /**
   * Validate bridge configuration
   */
  static validateBridgeConfig(config: BridgeConfig): boolean {
    if (!config.supportedChains || config.supportedChains.length === 0) {
      return false;
    }
    
    if (config.minConfirmations <= 0) {
      return false;
    }
    
    if (config.maxTransferAmount <= 0n) {
      return false;
    }
    
    if (config.bridgeFee < 0 || config.bridgeFee > 10000) {
      return false;
    }
    
    if (config.liquidityThreshold <= 0n) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if transfer is ready for validation
   */
  static isReadyForValidation(transfer: CrossChainTransfer): boolean {
    return transfer.status === TransferStatus.CONFIRMED &&
           transfer.confirmations >= transfer.requiredConfirmations &&
           !this.isTransferExpired(transfer);
  }
  
  /**
   * Check if transfer is expired
   */
  static isTransferExpired(transfer: CrossChainTransfer): boolean {
    const now = BigInt(Date.now());
    const expiryTime = transfer.timestamp + (24n * 60n * 60n * 1000n); // 24 hours
    return now > expiryTime;
  }
  
  /**
   * Calculate validator rewards
   */
  static calculateValidatorRewards(
    totalFee: bigint,
    validatorStake: bigint,
    totalStake: bigint,
    commissionRate: number
  ): bigint {
    // Commission portion
    const commissionAmount = (totalFee * BigInt(commissionRate)) / BigInt(CrossChainLib.BASIS_POINTS);
    
    // Stake-based portion
    const stakeRatio = validatorStake / totalStake;
    const stakeAmount = (totalFee - commissionAmount) * stakeRatio;
    
    return commissionAmount + stakeAmount;
  }
  
  /**
   * Validate bridge token
   */
  static validateBridgeToken(token: BridgeToken): boolean {
    if (!token.symbol || token.symbol.trim().length === 0) {
      return false;
    }
    
    if (!token.name || token.name.trim().length === 0) {
      return false;
    }
    
    if (token.decimals < 0 || token.decimals > 18) {
      return false;
    }
    
    if (token.totalSupply <= 0n) {
      return false;
    }
    
    if (!token.chains || token.chains.length === 0) {
      return false;
    }
    
    if (token.bridgeFee < 0 || token.bridgeFee > 10000) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate cross-chain swap amount
   */
  static calculateSwapAmount(
    fromAmount: bigint,
    route: SwapRoute[]
  ): bigint {
    let currentAmount = fromAmount;
    
    for (const hop of route) {
      // Apply exchange rate and fee
      const rate = BigInt(Math.floor(hop.rate * 1000)) / 1000n;
      const fee = (currentAmount * BigInt(Math.floor(hop.fee * 1000))) / 1000000n;
      const amountAfterFee = currentAmount - fee;
      currentAmount = (amountAfterFee * rate) / 1000n;
    }
    
    return currentAmount;
  }
  
  /**
   * Validate swap route
   */
  static validateSwapRoute(route: SwapRoute[]): boolean {
    if (route.length === 0) {
      return false;
    }
    
    for (const hop of route) {
      if (hop.rate <= 0) {
        return false;
      }
      
      if (hop.fee < 0 || hop.fee > 100) {
        return false;
      }
      
      if (!hop.fromToken || !hop.toToken || !hop.chain || !hop.exchange) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check if security rule should be triggered
   */
  static shouldTriggerSecurityRule(
    rule: BridgeSecurity,
    transfer: CrossChainTransfer,
    context: any
  ): boolean {
    switch (rule.type) {
      case SecurityType.ANOMALY_DETECTION:
        return this.detectAnomaly(transfer, context);
      
      case SecurityType.FRAUD_PREVENTION:
        return this.detectFraud(transfer, context);
      
      case SecurityType.RATE_LIMITING:
        return this.checkRateLimit(transfer, context);
      
      case SecurityType.VALIDATION_REQUIRED:
        return this.requiresExtraValidation(transfer, context);
      
      case SecurityType.TIME_LOCK:
        return this.checkTimeLock(transfer, context);
      
      default:
        return false;
    }
  }
  
  /**
   * Detect anomalies in transfer
   */
  private static detectAnomaly(transfer: CrossChainTransfer, context: any): boolean {
    // Check for unusually large transfers
    if (transfer.amount > context.averageTransferAmount * 10n) {
      return true;
    }
    
    // Check for frequent transfers to same address
    const recentTransfers = context.recentTransfers.filter(
      (t: CrossChainTransfer) => t.toAddress === transfer.toAddress
    );
    
    if (recentTransfers.length > 10) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Detect potential fraud
   */
  private static detectFraud(transfer: CrossChainTransfer, context: any): boolean {
    // Check blacklisted addresses
    if (context.blacklistedAddresses.includes(transfer.fromAddress) ||
        context.blacklistedAddresses.includes(transfer.toAddress)) {
      return true;
    }
    
    // Check for suspicious patterns
    if (transfer.amount === context.suspiciousAmount) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check rate limits
   */
  private static checkRateLimit(transfer: CrossChainTransfer, context: any): boolean {
    const userTransfers = context.userTransfers[transfer.fromAddress] || [];
    const oneHourAgo = BigInt(Date.now() - 3600000);
    
    const recentTransfers = userTransfers.filter(
      (t: CrossChainTransfer) => t.timestamp > oneHourAgo
    );
    
    return recentTransfers.length >= context.maxTransfersPerHour;
  }
  
  /**
   * Check if extra validation is required
   */
  private static requiresExtraValidation(transfer: CrossChainTransfer, context: any): boolean {
    // Large transfers require extra validation
    if (transfer.amount > context.largeTransferThreshold) {
      return true;
    }
    
    // New users require extra validation
    if (!context.knownUsers.includes(transfer.fromAddress)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check time lock restrictions
   */
  private static checkTimeLock(transfer: CrossChainTransfer, context: any): boolean {
    // Check if user is in time lock period
    const userTimeLock = context.userTimeLocks[transfer.fromAddress];
    if (userTimeLock && transfer.timestamp < userTimeLock) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate emergency action ID
   */
  static generateEmergencyActionId(): string {
    const timestamp = BigInt(Date.now());
    const random = Math.floor(Math.random() * 1000000);
    return `emergency_${timestamp}_${random}`;
  }
  
  /**
   * Validate emergency action
   */
  static validateEmergencyAction(
    action: any,
    config: BridgeConfig
  ): boolean {
    if (!action.type || !action.target || !action.reason) {
      return false;
    }
    
    // Check if emergency mode is active
    if (!config.emergencyPause) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate bridge metrics
   */
  static calculateBridgeMetrics(
    transfers: CrossChainTransfer[],
    pools: BridgeLiquidityPool[],
    validators: BridgeValidator[]
  ): any {
    const totalTransfers = transfers.length;
    const successfulTransfers = transfers.filter(t => t.status === TransferStatus.COMPLETED).length;
    const totalVolume = transfers.reduce((sum, t) => sum + t.amount, 0n);
    const totalFees = transfers.reduce((sum, t) => sum + t.fee, 0n);
    const activeValidators = validators.filter(v => v.isActive).length;
    const totalLiquidity = pools.reduce((sum, p) => sum + p.totalLiquidity, 0n);
    
    // Calculate average transfer time
    const completedTransfers = transfers.filter(t => t.status === TransferStatus.COMPLETED && t.completedAt);
    const averageTransferTime = completedTransfers.length > 0
      ? completedTransfers.reduce((sum, t) => sum + Number((t.completedAt || 0n) - t.timestamp), 0) / completedTransfers.length
      : 0;
    
    // Chain utilization
    const chainUtilization: { [key: string]: number } = {};
    for (const transfer of transfers) {
      chainUtilization[transfer.fromChain] = (chainUtilization[transfer.fromChain] || 0) + 1;
      chainUtilization[transfer.toChain] = (chainUtilization[transfer.toChain] || 0) + 1;
    }
    
    // Token utilization
    const tokenUtilization: { [key: string]: number } = {};
    for (const transfer of transfers) {
      tokenUtilization[transfer.token] = (tokenUtilization[transfer.token] || 0) + 1;
    }
    
    return {
      totalTransfers,
      successfulTransfers,
      totalVolume,
      totalFees,
      activeValidators,
      totalLiquidity,
      averageTransferTime,
      chainUtilization,
      tokenUtilization
    };
  }
  
  /**
   * Format amount for display
   */
  static formatAmount(amount: bigint, decimals: number): string {
    const divisor = 10n ** BigInt(decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    
    return whole.toString() + '.' + fraction.toString().padStart(decimals, '0').replace(/\.?0+$/, '');
  }
  
  /**
   * Parse amount from string
   */
  static parseAmount(amount: string, decimals: number): bigint {
    const parts = amount.split('.');
    const whole = BigInt(parts[0] || '0');
    const fraction = parts[1] ? parts[1].slice(0, decimals).padEnd(decimals, '0') : '0'.repeat(decimals);
    
    return whole * (10n ** BigInt(decimals)) + BigInt(fraction);
  }
  
  /**
   * Check if address is valid
   */
  static isValidAddress(address: string): boolean {
    // Basic address validation
    if (!address || address.length !== 42) {
      return false;
    }
    
    if (!address.startsWith('0x')) {
      return false;
    }
    
    const hexPart = address.slice(2);
    return /^[0-9a-fA-F]+$/.test(hexPart);
  }
  
  /**
   * Check if transaction hash is valid
   */
  static isValidTransactionHash(hash: string): boolean {
    if (!hash || hash.length !== 66) {
      return false;
    }
    
    if (!hash.startsWith('0x')) {
      return false;
    }
    
    const hexPart = hash.slice(2);
    return /^[0-9a-fA-F]+$/.test(hexPart);
  }
  
  /**
   * Calculate required confirmations for chain
   */
  static getRequiredConfirmations(chainId: string): number {
    const confirmations: { [key: string]: number } = {
      'ethereum': 12,
      'bitcoin': 6,
      'polygon': 10,
      'arbitrum': 10,
      'optimism': 10,
      'bsc': 10,
      'avalanche': 6,
      'fantom': 6,
      'solana': 32
    };
    
    return confirmations[chainId] || CrossChainLib.MIN_CONFIRMATIONS;
  }
  
  /**
   * Check if chain is supported
   */
  static isChainSupported(chainId: string, supportedChains: string[]): boolean {
    return supportedChains.includes(chainId);
  }
  
  /**
   * Check if token is supported on chain
   */
  static isTokenSupportedOnChain(token: BridgeToken, chainId: string): boolean {
    return token.chains.includes(chainId) && token.isActive;
  }
  
  /**
   * Get bridge status summary
   */
  static getBridgeStatusSummary(
    transfers: CrossChainTransfer[],
    config: BridgeConfig
  ): any {
    const pending = transfers.filter(t => t.status === TransferStatus.PENDING).length;
    const confirmed = transfers.filter(t => t.status === TransferStatus.CONFIRMED).length;
    const validating = transfers.filter(t => t.status === TransferStatus.VALIDATING).length;
    const completed = transfers.filter(t => t.status === TransferStatus.COMPLETED).length;
    const failed = transfers.filter(t => t.status === TransferStatus.FAILED).length;
    
    return {
      isPaused: config.emergencyPause,
      supportedChains: config.supportedChains.length,
      pending,
      confirmed,
      validating,
      completed,
      failed,
      total: transfers.length
    };
  }
}
