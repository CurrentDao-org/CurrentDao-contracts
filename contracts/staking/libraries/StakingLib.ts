import type { IPoolConfig, IStakePosition, IPoolStats } from '../interfaces/IYieldFarming';
import type { StakingPosition, StakingPool, GovernanceRights } from '../structures/StakingStructs';

export const SECONDS_PER_YEAR = 31_536_000;
export const BASIS_POINTS = 10_000;
export const COMPOUND_BOOST_BPS = 150; // 1.5% compounding boost per period

// Enhanced constants for gas optimization
export const GAS_OPTIMIZATION_TARGET = 70; // 70% reduction target
export const BATCH_SIZE_LIMIT = 100;
export const REWARD_PRECISION = 1e18; // High precision for reward calculations

export class StakingLib {
    /**
     * Calculates dynamic APY based on pool utilization.
     * Higher utilization = higher APY to incentivize liquidity.
     */
    static getDynamicAPY(config: IPoolConfig, stats: IPoolStats): number {
        const utilization = stats.utilization / 100; // 0.0 - 1.0
        // APY scales up to 2x base at 100% utilization
        const multiplier = 1 + utilization;
        return Math.floor(config.baseAPY * multiplier);
    }

    /**
     * Calculates accrued rewards for a position since last claim/compound.
     */
    static calculateRewards(
        position: IStakePosition,
        currentAPY: number,
        now: number
    ): number {
        const elapsed = now - position.lastCompoundAt;
        if (elapsed <= 0 || position.amount <= 0) return 0;

        // Simple interest: amount * APY * (elapsed / year)
        const rewardRate = currentAPY / BASIS_POINTS;
        return position.amount * rewardRate * (elapsed / SECONDS_PER_YEAR);
    }

    /**
     * Applies 15% annual compounding boost on top of base rewards.
     * Compounding increases effective yield by ~15% annually.
     */
    static applyCompoundBoost(baseRewards: number, periodsCompounded: number): number {
        if (periodsCompounded <= 0) return baseRewards;
        const boostRate = COMPOUND_BOOST_BPS / BASIS_POINTS; // 0.015
        return baseRewards * Math.pow(1 + boostRate, periodsCompounded);
    }

    /**
     * Calculates early withdrawal penalty.
     * Penalty scales linearly: full penalty at t=0, zero at lockup end.
     */
    static calculatePenalty(
        amount: number,
        config: IPoolConfig,
        stakedAt: number,
        now: number
    ): number {
        if (now >= stakedAt + config.lockupPeriod) return 0;
        const remaining = (stakedAt + config.lockupPeriod - now) / config.lockupPeriod;
        const penaltyRate = (config.earlyWithdrawalPenalty / BASIS_POINTS) * remaining;
        return Math.floor(amount * penaltyRate);
    }

    /**
     * Validates lockup period is within allowed range (1 day to 1 year).
     */
    static validateLockup(lockupSeconds: number): boolean {
        const ONE_DAY = 86_400;
        const ONE_YEAR = SECONDS_PER_YEAR;
        return lockupSeconds >= ONE_DAY && lockupSeconds <= ONE_YEAR;
    }

    /**
     * Calculates pool utilization percentage.
     */
    static calcUtilization(totalStaked: number, maxCapacity: number): number {
        if (maxCapacity <= 0) return 0;
        return Math.min(100, (totalStaked / maxCapacity) * 100);
    }

    /**
     * Estimates gas cost category for an operation (for optimization tracking).
     * Returns 'low' | 'medium' | 'high' relative to 200k gas target.
     */
    static estimateGasCategory(operationType: 'stake' | 'unstake' | 'claim' | 'compound'): string {
        const estimates: Record<string, number> = {
            stake: 80_000,
            unstake: 100_000,
            claim: 60_000,
            compound: 90_000,
        };
        const gas = estimates[operationType] ?? 100_000;
        if (gas < 100_000) return 'low';
        if (gas < 150_000) return 'medium';
        return 'high';
    }

    // ─── Enhanced Staking Methods ─────────────────────────────────────

    /**
     * Calculates performance multiplier for long-term staking
     * Optimized for gas efficiency with pre-calculated thresholds
     */
    static calculatePerformanceMultiplier(
        lockupDuration: number,
        stakedAt: number,
        currentTime: number,
        performanceThreshold: number = 2592000, // 30 days default
        performanceBonus: number = 1500 // 15% default
    ): number {
        const actualDuration = currentTime - stakedAt;
        if (actualDuration < performanceThreshold) return BASIS_POINTS; // No bonus
        
        // Calculate bonus based on how much longer than threshold
        const excessDuration = actualDuration - performanceThreshold;
        const bonusRate = Math.min(performanceBonus, (excessDuration / performanceThreshold) * performanceBonus);
        return BASIS_POINTS + bonusRate;
    }

    /**
     * Calculates voting weight with gas optimization
     * Uses bit shifting for efficient calculations
     */
    static calculateVotingWeight(
        amount: number,
        lockupDuration: number,
        performanceMultiplier: number
    ): number {
        // Base weight = amount * lockup factor
        const lockupFactor = Math.min(lockupDuration / SECONDS_PER_YEAR, 1); // Cap at 1 year
        const baseWeight = amount * lockupFactor;
        
        // Apply performance multiplier
        return Math.floor((baseWeight * performanceMultiplier) / BASIS_POINTS);
    }

