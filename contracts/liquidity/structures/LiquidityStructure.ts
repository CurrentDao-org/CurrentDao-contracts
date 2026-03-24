export interface ChainInfo {
    chainId: number;
    name: string;
    nativeAsset: string;
    currentLiquidity: number;
    targetLiquidity: number;
    active: boolean;
}

export interface LiquidityPosition {
    provider: string;
    chainId: number;
    amount: number;
    entryPrice: number;
    timestamp: number;
    rewardDebt: number;
}

export interface PoolStats {
    totalLiquidity: number;
    totalVolume: number;
    totalRewardsDistributed: number;
    activeChains: number;
}

export interface RebalancingAction {
    fromChain: number;
    toChain: number;
    amount: number;
    reason: string;
}
