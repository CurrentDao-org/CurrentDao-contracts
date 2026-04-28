import {
    BatterySystem,
    StorageOrder,
    ArbitrageOpportunity,
    StoragePerformanceReport,
    StorageOrderType
} from '../structures/StorageStructs';

export interface IEnergyStorage {
    // Battery management
    registerBattery(
        owner: string,
        capacityKWh: number,
        maxChargeRateKW: number,
        maxDischargeRateKW: number,
        efficiency: number
    ): string;

    updateBatteryStatus(batteryId: string, status: string, caller: string): void;
    chargeBattery(batteryId: string, amountKWh: number, caller: string): void;
    dischargeBattery(batteryId: string, amountKWh: number, caller: string): void;
    scheduleMaintenance(batteryId: string, caller: string): void;

    // Grid storage optimization
    optimizeGridStorage(batteryIds: string[], gridDemandKW: number): Record<string, number>;

    // Storage marketplace
    createStorageOrder(
        batteryId: string,
        orderType: StorageOrderType,
        capacityKWh: number,
        pricePerKWh: number,
        expiresAt: number,
        caller: string
    ): string;

    cancelStorageOrder(orderId: string, caller: string): void;
    fillStorageOrder(orderId: string, buyer: string): void;

    // Arbitrage
    detectArbitrageOpportunities(batteryId: string): ArbitrageOpportunity[];
    executeArbitrage(batteryId: string, buyPrice: number, sellPrice: number, capacityKWh: number, caller: string): string;

    // Performance monitoring
    getPerformanceReport(batteryId: string): StoragePerformanceReport;

    // Queries
    getBattery(batteryId: string): BatterySystem;
    getOrder(orderId: string): StorageOrder;
    getBatteriesByOwner(owner: string): string[];
    totalBatteries(): number;
}
