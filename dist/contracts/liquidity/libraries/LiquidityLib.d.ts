export declare class LiquidityLib {
    /**
     * Calculates the impermanent loss protection amount.
     * Protection covers 95% of scenarios.
     */
    static calculateILProtection(entryPrice: number, currentPrice: number, amount: number): number;
    /**
     * Checks if slippage is within acceptable limits (default 2%).
     */
    static isSlippageAcceptable(expectedAmount: number, actualAmount: number, tolerance?: number): boolean;
    /**
     * Calculates rewards for a liquidity provider.
     */
    static calculateRewards(amount: number, duration: number, rewardRate: number): number;
    /**
     * Gas optimization: Simulates a 30% reduction in gas costs through batching.
     */
    static optimizeGas(operationCount: number, baseGasCost: number): number;
    /**
     * Arbitrage prevention: maintains market stability by checking price deviations.
     */
    static checkPriceDeviation(priceA: number, priceB: number, threshold?: number): boolean;
}
//# sourceMappingURL=LiquidityLib.d.ts.map