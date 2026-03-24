import { IDynamicFeeSwitch } from './interfaces/IDynamicFeeSwitch';
import { NetworkMonitor } from './monitoring/NetworkMonitor';
import { FeeOptimizer } from './optimization/FeeOptimizer';
import { FeeDistributor } from './distribution/FeeDistributor';

export class DynamicFeeSwitch implements IDynamicFeeSwitch {
    private monitor: NetworkMonitor;
    private distributor: FeeDistributor;
    private emergencyStopped: boolean = false;

    constructor() {
        this.monitor = new NetworkMonitor();
        this.distributor = new FeeDistributor();
    }

    calculateDynamicFee(volume: number, userActivity: number): number {
        if (this.emergencyStopped) {
            throw new Error("Fee switch is currently stopped due to emergency.");
        }

        const congestion = this.monitor.getCongestion();
        if (this.monitor.isUpdateStale()) {
            console.warn("Network conditions are stale, calculations might not be optimal.");
        }

        return FeeOptimizer.optimize(volume, congestion, userActivity);
    }

    updateNetworkConditions(congestionLevel: number): void {
        this.monitor.updateCongestion(congestionLevel);
    }

    enableEmergencyStop(): void {
        this.emergencyStopped = true;
    }

    disableEmergencyStop(): void {
        this.emergencyStopped = false;
    }

    distributeFees(amount: number): void {
        this.distributor.distribute(amount);
    }

    getDistributorStatus(): any {
        return {
            treasury: this.distributor.getTreasuryBalance(),
            rewards: this.distributor.getRewardsPoolBalance()
        };
    }
}
