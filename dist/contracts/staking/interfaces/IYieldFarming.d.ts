export interface IPoolConfig {
    poolId: number;
    name: string;
    rewardToken: string;
    baseAPY: number;
    lockupPeriod: number;
    earlyWithdrawalPenalty: number;
    maxCapacity: number;
    compoundingEnabled: boolean;
    active: boolean;
}
export interface IStakePosition {
    staker: string;
    poolId: number;
    amount: number;
    stakedAt: number;
    lastCompoundAt: number;
    lockupEnd: number;
    pendingRewards: number;
    compoundedRewards: number;
}
export interface IPoolStats {
    poolId: number;
    totalStaked: number;
    utilization: number;
    currentAPY: number;
    totalRewardsDistributed: number;
    stakerCount: number;
}
export interface IGovernanceProposal {
    proposalId: number;
    poolId: number;
    paramKey: string;
    newValue: number;
    proposer: string;
    votesFor: number;
    votesAgainst: number;
    executed: boolean;
    deadline: number;
}
export interface IYieldFarming {
    createPool(config: IPoolConfig): void;
    updatePool(poolId: number, config: Partial<IPoolConfig>): void;
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
    proposeParameterChange(proposal: Omit<IGovernanceProposal, 'proposalId' | 'votesFor' | 'votesAgainst' | 'executed'>): number;
    vote(proposalId: number, voter: string, support: boolean, weight: number): void;
    executeProposal(proposalId: number): void;
    emergencyPause(): void;
    emergencyUnpause(): void;
}
//# sourceMappingURL=IYieldFarming.d.ts.map