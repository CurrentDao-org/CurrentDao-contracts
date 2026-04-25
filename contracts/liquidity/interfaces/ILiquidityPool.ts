/**
 * Liquidity Pool Interface
 * Defines the contract interface for liquidity pool operations
 */

import {
  LiquidityPool,
  LiquidityPosition,
  SwapParams,
  AddLiquidityParams,
  RemoveLiquidityParams,
  RewardInfo,
  ImpermanentLossProtection,
  PoolMetrics,
  EnergyAssetPool
} from '../structures/LiquidityStructs';

export interface ILiquidityPool {
  // Pool Management
  createPool(tokenA: string, tokenB: string, feeRate: number, poolType: number): string;
  getPool(poolId: string): LiquidityPool;
  getAllPools(): LiquidityPool[];
  
  // Liquidity Operations
  addLiquidity(params: AddLiquidityParams): Promise<string>;
  removeLiquidity(params: RemoveLiquidityParams): Promise<void>;
  
  // Swap Operations
  swap(params: SwapParams): Promise<bigint>;
  getSwapAmountOut(poolId: string, amountIn: bigint, tokenIn: string): bigint;
  getSwapAmountIn(poolId: string, amountOut: bigint, tokenOut: string): bigint;
  
  // Position Management
  getPosition(owner: string, poolId: string): LiquidityPosition;
  getUserPositions(owner: string): LiquidityPosition[];
  
  // Reward System
  updateReward(poolId: string): void;
  getRewardInfo(poolId: string): RewardInfo;
  claimReward(poolId: string, to: string): Promise<bigint>;
  
  // Impermanent Loss Protection
  calculateImpermanentLoss(position: LiquidityPosition): number;
  applyImpermanentLossProtection(position: LiquidityPosition): Promise<bigint>;
  
  // Pool Metrics
  getPoolMetrics(poolId: string): PoolMetrics;
  getPoolTVL(poolId: string): bigint;
  getPoolAPR(poolId: string): number;
  
  // Energy Asset Specific
  createEnergyPool(
    tokenA: string,
    tokenB: string,
    feeRate: number,
    energyType: string,
    productionRate: bigint,
    consumptionRate: bigint,
    efficiency: number
  ): string;
  getEnergyPool(poolId: string): EnergyAssetPool;
  updateEnergyMetrics(poolId: string, productionRate: bigint, consumptionRate: bigint, efficiency: number): void;
  
  // Governance
  setFeeRate(poolId: string, newFeeRate: number): void;
  setRewardRate(poolId: string, rewardToken: string, newRewardRate: bigint): void;
  pausePool(poolId: string): void;
  unpausePool(poolId: string): void;
  
  // Emergency Functions
  emergencyWithdraw(poolId: string, to: string): Promise<void>;
  emergencyPause(poolId: string): void;
}

export interface ILiquidityPoolEvents {
  PoolCreated(poolId: string, tokenA: string, tokenB: string, feeRate: number);
  LiquidityAdded(poolId: string, provider: string, amountA: bigint, amountB: bigint, liquidity: bigint);
  LiquidityRemoved(poolId: string, provider: string, amountA: bigint, amountB: bigint, liquidity: bigint);
  Swap(poolId: string, sender: string, amountIn: bigint, amountOut: bigint, tokenIn: string, tokenOut: string);
  RewardClaimed(poolId: string, provider: string, rewardAmount: bigint);
  ImpermanentLossProtectionApplied(poolId: string, provider: string, protectionAmount: bigint);
  FeeRateUpdated(poolId: string, oldFeeRate: number, newFeeRate: number);
  PoolPaused(poolId: string);
  PoolUnpaused(poolId: string);
}

export interface ILiquidityPoolErrors {
  PoolNotFound(poolId: string);
  InsufficientLiquidity(poolId: string);
  InsufficientAmount();
  ExpiredTransaction();
  SlippageExceeded(expected: bigint, actual: bigint);
  ZeroAddress();
  InvalidToken();
  PoolAlreadyExists(tokenA: string, tokenB: string);
  TransferFailed();
  ApprovalFailed();
  PoolPaused(poolId: string);
  Unauthorized();
  InvalidAmount();
  InsufficientBalance();
  KInvariantViolation();
}
