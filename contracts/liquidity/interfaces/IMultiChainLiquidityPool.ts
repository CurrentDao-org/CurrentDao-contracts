import { LiquidityPosition, PoolStats, RebalancingAction } from '../structures/LiquidityStructure';

export interface IMultiChainLiquidityPool {
    deposit(provider: string, chainId: number, amount: number): Promise<void>;
    withdraw(provider: string, chainId: number, amount: number): Promise<number>;
    rebalance(): Promise<RebalancingAction[]>;
    bridge(fromChainId: number, toChainId: number, amount: number): Promise<boolean>;
    calculateRewards(provider: string): number;
    claimRewards(provider: string): void;
    getPoolStats(): PoolStats;
    emergencyWithdraw(provider: string): void;
    toggleEmergencyMode(): void;
}
