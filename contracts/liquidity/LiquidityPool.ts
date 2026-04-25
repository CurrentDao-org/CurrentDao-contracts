/**
 * Liquidity Pool Contract
 * Comprehensive liquidity management for energy assets with AMM, yield farming, and impermanent loss protection
 */

import {
  LiquidityPool as LiquidityPoolType,
  LiquidityPosition,
  SwapParams,
  AddLiquidityParams,
  RemoveLiquidityParams,
  RewardInfo,
  ImpermanentLossProtection,
  PoolMetrics,
  EnergyAssetPool,
  PoolType
} from './structures/LiquidityStructs';

import { ILiquidityPool, ILiquidityPoolEvents, ILiquidityPoolErrors } from './interfaces/ILiquidityPool';
import { AMMLib } from './libraries/AMMLib';

export class LiquidityPool implements ILiquidityPool {
  // State variables
  private pools: Map<string, LiquidityPoolType> = new Map();
  private positions: Map<string, LiquidityPosition[]> = new Map();
  private rewardInfos: Map<string, RewardInfo> = new Map();
  private protections: Map<string, ImpermanentLossProtection> = new Map();
  private poolMetrics: Map<string, PoolMetrics> = new Map();
  private pausedPools: Set<string> = new Set();
  
  // Constants
  private static readonly MAX_FEE_RATE = 1000; // 10%
  private static readonly MIN_FEE_RATE = 1;    // 0.01%
  private static readonly PROTECTION_RATE = 80; // 80% protection
  private static readonly PROTECTION_THRESHOLD = 5; // 5% IL threshold
  
  // Owner address (simplified for demo)
  private owner: string = "0x0000000000000000000000000000000000000000";
  
  constructor() {
    this.initializeDefaultPools();
  }
  
  /**
   * Create a new liquidity pool
   */
  createPool(tokenA: string, tokenB: string, feeRate: number, poolType: number): string {
    if (feeRate < LiquidityPool.MIN_FEE_RATE || feeRate > LiquidityPool.MAX_FEE_RATE) {
      throw new Error('Invalid fee rate');
    }
    
    if (tokenA === tokenB) {
      throw new Error('Tokens must be different');
    }
    
    const poolId = this.generatePoolId(tokenA, tokenB);
    
    if (this.pools.has(poolId)) {
      throw new Error('Pool already exists');
    }
    
    const pool: LiquidityPoolType = {
      id: poolId,
      tokenA,
      tokenB,
      reserveA: 0n,
      reserveB: 0n,
      totalLiquidity: 0n,
      lpTokenSupply: 0n,
      feeRate,
      lastUpdateTime: BigInt(Date.now())
    };
    
    this.pools.set(poolId, pool);
    this.initializePoolProtection(poolId);
    
    return poolId;
  }
  
  /**
   * Create energy asset pool
   */
  createEnergyPool(
    tokenA: string,
    tokenB: string,
    feeRate: number,
    energyType: string,
    productionRate: bigint,
    consumptionRate: bigint,
    efficiency: number
  ): string {
    const poolId = this.createPool(tokenA, tokenB, feeRate, PoolType.ENERGY);
    
    const energyPool: EnergyAssetPool = {
      ...this.pools.get(poolId)!,
      energyType,
      productionRate,
      consumptionRate,
      efficiency,
      carbonCredits: 0n
    };
    
    this.pools.set(poolId, energyPool);
    
    return poolId;
  }
  
