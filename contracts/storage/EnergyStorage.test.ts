import { EnergyStorage } from './EnergyStorage';
import { BatteryStatus, StorageOrderType } from './structures/StorageStructs';

describe('EnergyStorage', () => {
    let storage: EnergyStorage;
    const owner = 'owner-address';
    const batteryOwner = 'battery-owner';
    const buyer = 'buyer-address';

    beforeEach(() => {
        storage = new EnergyStorage(owner);
    });

    describe('Battery registration', () => {
        it('registers a battery system', () => {
            const id = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            const battery = storage.getBattery(id);
            expect(battery.owner).toBe(batteryOwner);
            expect(battery.capacityKWh).toBe(1000);
            expect(battery.status).toBe(BatteryStatus.Idle);
        });

        it('rejects invalid capacity', () => {
            expect(() => storage.registerBattery(batteryOwner, 0, 100, 100, 90)).toThrow('invalid capacity');
        });

        it('rejects invalid efficiency', () => {
            expect(() => storage.registerBattery(batteryOwner, 1000, 100, 100, 0)).toThrow('efficiency must be 1-100');
        });

        it('tracks batteries by owner', () => {
            storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            storage.registerBattery(batteryOwner, 500, 50, 50, 85);
            expect(storage.getBatteriesByOwner(batteryOwner)).toHaveLength(2);
        });

        it('tracks total batteries', () => {
            storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            expect(storage.totalBatteries()).toBe(1);
        });
    });

    describe('Charging and discharging', () => {
        it('charges a battery', () => {
            const id = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            storage.chargeBattery(id, 500, batteryOwner);
            expect(storage.getBattery(id).currentChargeKWh).toBe(500);
            expect(storage.getBattery(id).status).toBe(BatteryStatus.Charging);
        });

        it('discharges a battery accounting for efficiency', () => {
            const id = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            storage.chargeBattery(id, 1000, batteryOwner);
            storage.dischargeBattery(id, 100, batteryOwner);
            // 100 kWh output requires 100/0.9 ≈ 112 kWh drain
            expect(storage.getBattery(id).currentChargeKWh).toBeLessThan(900);
            expect(storage.getBattery(id).cycleCount).toBe(1);
        });

        it('rejects overcharge', () => {
            const id = storage.registerBattery(batteryOwner, 100, 100, 100, 90);
            expect(() => storage.chargeBattery(id, 200, batteryOwner)).toThrow('exceeds capacity');
        });

        it('rejects overdischarge', () => {
            const id = storage.registerBattery(batteryOwner, 100, 100, 100, 90);
            expect(() => storage.dischargeBattery(id, 50, batteryOwner)).toThrow('insufficient charge');
        });

        it('rejects charge on offline battery', () => {
            const id = storage.registerBattery(batteryOwner, 100, 100, 100, 90);
            storage.updateBatteryStatus(id, BatteryStatus.Offline, batteryOwner);
            expect(() => storage.chargeBattery(id, 50, batteryOwner)).toThrow('battery offline');
        });
    });

    describe('Grid storage optimization', () => {
        it('optimizes grid storage across multiple batteries', () => {
            const id1 = storage.registerBattery(batteryOwner, 1000, 200, 200, 95);
            const id2 = storage.registerBattery(batteryOwner, 1000, 200, 200, 80);
            storage.chargeBattery(id1, 1000, batteryOwner);
            storage.chargeBattery(id2, 1000, batteryOwner);

            const dispatch = storage.optimizeGridStorage([id1, id2], 300);
            const total = Object.values(dispatch).reduce((s, v) => s + v, 0);
            expect(total).toBeGreaterThan(0);
            expect(total).toBeLessThanOrEqual(300);
        });

        it('prioritizes high-efficiency batteries', () => {
            const highEff = storage.registerBattery(batteryOwner, 1000, 200, 200, 95);
            const lowEff = storage.registerBattery(batteryOwner, 1000, 200, 200, 70);
            storage.chargeBattery(highEff, 1000, batteryOwner);
            storage.chargeBattery(lowEff, 1000, batteryOwner);

            const dispatch = storage.optimizeGridStorage([highEff, lowEff], 100);
            // High efficiency battery should be dispatched first
            expect(dispatch[highEff]).toBeGreaterThan(0);
        });
    });

    describe('Storage marketplace', () => {
        it('creates and fills a storage order', () => {
            const batteryId = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            const orderId = storage.createStorageOrder(
                batteryId, StorageOrderType.Sell, 100, 0.1, Date.now() + 86400000, batteryOwner
            );
            storage.fillStorageOrder(orderId, buyer);
            expect(storage.getOrder(orderId).filled).toBe(true);
        });

        it('cancels a storage order', () => {
            const batteryId = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            const orderId = storage.createStorageOrder(
                batteryId, StorageOrderType.Sell, 100, 0.1, Date.now() + 86400000, batteryOwner
            );
            storage.cancelStorageOrder(orderId, batteryOwner);
            expect(storage.getOrder(orderId).filled).toBe(true);
        });

        it('rejects filling an already filled order', () => {
            const batteryId = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            const orderId = storage.createStorageOrder(
                batteryId, StorageOrderType.Sell, 100, 0.1, Date.now() + 86400000, batteryOwner
            );
            storage.fillStorageOrder(orderId, buyer);
            expect(() => storage.fillStorageOrder(orderId, buyer)).toThrow('already filled');
        });
    });

    describe('Arbitrage', () => {
        it('executes an arbitrage opportunity', () => {
            const batteryId = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            storage.chargeBattery(batteryId, 500, batteryOwner);
            const arbId = storage.executeArbitrage(batteryId, 0.05, 0.12, 100, batteryOwner);
            expect(arbId).toBeDefined();
        });

        it('rejects arbitrage with no profit', () => {
            const batteryId = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            expect(() => storage.executeArbitrage(batteryId, 0.12, 0.05, 100, batteryOwner)).toThrow('no profit opportunity');
        });
    });

    describe('Performance monitoring', () => {
        it('generates a performance report', () => {
            const batteryId = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            storage.chargeBattery(batteryId, 500, batteryOwner);
            const report = storage.getPerformanceReport(batteryId);
            expect(report.batteryId).toBe(batteryId);
            expect(report.utilizationPercent).toBe(50);
        });
    });

    describe('Maintenance', () => {
        it('schedules maintenance', () => {
            const id = storage.registerBattery(batteryOwner, 1000, 100, 100, 90);
            storage.scheduleMaintenance(id, batteryOwner);
            expect(storage.getBattery(id).status).toBe(BatteryStatus.Maintenance);
        });
    });
});
