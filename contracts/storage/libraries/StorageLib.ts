import { BatterySystem, BatteryStatus } from '../structures/StorageStructs';

export class StorageLib {
    static generateBatteryId(owner: string, timestamp: number): string {
        return `BAT-${owner.slice(0, 8)}-${timestamp}`;
    }

    static generateOrderId(owner: string, timestamp: number): string {
        return `ORD-${owner.slice(0, 8)}-${timestamp}`;
    }

    static generateArbitrageId(batteryId: string, timestamp: number): string {
        return `ARB-${batteryId.slice(0, 8)}-${timestamp}`;
    }

    /** Effective available capacity accounting for efficiency losses */
    static availableDischargeKWh(battery: BatterySystem): number {
        return Math.floor(battery.currentChargeKWh * (battery.efficiency / 100));
    }

    /** Available headroom for charging */
    static availableChargeKWh(battery: BatterySystem): number {
        return battery.capacityKWh - battery.currentChargeKWh;
    }

    /** Utilization percentage */
    static utilizationPercent(battery: BatterySystem): number {
        if (battery.capacityKWh === 0) return 0;
        return Math.floor((battery.currentChargeKWh * 100) / battery.capacityKWh);
    }

    /** Arbitrage profit estimate */
    static estimateArbitrageProfit(buyPrice: number, sellPrice: number, capacityKWh: number, efficiency: number): number {
        const effectiveKWh = capacityKWh * (efficiency / 100);
        return Math.floor((sellPrice - buyPrice) * effectiveKWh);
    }

    static validateCharge(battery: BatterySystem, amountKWh: number): void {
        if (battery.status === BatteryStatus.Offline) throw new Error('StorageLib: battery offline');
        if (battery.status === BatteryStatus.Maintenance) throw new Error('StorageLib: battery in maintenance');
        if (amountKWh <= 0) throw new Error('StorageLib: invalid charge amount');
        if (amountKWh > StorageLib.availableChargeKWh(battery)) throw new Error('StorageLib: exceeds capacity');
    }

    static validateDischarge(battery: BatterySystem, amountKWh: number): void {
        if (battery.status === BatteryStatus.Offline) throw new Error('StorageLib: battery offline');
        if (battery.status === BatteryStatus.Maintenance) throw new Error('StorageLib: battery in maintenance');
        if (amountKWh <= 0) throw new Error('StorageLib: invalid discharge amount');
        if (amountKWh > StorageLib.availableDischargeKWh(battery)) throw new Error('StorageLib: insufficient charge');
    }
}
