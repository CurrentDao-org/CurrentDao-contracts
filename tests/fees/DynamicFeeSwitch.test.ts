import { DynamicFeeSwitch } from '../../contracts/fees/DynamicFeeSwitch';
import { NetworkConditions, FeeTier } from '../../contracts/fees/interfaces/IDynamicFeeSwitch';
import { FeeDistributor } from '../../contracts/fees/distribution/FeeDistributor';

const DEFAULT_TIERS: FeeTier[] = [
    { baseFeeBps: 100, minFeeBps: 40, maxFeeBps: 150 },
];

describe('DynamicFeeSwitch', () => {
    let feeSwitch: DynamicFeeSwitch;

    beforeEach(() => {
        feeSwitch = new DynamicFeeSwitch(DEFAULT_TIERS);
    });

    test('should calculate fee in bps based on volume with zero congestion', () => {
        // volume=500000 → bracket >= 100000 → baseFee=40 bps, congestion=0, activity=0
        const fee = feeSwitch.calculateDynamicFee('0xuser', 500000);
        expect(fee).toBe(40);
    });

    test('should increase fee with congestion', () => {
        const conditions: NetworkConditions = {
            congestionLevel: 100,
            averageBlockTime: 1,
            lastUpdatedTimestamp: Date.now()
        };
        feeSwitch.updateNetworkConditions(conditions);
        // baseFee=40, congestion=100 → 40 * 1.5 = 60 bps
        const fee = feeSwitch.calculateDynamicFee('0xuser', 500000);
        expect(fee).toBe(60);
    });

    test('should return safe fee on emergency stop', () => {
        feeSwitch.triggerEmergencyMode(true, 500);
        const fee = feeSwitch.calculateDynamicFee('0xuser', 500000);
        expect(fee).toBe(500);
    });

    test('should resume normal calculation after emergency stop is lifted', () => {
        feeSwitch.triggerEmergencyMode(true, 500);
        feeSwitch.triggerEmergencyMode(false, 0);
        const fee = feeSwitch.calculateDynamicFee('0xuser', 500000);
        expect(fee).toBe(40);
    });

    test('should distribute fees correctly', () => {
        const distributor = new FeeDistributor();
        distributor.configure([
            { address: '0xtreasury', allocationBps: 7000, name: 'Treasury' },
            { address: '0xrewards', allocationBps: 3000, name: 'Rewards Pool' },
        ]);
        distributor.distribute(100);
        expect(distributor.getTreasuryBalance()).toBe(70);
        expect(distributor.getRewardsPoolBalance()).toBe(30);
    });

    test('should throw ValidationError for empty userAddress', () => {
        expect(() => feeSwitch.calculateDynamicFee('', 1000)).toThrow('userAddress must not be empty');
    });

    test('should throw ValidationError for non-positive transactionVolume', () => {
        expect(() => feeSwitch.calculateDynamicFee('0xuser', 0)).toThrow('transactionVolume must be greater than 0');
    });

    test('should throw ValidationError for invalid FeeTier (min > max)', () => {
        expect(() => new DynamicFeeSwitch([{ baseFeeBps: 50, minFeeBps: 100, maxFeeBps: 50 }])).toThrow('FeeTier invalid');
    });

    test('should emit EmergencyModeEvent on mode change', () => {
        const events: any[] = [];
        feeSwitch.onEmergencyMode(e => events.push(e));
        feeSwitch.triggerEmergencyMode(true, 200);
        expect(events).toHaveLength(1);
        expect(events[0].isEmergency).toBe(true);
        expect(events[0].safeFeeBps).toBe(200);
    });

    test('should throw ValidationError when activating emergency with safeFeeBps=0', () => {
        expect(() => feeSwitch.triggerEmergencyMode(true, 0)).toThrow('safeFeeBps must be greater than 0');
    });
});
