import { IDynamicFeeSwitch } from './interfaces/IDynamicFeeSwitch';
export declare class DynamicFeeSwitch implements IDynamicFeeSwitch {
    private monitor;
    private distributor;
    private emergencyStopped;
    constructor();
    calculateDynamicFee(volume: number, userActivity: number): number;
    updateNetworkConditions(congestionLevel: number): void;
    enableEmergencyStop(): void;
    disableEmergencyStop(): void;
    distributeFees(amount: number): void;
    getDistributorStatus(): any;
}
//# sourceMappingURL=DynamicFeeSwitch.d.ts.map