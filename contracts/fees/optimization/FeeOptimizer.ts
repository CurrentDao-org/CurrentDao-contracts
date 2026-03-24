import { FeeSwitchLib } from '../libraries/FeeSwitchLib';

export class FeeOptimizer {
    static optimize(volume: number, congestion: number, userActivity: number): number {
        const baseFee = FeeSwitchLib.calculateBaseFee(volume);
        const congestionAdjusted = FeeSwitchLib.applyCongestionMultiplier(baseFee, congestion);
        const finalFee = FeeSwitchLib.applyUserDiscount(congestionAdjusted, userActivity);
        
        return finalFee;
    }
}