  /**
   * Add liquidity to a pool
   */
  async addLiquidity(params: AddLiquidityParams): Promise<string> {
    const poolId = this.generatePoolId(params.tokenA, params.tokenB);
    const pool = this.pools.get(poolId);
    
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    if (this.pausedPools.has(poolId)) {
      throw new Error('Pool is paused');
    }
    
    if (params.deadline < BigInt(Date.now())) {
      throw new Error('Transaction expired');
    }
    
    const { liquidity, amountA, amountB } = AMMLib.getLiquidityAmounts(
      params.amountA,
      params.amountB,
      pool.reserveA,
      pool.reserveB,
      pool.totalLiquidity
    );
    
    if (amountA < params.amountAMin || amountB < params.amountBMin) {
      throw new Error('Slippage exceeded');
    }
    
    // Update pool reserves
    pool.reserveA += amountA;
    pool.reserveB += amountB;
    pool.totalLiquidity += liquidity;
    pool.lpTokenSupply += liquidity;
    pool.lastUpdateTime = BigInt(Date.now());
    
    // Create or update position
    const position: LiquidityPosition = {
      owner: params.to,
      poolId,
      liquidityAmount: liquidity,
      tokenAAmount: amountA,
      tokenBAmount: amountB,
      rewardDebt: 0n,
      pendingRewards: 0n,
      entryTime: BigInt(Date.now())
    };
    
    if (!this.positions.has(params.to)) {
      this.positions.set(params.to, []);
    }
    
    this.positions.get(params.to)!.push(position);
    
    // Update rewards
    this.updateReward(poolId);
    
    return poolId;
  }
  
  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<void> {
    const pool = this.pools.get(params.poolId);
    
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    if (this.pausedPools.has(params.poolId)) {
      throw new Error('Pool is paused');
    }
    
    if (params.deadline < BigInt(Date.now())) {
      throw new Error('Transaction expired');
    }
    
    const userPositions = this.positions.get(params.to) || [];
    const position = userPositions.find(p => p.poolId === params.poolId);
    
    if (!position || position.liquidityAmount < params.liquidity) {
      throw new Error('Insufficient liquidity');
    }
    
    const { amountA, amountB } = AMMLib.getRemoveLiquidityAmounts(
      params.liquidity,
      pool.totalLiquidity,
      pool.reserveA,
      pool.reserveB
    );
    
    if (amountA < params.amountAMin || amountB < params.amountBMin) {
      throw new Error('Slippage exceeded');
    }
    
    // Update pool reserves
    pool.reserveA -= amountA;
    pool.reserveB -= amountB;
    pool.totalLiquidity -= params.liquidity;
    pool.lpTokenSupply -= params.liquidity;
    pool.lastUpdateTime = BigInt(Date.now());
    
    // Update position
    position.liquidityAmount -= params.liquidity;
    
    // Apply impermanent loss protection
    const protectionAmount = await this.applyImpermanentLossProtection(position);
    
    // Update rewards
    this.updateReward(params.poolId);
  }
  
  /**
   * Execute swap in pool
   */
  async swap(params: SwapParams): Promise<bigint> {
    const poolId = this.generatePoolId(params.tokenIn, params.tokenOut);
    const pool = this.pools.get(poolId);
    
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    if (this.pausedPools.has(poolId)) {
      throw new Error('Pool is paused');
    }
    
    if (params.deadline < BigInt(Date.now())) {
      throw new Error('Transaction expired');
    }
    
    const reserveIn = params.tokenIn === pool.tokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = params.tokenIn === pool.tokenA ? pool.reserveB : pool.reserveA;
    
    const amountOut = AMMLib.getAmountOut(params.amountIn, reserveIn, reserveOut, pool.feeRate);
    
    if (amountOut < params.amountOutMin) {
      throw new Error('Slippage exceeded');
    }
    
    // Update pool reserves
    if (params.tokenIn === pool.tokenA) {
      pool.reserveA += params.amountIn;
      pool.reserveB -= amountOut;
    } else {
      pool.reserveB += params.amountIn;
      pool.reserveA -= amountOut;
    }
    
    pool.lastUpdateTime = BigInt(Date.now());
    
    // Update rewards
    this.updateReward(poolId);
    
    return amountOut;
  }
  
  /**
   * Get pool information
   */
  getPool(poolId: string): LiquidityPoolType {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    return pool;
  }
  
  /**
   * Get all pools
   */
  getAllPools(): LiquidityPoolType[] {
    return Array.from(this.pools.values());
  }
  
  /**
   * Get user position
   */
  getPosition(owner: string, poolId: string): LiquidityPosition {
    const positions = this.positions.get(owner) || [];
    const position = positions.find(p => p.poolId === poolId);
    
    if (!position) {
      throw new Error('Position not found');
    }
    
    return position;
  }
  
  /**
   * Get all user positions
   */
  getUserPositions(owner: string): LiquidityPosition[] {
    return this.positions.get(owner) || [];
  }
  
  /**
   * Update reward information
   */
  updateReward(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool || pool.totalLiquidity === 0n) return;
    
