import type { IPoolConfig, IStakePosition, IPoolStats } from '../interfaces/IYieldFarming';
export declare const SECONDS_PER_YEAR = 31536000;
export declare const BASIS_POINTS = 10000;
export declare const COMPOUND_BOOST_BPS = 150;
export declare class StakingLib {
    /**
     * Calculates dynamic APY based on pool utilization.
     * Higher utilization = higher APY to incentivize liquidity.
     */
    static getDynamicAPY(config: IPoolConfig, stats: IPoolStats): number;
    /**
     * Calculates accrued rewards for a position since last claim/compound.
     */
    static calculateRewards(position: IStakePosition, currentAPY: number, now: number): number;
    /**
     * Applies 15% annual compounding boost on top of base rewards.
     * Compounding increases effective yield by ~15% annually.
     */
    static applyCompoundBoost(baseRewards: number, periodsCompounded: number): number;
    /**
     * Calculates early withdrawal penalty.
     * Penalty scales linearly: full penalty at t=0, zero at lockup end.
     */
    static calculatePenalty(amount: number, config: IPoolConfig, stakedAt: number, now: number): number;
    /**
     * Validates lockup period is within allowed range (1 day to 1 year).
     */
    static validateLockup(lockupSeconds: number): boolean;
    /**
     * Calculates pool utilization percentage.
     */
    static calcUtilization(totalStaked: number, maxCapacity: number): number;
    /**
     * Estimates gas cost category for an operation (for optimization tracking).
     * Returns 'low' | 'medium' | 'high' relative to 200k gas target.
     */
    static estimateGasCategory(operationType: 'stake' | 'unstake' | 'claim' | 'compound'): string;
}
//# sourceMappingURL=StakingLib.d.ts.map