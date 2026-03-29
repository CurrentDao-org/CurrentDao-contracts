"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeOptimizer = void 0;
const FeeSwitchLib_1 = require("../libraries/FeeSwitchLib");
class FeeOptimizer {
    static optimize(volume, congestion, userActivity) {
        const baseFee = FeeSwitchLib_1.FeeSwitchLib.calculateBaseFee(volume);
        const congestionAdjusted = FeeSwitchLib_1.FeeSwitchLib.applyCongestionMultiplier(baseFee, congestion);
        const finalFee = FeeSwitchLib_1.FeeSwitchLib.applyUserDiscount(congestionAdjusted, userActivity);
        return finalFee;
    }
}
exports.FeeOptimizer = FeeOptimizer;
//# sourceMappingURL=FeeOptimizer.js.map