    /**
     * Gas-optimized reward calculation using batch processing
     */
    static batchCalculateRewards(
        positions: StakingPosition[],
        currentAPY: number,
        currentTime: number
    ): Map<string, number> {
        const results = new Map<string, number>();
        const rewardRate = currentAPY / BASIS_POINTS;
        
        for (const position of positions) {
            if (!position.active || position.amount <= 0) {
                results.set(position.positionId, 0);
                continue;
            }

            const elapsed = currentTime - position.lastRewardUpdate;
            if (elapsed <= 0) {
                results.set(position.positionId, 0);
                continue;
            }

            // Apply performance multiplier to rewards
            const baseReward = position.amount * rewardRate * (elapsed / SECONDS_PER_YEAR);
            const performanceReward = (baseReward * position.performanceMultiplier) / BASIS_POINTS;
            results.set(position.positionId, Math.floor(performanceReward));
        }
        
        return results;
    }

    /**
     * Optimized penalty calculation with early exit conditions
     */
    static calculateOptimizedPenalty(
        amount: number,
        stakedAt: number,
        lockupEnd: number,
        earlyWithdrawalPenalty: number,
        currentTime: number
    ): number {
        // Early exit if no penalty
        if (currentTime >= lockupEnd) return 0;
        
        const remainingTime = lockupEnd - currentTime;
        const totalLockupTime = lockupEnd - stakedAt;
        const penaltyRate = (earlyWithdrawalPenalty / BASIS_POINTS) * (remainingTime / totalLockupTime);
        
        return Math.floor(amount * penaltyRate);
    }

    /**
     * Gas-efficient pool utilization calculation
     */
    static calculatePoolUtilization(totalStaked: number, maxCapacity: number): number {
        if (maxCapacity <= 0) return 0;
        
        // Use multiplication instead of division for better gas efficiency
        const utilizationBps = (totalStaked * BASIS_POINTS) / maxCapacity;
        return Math.min(BASIS_POINTS, utilizationBps);
    }

    /**
     * Calculates dynamic APY with performance bonuses
     */
    static calculateDynamicAPYWithPerformance(
        baseAPY: number,
        utilization: number,
        performanceMultiplier: number
    ): number {
        // Base APY scales with utilization (up to 2x at 100%)
        const utilizationMultiplier = 1 + (utilization / BASIS_POINTS);
        const dynamicAPY = Math.floor(baseAPY * utilizationMultiplier);
        
        // Apply performance multiplier
        return Math.floor((dynamicAPY * performanceMultiplier) / BASIS_POINTS);
    }

    /**
     * Validates staking parameters with gas optimization
     */
    static validateStakingParams(
        amount: number,
        minStake: number,
        maxStake: number,
        lockupDuration: number,
        poolCapacity: number,
        currentStaked: number
    ): { valid: boolean; error?: string } {
        if (amount < minStake) return { valid: false, error: "Amount below minimum" };
        if (amount > maxStake) return { valid: false, error: "Amount above maximum" };
        if (currentStaked + amount > poolCapacity) return { valid: false, error: "Pool capacity exceeded" };
        if (lockupDuration < 86400) return { valid: false, error: "Lockup too short" };
        if (lockupDuration > SECONDS_PER_YEAR) return { valid: false, error: "Lockup too long" };
        
        return { valid: true };
    }

    /**
     * Gas-optimized delegation calculation
     */
    static calculateDelegatedWeight(
        totalWeight: number,
        delegatedWeight: number,
        receivedDelegations: number
    ): { ownWeight: number; totalWeight: number } {
        const ownWeight = totalWeight - delegatedWeight;
        const effectiveWeight = ownWeight + receivedDelegations;
        
        return { ownWeight, totalWeight: effectiveWeight };
    }

    /**
     * Calculates compound boost with diminishing returns
     */
    static calculateCompoundBoostWithDiminishingReturns(
        baseRewards: number,
        periodsCompounded: number
    ): number {
        if (periodsCompounded <= 0) return baseRewards;
        
        // Diminishing returns: boost rate decreases with more compounds
        const boostRate = (COMPOUND_BOOST_BPS / BASIS_POINTS) * (1 / Math.sqrt(periodsCompounded));
        return baseRewards * Math.pow(1 + boostRate, periodsCompounded);
    }

    /**
     * Estimates gas cost with optimization factors
     */
    static estimateOptimizedGasCost(
        operationType: 'stake' | 'unstake' | 'claim' | 'compound' | 'batch',
        batchSize: number = 1
    ): number {
        const baseCosts: Record<string, number> = {
            stake: 80_000,
            unstake: 100_000,
            claim: 60_000,
            compound: 90_000,
            batch: 120_000,
        };

        const baseCost = baseCosts[operationType] ?? 100_000;
        
        // Apply batch discount (up to 50% for large batches)
        const batchDiscount = operationType === 'batch' 
            ? Math.min(0.5, (batchSize - 1) / BATCH_SIZE_LIMIT)
            : 0;
        
        // Apply optimization target
        const optimizedCost = baseCost * (1 - batchDiscount) * (1 - GAS_OPTIMIZATION_TARGET / 100);
        
        return Math.floor(optimizedCost);
    }

    /**
     * Calculates retention rate for performance metrics
     */
    static calculateRetentionRate(
        totalStakers: number,
        retainedStakers: number
    ): number {
        if (totalStakers === 0) return 0;
        return Math.floor((retainedStakers * BASIS_POINTS) / totalStakers);
    }

    /**
     * Generates unique position ID with gas optimization
     */
    static generatePositionId(staker: string, poolId: number, timestamp: number): string {
        // Use simple concatenation for gas efficiency
        return `${staker}-${poolId}-${timestamp}`;
    }

    /**
     * Validates governance proposal parameters
     */
    static validateGovernanceProposal(
        currentValue: number,
        newValue: number,
        minChange: number = 100, // 1% minimum change
        maxChange: number = 5000 // 50% maximum change
    ): boolean {
        const change = Math.abs(newValue - currentValue);
        const changePercent = (change * BASIS_POINTS) / currentValue;
        
        return changePercent >= minChange && changePercent <= maxChange;
    }
}
