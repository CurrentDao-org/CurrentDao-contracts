import type { IPoolConfig, IPoolStats } from '../interfaces/IYieldFarming';
export interface IRewardProjection {
    poolId: number;
    principal: number;
    lockupDays: number;
    estimatedReward: number;
    effectiveAPY: number;
    withCompounding: number;
}
export declare class RewardCalculator {
    /**
     * Projects rewards for a given stake over the lockup period.
     */
    projectRewards(config: IPoolConfig, stats: IPoolStats, principal: number, lockupDays: number): IRewardProjection;
    /**
     * Compares APY across all pools to find the best option for a given lockup.
     */
    rankPools(configs: IPoolConfig[], statsMap: Map<number, IPoolStats>, lockupDays: number): IRewardProjection[];
    /**
     * Calculates the break-even point for early withdrawal given penalty.
     * Returns the minimum days to stake before penalty is offset by rewards.
     */
    breakEvenDays(config: IPoolConfig, stats: IPoolStats): number;
    /**
     * Calculates gas-efficient batch reward totals for multiple stakers.
     * Aggregates in a single pass to minimize computation.
     */
    batchPendingRewards(entries: Array<{
        amount: number;
        lastCompoundAt: number;
        pendingRewards: number;
    }>, currentAPY: number, now: number): number;
}
//# sourceMappingURL=RewardCalculator.d.ts.map