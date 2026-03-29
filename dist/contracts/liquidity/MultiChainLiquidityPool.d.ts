import { IMultiChainLiquidityPool } from './interfaces/IMultiChainLiquidityPool';
import { ChainInfo, PoolStats, RebalancingAction } from './structures/LiquidityStructure';
export declare class MultiChainLiquidityPool implements IMultiChainLiquidityPool {
    private chains;
    private positions;
    private bridgeEngine;
    private rebalancingEngine;
    private totalVolume;
    private rewardPool;
    private isEmergency;
    private rewardRate;
    constructor(initialChains: ChainInfo[]);
    /**
     * Deposits liquidity into a specific chain.
     */
    deposit(provider: string, chainId: number, amount: number): Promise<void>;
    /**
     * Withdraws liquidity from a specific chain, including IL protection.
     */
    withdraw(provider: string, chainId: number, amount: number): Promise<number>;
    /**
     * Rebalances liquidity across all chains to optimize capital efficiency.
     */
    rebalance(): Promise<RebalancingAction[]>;
    /**
     * Bridges an asset from one chain to another.
     */
    bridge(fromChainId: number, toChainId: number, amount: number): Promise<boolean>;
    /**
     * Calculates rewards for a liquidity provider across all their positions.
     */
    calculateRewards(provider: string): number;
    /**
     * Claims all rewards for a provider.
     */
    claimRewards(provider: string): void;
    /**
     * Returns the overall pool statistics.
     */
    getPoolStats(): PoolStats;
    /**
     * Emergency withdrawal bypasses certain checks to return original liquidity.
     */
    emergencyWithdraw(provider: string): void;
    /**
     * Toggles the emergency mode status.
     */
    toggleEmergencyMode(): void;
    /**
     * Arbitrage check between two chains.
     */
    checkArbitrageOpportunity(chainIdA: number, chainIdB: number): boolean;
}
//# sourceMappingURL=MultiChainLiquidityPool.d.ts.map