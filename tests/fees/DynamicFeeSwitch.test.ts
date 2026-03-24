import { DynamicFeeSwitch } from '../../contracts/fees/DynamicFeeSwitch';

describe('DynamicFeeSwitch', () => {
    let feeSwitch: DynamicFeeSwitch;

    beforeEach(() => {
        feeSwitch = new DynamicFeeSwitch();
    });

    test('should calculate fee correctly based on volume and zero congestion', () => {
        const fee = feeSwitch.calculateDynamicFee(500000, 0); // tier 2, no user discount
        expect(fee).toBeCloseTo(0.002);
    });

    test('should increase fee with congestion', () => {
        feeSwitch.updateNetworkConditions(1.0); // max congestion
        const fee = feeSwitch.calculateDynamicFee(500000, 0); 
        expect(fee).toBeCloseTo(0.003); // 0.002 * 1.5
    });

    test('should decrease fee with user activity', () => {
        const fee = feeSwitch.calculateDynamicFee(500000, 100); // tier 2, max user discount
        expect(fee).toBeCloseTo(0.0016); // 0.002 * 0.8
    });

    test('should stop calculation on emergency stop', () => {
        feeSwitch.enableEmergencyStop();
        expect(() => {
            feeSwitch.calculateDynamicFee(500000, 0);
        }).toThrow("Fee switch is currently stopped due to emergency.");
    });

    test('should distribute fees correctly', () => {
        feeSwitch.distributeFees(100);
        const status = feeSwitch.getDistributorStatus();
        expect(status.treasury).toBe(70);
        expect(status.rewards).toBe(30);
    });
});
