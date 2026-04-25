export class FeeSwitchLib {
    /**
     * Returns the base fee in basis points (bps) for a given transaction volume.
     * Fee decreases monotonically as volume increases.
     *
     * Brackets:
     *   volume < 1000    → 100 bps
     *   volume < 10000   → 80 bps
     *   volume < 100000  → 60 bps
     *   volume >= 100000 → 40 bps
     */
    static calculateBaseFee(volume: number): number {
        if (volume < 1000) return 100;
        if (volume < 10000) return 80;
        if (volume < 100000) return 60;
        return 40;
    }

    /**
     * Applies a congestion multiplier to the base fee.
     * congestion is 0–100; at congestion=100 the fee increases by at most 50%.
     * Formula: baseFee * (1 + (congestion / 100) * 0.5), rounded to integer.
     */
    static applyCongestionMultiplier(baseFee: number, congestion: number): number {
        return Math.round(baseFee * (1 + (congestion / 100) * 0.5));
    }

    /**
     * Applies a user loyalty discount to the fee.
     * activityScore is 0–100; at score=100 the fee decreases by at most 20%.
     * Formula: fee * (1 - (activityScore / 100) * 0.2), rounded to integer.
     */
    static applyUserDiscount(fee: number, activityScore: number): number {
        return Math.round(fee * (1 - (activityScore / 100) * 0.2));
    }
}
