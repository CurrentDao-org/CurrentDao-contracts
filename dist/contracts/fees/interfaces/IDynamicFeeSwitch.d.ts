export interface IDynamicFeeSwitch {
    calculateDynamicFee(volume: number, userActivity: number): number;
    updateNetworkConditions(congestionLevel: number): void;
    enableEmergencyStop(): void;
    disableEmergencyStop(): void;
    distributeFees(amount: number): void;
}
//# sourceMappingURL=IDynamicFeeSwitch.d.ts.map