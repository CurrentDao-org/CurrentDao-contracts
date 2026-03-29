import type { IPoolConfig, IStakePosition, IPoolStats } from '../interfaces/IYieldFarming';
export declare class StakingPool {
    private config;
    private positions;
    private totalStaked;
    private totalRewardsDistributed;
    private stakerCount;
    constructor(config: IPoolConfig);
    getConfig(): IPoolConfig;
    updateConfig(updates: Partial<IPoolConfig>): void;
    getStats(): IPoolStats;
    stake(staker: string, amount: number, now: number): IStakePosition;
    unstake(staker: string, amount: number, now: number): {
        received: number;
        penalty: number;
    };
    claimRewards(staker: string, now: number): number;
    compound(staker: string, now: number): number;
    getPendingRewards(staker: string, now: number): number;
    getPosition(staker: string): IStakePosition | null;
}
//# sourceMappingURL=StakingPool.d.ts.map