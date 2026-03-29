"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeDistributor = void 0;
class FeeDistributor {
    treasuryBalance = 0;
    rewardsPoolBalance = 0;
    distribute(amount) {
        // 70% to treasury, 30% to user rewards
        const treasuryShare = amount * 0.7;
        const rewardsShare = amount * 0.3;
        this.treasuryBalance += treasuryShare;
        this.rewardsPoolBalance += rewardsShare;
    }
    getTreasuryBalance() {
        return this.treasuryBalance;
    }
    getRewardsPoolBalance() {
        return this.rewardsPoolBalance;
    }
}
exports.FeeDistributor = FeeDistributor;
//# sourceMappingURL=FeeDistributor.js.map