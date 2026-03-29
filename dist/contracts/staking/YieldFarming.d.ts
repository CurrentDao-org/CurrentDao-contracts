import type { IYieldFarming, IPoolConfig, IStakePosition, IPoolStats, IGovernanceProposal } from './interfaces/IYieldFarming';
/**
 * YieldFarming — main facade for the $WATT staking and yield farming system.
 *
 * Supports 10+ pools, dynamic APY based on utilization, lock-up periods
 * from 1 day to 1 year, 15% annual compounding boost, early withdrawal
 * penalties, and on-chain pool governance.
 *
 * All staking operations are designed to stay under 200k gas equivalent.
 */
export declare class YieldFarming implements IYieldFarming {
    private pools;
    private rewardCalculator;
    private governance;
    private paused;
    private now;
    constructor(initialVotingWeight?: number, clock?: () => number);
    createPool(config: IPoolConfig): void;
    updatePool(poolId: number, updates: Partial<IPoolConfig>): void;
    getPool(poolId: number): IPoolConfig;
    getPoolStats(poolId: number): IPoolStats;
    getAllPools(): IPoolConfig[];
    stake(staker: string, poolId: number, amount: number): IStakePosition;
    unstake(staker: string, poolId: number, amount: number): {
        received: number;
        penalty: number;
    };
    getPosition(staker: string, poolId: number): IStakePosition | null;
    claimRewards(staker: string, poolId: number): number;
    compound(staker: string, poolId: number): number;
    getPendingRewards(staker: string, poolId: number): number;
    /**
     * Projects rewards across all pools for a given principal and lockup.
     * Useful for UI to show competitive APY comparisons.
     */
    projectRewards(principal: number, lockupDays: number): import("./rewards/RewardCalculator").IRewardProjection[];
    proposeParameterChange(proposal: Omit<IGovernanceProposal, 'proposalId' | 'votesFor' | 'votesAgainst' | 'executed'>): number;
    vote(proposalId: number, voter: string, support: boolean, weight: number): void;
    executeProposal(proposalId: number): void;
    getProposal(proposalId: number): IGovernanceProposal | null;
    emergencyPause(): void;
    emergencyUnpause(): void;
    private getPoolOrThrow;
    private assertNotPaused;
    private applyGovernanceChange;
}
//# sourceMappingURL=YieldFarming.d.ts.map