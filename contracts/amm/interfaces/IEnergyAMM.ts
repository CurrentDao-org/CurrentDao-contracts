export interface LiquidityPosition {
    id: string;
    provider: string;
    tickLower: number;
    tickUpper: number;
    liquidity: number;
    amountA: number;
    amountB: number;
    entryPrice: number;
    timestamp: number;
}

export interface SwapResult {
    amountOut: number;
    fee: number;
    priceImpact: number;
    newPrice: number;
}

export interface PoolStats {
    reserveA: number;
    reserveB: number;
    totalLiquidity: number;
    currentPrice: number;
    volume24h: number;
    fees24h: number;
}

export interface IEnergyAMM {
    /**
     * Executes a swap between two energy-related tokens.
     */
    swap(tokenIn: string, tokenOut: string, amountIn: number, minAmountOut: number): Promise<SwapResult>;

    /**
     * Adds liquidity within a concentrated price range.
     */
    addLiquidity(
        tokenA: string,
        tokenB: string,
        amountA: number,
        amountB: number,
        tickLower: number,
        tickUpper: number
    ): Promise<string>;

    /**
     * Removes liquidity from a specific position.
     */
    removeLiquidity(positionId: string, amount: number): Promise<{ amountA: number; amountB: number }>;

    /**
     * Calculates the expected output for a swap.
     */
    getAmountOut(tokenIn: string, amountIn: number): number;

    /**
     * Estimates price impact for a given trade size.
     */
    getPriceImpact(tokenIn: string, amountIn: number): number;

    /**
     * Tracks and minimizes impermanent loss for a provider.
     */
    getImpermanentLoss(provider: string): number;

    /**
     * Provides a flash loan with built-in protection.
     */
    flashLoan(receiver: (amount: number) => Promise<void>, token: string, amount: number): Promise<void>;

    /**
     * Returns the current pool statistics.
     */
    getPoolStats(): PoolStats;

    /**
     * Updates the oracle price feed.
     */
    updateOraclePrice(price: number): void;
}
