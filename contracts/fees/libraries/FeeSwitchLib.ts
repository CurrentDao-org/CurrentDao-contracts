export class FeeSwitchLib {
    static calculateBaseFee(volume: number): number {
        if (volume > 1000000) return 0.001; // Tier 1: 0.1%
        if (volume > 100000) return 0.002; // Tier 2: 0.2%
        return 0.003; // Tier 3: 0.3%
    }

    static applyCongestionMultiplier(baseFee: number, congestion: number): number {
        // Congestion is 0.0 to 1.0
        return baseFee * (1 + congestion * 0.5); // Max 50% increase
    }

    static applyUserDiscount(fee: number, activityScore: number): number {
        // Activity score 0 to 100
        const discount = Math.min(activityScore / 100 * 0.2, 0.2); // Max 20% discount
        return fee * (1 - discount);
    }
}