    let rewardInfo = this.rewardInfos.get(poolId);
    if (!rewardInfo) {
      rewardInfo = {
        poolId,
        rewardToken: 'WATT',
        rewardRate: 1000n, // 0.001 WATT per second
        rewardPerLiquidityStored: 0n,
        lastUpdateTime: pool.lastUpdateTime,
        periodFinish: BigInt(Date.now() + 86400000) // 24 hours
      };
      this.rewardInfos.set(poolId, rewardInfo);
    }
    
    const currentTime = BigInt(Date.now());
    if (currentTime < rewardInfo.lastUpdateTime) return;
    
    const timeDelta = currentTime - rewardInfo.lastUpdateTime;
    const rewardDelta = rewardInfo.rewardRate * timeDelta;
    const rewardPerLiquidityDelta = rewardDelta / pool.totalLiquidity;
    
    rewardInfo.rewardPerLiquidityStored += rewardPerLiquidityDelta;
    rewardInfo.lastUpdateTime = currentTime;
  }
  
  /**
   * Get reward information
   */
  getRewardInfo(poolId: string): RewardInfo {
    const rewardInfo = this.rewardInfos.get(poolId);
    if (!rewardInfo) {
      throw new Error('Reward info not found');
    }
    return rewardInfo;
  }
  
  /**
   * Claim rewards
   */
  async claimReward(poolId: string, to: string): Promise<bigint> {
    const position = this.getPosition(to, poolId);
    const rewardInfo = this.getRewardInfo(poolId);
    
    this.updateReward(poolId);
    
    const pendingRewards = (position.liquidityAmount * rewardInfo.rewardPerLiquidityStored) / 1000000n - position.rewardDebt;
    
    if (pendingRewards > 0) {
      position.pendingRewards = pendingRewards;
      position.rewardDebt = (position.liquidityAmount * rewardInfo.rewardPerLiquidityStored) / 1000000n;
      
      // Reset pending rewards after claiming
      const claimedAmount = position.pendingRewards;
      position.pendingRewards = 0n;
      
      return claimedAmount;
    }
    
    return 0n;
  }
  
  /**
   * Calculate impermanent loss
   */
  calculateImpermanentLoss(position: LiquidityPosition): number {
    const pool = this.pools.get(position.poolId);
    if (!pool) return 0;
    
    const initialPrice = Number(position.tokenAAmount) / Number(position.tokenBAmount);
    const currentPrice = Number(pool.reserveA) / Number(pool.reserveB);
    
    return AMMLib.calculateImpermanentLoss(initialPrice, currentPrice);
  }
  
  /**
   * Apply impermanent loss protection
   */
  async applyImpermanentLossProtection(position: LiquidityPosition): Promise<bigint> {
    const impermanentLoss = this.calculateImpermanentLoss(position);
    const protection = this.protections.get(position.poolId);
    
    if (!protection || impermanentLoss < protection.protectionThreshold) {
      return 0n;
    }
    
    const positionValue = position.tokenAAmount + position.tokenBAmount;
    const protectionAmount = AMMLib.calculateProtectionAmount(
      positionValue,
      impermanentLoss,
      protection.protectionRate
    );
    
    return protectionAmount;
  }
  
  /**
   * Get pool metrics
   */
  getPoolMetrics(poolId: string): PoolMetrics {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    let metrics = this.poolMetrics.get(poolId);
    if (!metrics) {
      metrics = {
        volume24h: 0n,
        fees24h: 0n,
        tvl: pool.reserveA + pool.reserveB,
        apr: 0,
        utilizationRate: 0,
        slippage: 0
      };
      this.poolMetrics.set(poolId, metrics);
    }
    
    return AMMLib.calculatePoolMetrics(pool, metrics.volume24h, metrics.fees24h);
  }
  
  /**
   * Get pool TVL
   */
  getPoolTVL(poolId: string): bigint {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    return pool.reserveA + pool.reserveB;
  }
  
  /**
   * Get pool APR
   */
  getPoolAPR(poolId: string): number {
    return this.getPoolMetrics(poolId).apr;
  }
  
  /**
   * Get energy pool
   */
  getEnergyPool(poolId: string): EnergyAssetPool {
    const pool = this.pools.get(poolId);
    if (!pool || !('energyType' in pool)) {
      throw new Error('Energy pool not found');
    }
    return pool as EnergyAssetPool;
  }
  
  /**
   * Update energy metrics
   */
  updateEnergyMetrics(poolId: string, productionRate: bigint, consumptionRate: bigint, efficiency: number): void {
    const pool = this.pools.get(poolId) as EnergyAssetPool;
    if (!pool || !('energyType' in pool)) {
      throw new Error('Energy pool not found');
    }
    
    pool.productionRate = productionRate;
    pool.consumptionRate = consumptionRate;
    pool.efficiency = efficiency;
    pool.lastUpdateTime = BigInt(Date.now());
  }
  
  /**
   * Governance functions
   */
  setFeeRate(poolId: string, newFeeRate: number): void {
    if (newFeeRate < LiquidityPool.MIN_FEE_RATE || newFeeRate > LiquidityPool.MAX_FEE_RATE) {
      throw new Error('Invalid fee rate');
    }
    
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    pool.feeRate = newFeeRate;
  }
  
  setRewardRate(poolId: string, rewardToken: string, newRewardRate: bigint): void {
    let rewardInfo = this.rewardInfos.get(poolId);
    if (!rewardInfo) {
      rewardInfo = {
        poolId,
        rewardToken,
        rewardRate: newRewardRate,
        rewardPerLiquidityStored: 0n,
        lastUpdateTime: BigInt(Date.now()),
        periodFinish: BigInt(Date.now() + 86400000)
      };
      this.rewardInfos.set(poolId, rewardInfo);
    } else {
      rewardInfo.rewardRate = newRewardRate;
      rewardInfo.rewardToken = rewardToken;
    }
  }
  
  pausePool(poolId: string): void {
    this.pausedPools.add(poolId);
  }
  
  unpausePool(poolId: string): void {
    this.pausedPools.delete(poolId);
  }
  
  /**
   * Emergency functions
   */
  async emergencyWithdraw(poolId: string, to: string): Promise<void> {
    const position = this.getPosition(to, poolId);
    const pool = this.pools.get(poolId);
    
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    // Allow withdrawal of user's liquidity without restrictions
    const { amountA, amountB } = AMMLib.getRemoveLiquidityAmounts(
      position.liquidityAmount,
      pool.totalLiquidity,
      pool.reserveA,
      pool.reserveB
    );
    
    pool.reserveA -= amountA;
    pool.reserveB -= amountB;
    pool.totalLiquidity -= position.liquidityAmount;
    pool.lpTokenSupply -= position.liquidityAmount;
    
    // Remove position
    const positions = this.positions.get(to) || [];
    const index = positions.findIndex(p => p.poolId === poolId);
    if (index !== -1) {
      positions.splice(index, 1);
    }
  }
  
  emergencyPause(poolId: string): void {
    this.pausedPools.add(poolId);
  }
  
  /**
   * Helper functions
   */
  private generatePoolId(tokenA: string, tokenB: string): string {
    return [tokenA, tokenB].sort().join('-');
  }
  
  private initializePoolProtection(poolId: string): void {
    const protection: ImpermanentLossProtection = {
      poolId,
      protectionRate: LiquidityPool.PROTECTION_RATE,
      protectionThreshold: LiquidityPool.PROTECTION_THRESHOLD,
      totalProtectedAmount: 0n,
      lastProtectionTime: BigInt(Date.now())
    };
    
    this.protections.set(poolId, protection);
  }
  
  private initializeDefaultPools(): void {
    // Initialize with some default energy pools
    this.createEnergyPool(
      'WATT',
      'USDC',
      0.3,
      'SOLAR',
      1000000n,
      500000n,
      0.85
    );
  }
  
  /**
   * Get swap amount out (for frontend)
   */
  getSwapAmountOut(poolId: string, amountIn: bigint, tokenIn: string): bigint {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    const reserveIn = tokenIn === pool.tokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = tokenIn === pool.tokenA ? pool.reserveB : pool.reserveA;
    
    return AMMLib.getAmountOut(amountIn, reserveIn, reserveOut, pool.feeRate);
  }
  
  /**
   * Get swap amount in (for frontend)
   */
  getSwapAmountIn(poolId: string, amountOut: bigint, tokenOut: string): bigint {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    const reserveIn = tokenOut === pool.tokenA ? pool.reserveB : pool.reserveA;
    const reserveOut = tokenOut === pool.tokenA ? pool.reserveA : pool.reserveB;
    
    return AMMLib.getAmountIn(amountOut, reserveIn, reserveOut, pool.feeRate);
  }
}
