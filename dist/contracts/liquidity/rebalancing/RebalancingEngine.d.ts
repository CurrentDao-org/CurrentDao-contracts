import { ChainInfo, RebalancingAction } from '../structures/LiquidityStructure';
export declare class RebalancingEngine {
    private chains;
    constructor(chains: Map<number, ChainInfo>);
    /**
     * Calculates the required rebalancing actions to optimize capital efficiency.
     */
    calculateRebalancingActions(): RebalancingAction[];
    /**
     * Updates the target liquidity for a chain based on network volume and trends.
     */
    updateTargetLiquidity(chainId: number, newTarget: number): void;
}
//# sourceMappingURL=RebalancingEngine.d.ts.map