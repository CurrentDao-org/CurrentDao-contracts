/**
 * Liquidity Pool Structures
 * Defines data structures for liquidity pool operations
 */

export interface LiquidityPool {
  id: string;
  tokenA: string;
  tokenB: string;
  reserveA: bigint;
  reserveB: bigint;
  totalLiquidity: bigint;
  lpTokenSupply: bigint;
  feeRate: number;
  lastUpdateTime: bigint;
}

export interface LiquidityPosition {
  owner: string;
  poolId: string;
  liquidityAmount: bigint;
  tokenAAmount: bigint;
  tokenBAmount: bigint;
  rewardDebt: bigint;
  pendingRewards: bigint;
  entryTime: bigint;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
  to: string;
  deadline: bigint;
}

export interface AddLiquidityParams {
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to: string;
  deadline: bigint;
}

export interface RemoveLiquidityParams {
  poolId: string;
  liquidity: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to: string;
  deadline: bigint;
}

export interface RewardInfo {
  poolId: string;
  rewardToken: string;
  rewardRate: bigint;
  rewardPerLiquidityStored: bigint;
  lastUpdateTime: bigint;
  periodFinish: bigint;
}

export interface ImpermanentLossProtection {
  poolId: string;
  protectionRate: number;
  protectionThreshold: number;
  totalProtectedAmount: bigint;
  lastProtectionTime: bigint;
}

export interface PoolMetrics {
  volume24h: bigint;
  fees24h: bigint;
  tvl: bigint;
  apr: number;
  utilizationRate: number;
  slippage: number;
}

export enum PoolType {
  STANDARD = 0,
  STABLE = 1,
  VOLATILE = 2,
  ENERGY = 3
}

export interface EnergyAssetPool extends LiquidityPool {
  energyType: string;
  productionRate: bigint;
  consumptionRate: bigint;
  efficiency: number;
  carbonCredits: bigint;
}
