"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicFeeSwitch = void 0;
const NetworkMonitor_1 = require("./monitoring/NetworkMonitor");
const FeeOptimizer_1 = require("./optimization/FeeOptimizer");
const FeeDistributor_1 = require("./distribution/FeeDistributor");
class DynamicFeeSwitch {
    monitor;
    distributor;
    emergencyStopped = false;
    constructor() {
        this.monitor = new NetworkMonitor_1.NetworkMonitor();
        this.distributor = new FeeDistributor_1.FeeDistributor();
    }
    calculateDynamicFee(volume, userActivity) {
        if (this.emergencyStopped) {
            throw new Error("Fee switch is currently stopped due to emergency.");
        }
        const congestion = this.monitor.getCongestion();
        if (this.monitor.isUpdateStale()) {
            console.warn("Network conditions are stale, calculations might not be optimal.");
        }
        return FeeOptimizer_1.FeeOptimizer.optimize(volume, congestion, userActivity);
    }
    updateNetworkConditions(congestionLevel) {
        this.monitor.updateCongestion(congestionLevel);
    }
    enableEmergencyStop() {
        this.emergencyStopped = true;
    }
    disableEmergencyStop() {
        this.emergencyStopped = false;
    }
    distributeFees(amount) {
        this.distributor.distribute(amount);
    }
    getDistributorStatus() {
        return {
            treasury: this.distributor.getTreasuryBalance(),
            rewards: this.distributor.getRewardsPoolBalance()
        };
    }
}
exports.DynamicFeeSwitch = DynamicFeeSwitch;
//# sourceMappingURL=DynamicFeeSwitch.js.map