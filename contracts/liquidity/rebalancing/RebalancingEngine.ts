import { ChainInfo, RebalancingAction } from '../structures/LiquidityStructure';

export class RebalancingEngine {
    private chains: Map<number, ChainInfo>;

    constructor(chains: Map<number, ChainInfo>) {
        this.chains = chains;
    }

    /**
     * Calculates the required rebalancing actions to optimize capital efficiency.
     */
    calculateRebalancingActions(): RebalancingAction[] {
        const actions: RebalancingAction[] = [];
        const chainsArray = Array.from(this.chains.values());
        
        // Find chains with excess and deficit liquidity
        const excessChains = chainsArray.filter(c => c.active && c.currentLiquidity > c.targetLiquidity);
        const deficitChains = chainsArray.filter(c => c.active && c.currentLiquidity < c.targetLiquidity);

        for (const excessChain of excessChains) {
            let surplus = excessChain.currentLiquidity - excessChain.targetLiquidity;

            for (const deficitChain of deficitChains) {
                if (surplus <= 0) break;

                const needed = deficitChain.targetLiquidity - deficitChain.currentLiquidity;
                const toMove = Math.min(surplus, needed);

                if (toMove > 0) {
                    actions.push({
                        fromChain: excessChain.chainId,
                        toChain: deficitChain.chainId,
                        amount: toMove,
                        reason: "Target liquidity optimization"
                    });
                    surplus -= toMove;
                    deficitChain.currentLiquidity += toMove; // Temp update for calculation
                }
            }
        }

        return actions;
    }

    /**
     * Updates the target liquidity for a chain based on network volume and trends.
     */
    updateTargetLiquidity(chainId: number, newTarget: number): void {
        const chain = this.chains.get(chainId);
        if (chain) {
            chain.targetLiquidity = newTarget;
        }
    }
}
