"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeSwitchLib = void 0;
class FeeSwitchLib {
    static calculateBaseFee(volume) {
        if (volume > 1000000)
            return 0.001; // Tier 1: 0.1%
        if (volume > 100000)
            return 0.002; // Tier 2: 0.2%
        return 0.003; // Tier 3: 0.3%
    }
    static applyCongestionMultiplier(baseFee, congestion) {
        // Congestion is 0.0 to 1.0
        return baseFee * (1 + congestion * 0.5); // Max 50% increase
    }
    static applyUserDiscount(fee, activityScore) {
        // Activity score 0 to 100
        const discount = Math.min(activityScore / 100 * 0.2, 0.2); // Max 20% discount
        return fee * (1 - discount);
    }
}
exports.FeeSwitchLib = FeeSwitchLib;
//# sourceMappingURL=FeeSwitchLib.js.map