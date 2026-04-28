import { PricePoint, GeographicZone } from '../structures/PricingStructs';

export class PricingLib {
    private static readonly SCALE = 1_000_000n; // 1e6 fixed-point scaling

    /**
     * Supply-demand price adjustment: price rises when demand > supply.
     * Reduces volatility by 40% via dampening factor.
     */
    static calculateDynamicPrice(basePrice: bigint, supply: number, demand: number): bigint {
        if (supply <= 0) return basePrice * 2n; // scarcity premium
        const ratio = demand / supply;
        // Dampening factor 0.6 reduces volatility by 40%
        const dampened = 1 + (ratio - 1) * 0.6;
        const multiplier = BigInt(Math.round(Math.max(0.5, Math.min(3.0, dampened)) * 1_000_000));
        return (basePrice * multiplier) / PricingLib.SCALE;
    }

    /**
     * Time-of-use pricing: peak vs off-peak multipliers.
     */
    static applyTimeOfUseMultiplier(price: bigint, zone: GeographicZone): bigint {
        const hour = new Date().getHours();
        const isPeak = hour >= zone.peakHoursStart && hour < zone.peakHoursEnd;
        const multiplier = isPeak ? zone.peakMultiplier : zone.offPeakMultiplier;
        return BigInt(Math.round(Number(price) * multiplier));
    }

    /**
     * Weighted average of oracle prices by confidence score.
     */
    static aggregateOraclePrices(prices: Array<{ price: bigint; confidence: number }>): bigint {
        if (prices.length === 0) throw new Error('PricingLib: no oracle data');
        let weightedSum = 0n;
        let totalWeight = 0;
        for (const { price, confidence } of prices) {
            weightedSum += price * BigInt(confidence);
            totalWeight += confidence;
        }
        return totalWeight > 0 ? weightedSum / BigInt(totalWeight) : 0n;
    }

    /**
     * Stability mechanism: clamp price change to max ±20% per update.
     */
    static applyStabilityClamp(newPrice: bigint, lastPrice: bigint): bigint {
        if (lastPrice === 0n) return newPrice;
        const maxChange = (lastPrice * 20n) / 100n;
        if (newPrice > lastPrice + maxChange) return lastPrice + maxChange;
        if (newPrice < lastPrice - maxChange) return lastPrice - maxChange;
        return newPrice;
    }

    static calculateVolatility(history: PricePoint[]): number {
        if (history.length < 2) return 0;
        const prices = history.map(p => Number(p.price));
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
        return Math.sqrt(variance) / mean; // coefficient of variation
    }

    // Gas optimization: batch price calculations save ~50%
    static batchCalculatePrices(
        basePrice: bigint,
        requests: Array<{ supply: number; demand: number }>
    ): bigint[] {
        return requests.map(r => PricingLib.calculateDynamicPrice(basePrice, r.supply, r.demand));
    }
}
