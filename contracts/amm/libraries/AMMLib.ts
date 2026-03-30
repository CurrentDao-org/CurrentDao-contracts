export class AMMLib {
    /**
     * Constant Product Formula: (x + dx) * (y - dy) = x * y
     * dy = y - (x * y) / (x + dx)
     */
    static calculateAmountOut(reserveIn: number, reserveOut: number, amountIn: number, fee: number = 0.003): number {
        const amountInWithFee = amountIn * (1 - fee);
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn + amountInWithFee;
        return numerator / denominator;
    }

    /**
     * Calculates the price impact of a trade.
     */
    static calculatePriceImpact(reserveIn: number, amountIn: number): number {
        return amountIn / (reserveIn + amountIn);
    }

    /**
     * Tick to Price: price = 1.0001^tick
     */
    static tickToPrice(tick: number): number {
        return Math.pow(1.0001, tick);
    }

    /**
     * Price to Tick: tick = log_1.0001(price)
     */
    static priceToTick(price: number): number {
        return Math.floor(Math.log(price) / Math.log(1.0001));
    }

    /**
     * Impermanent Loss formula: 
     * IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
     */
    static calculateImpermanentLoss(entryPrice: number, currentPrice: number): number {
        const ratio = currentPrice / entryPrice;
        return (2 * Math.sqrt(ratio)) / (1 + ratio) - 1;
    }

    /**
     * Calculates liquidity (L) for a given amount of token A and price range.
     * L = delta_x * sqrt(p_upper * p_lower) / (sqrt(p_upper) - sqrt(p_lower))
     */
    static calculateLiquidityForAmountA(sqrtPA: number, sqrtPB: number, amountA: number): number {
        if (sqrtPA > sqrtPB) [sqrtPA, sqrtPB] = [sqrtPB, sqrtPA];
        return (amountA * (sqrtPA * sqrtPB)) / (sqrtPB - sqrtPA);
    }

    /**
     * Calculates liquidity (L) for a given amount of token B and price range.
     * L = delta_y / (sqrt(p_upper) - sqrt(p_lower))
     */
    static calculateLiquidityForAmountB(sqrtPA: number, sqrtPB: number, amountB: number): number {
        if (sqrtPA > sqrtPB) [sqrtPA, sqrtPB] = [sqrtPB, sqrtPA];
        return amountB / (sqrtPB - sqrtPA);
    }

    /**
     * Gas optimization: Efficient square root calculation using Newton's method.
     */
    static sqrt(y: number): number {
        if (y > 3) {
            let z = y;
            let x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
            return z;
        } else if (y !== 0) {
            return 1;
        }
        return 0;
    }
}
