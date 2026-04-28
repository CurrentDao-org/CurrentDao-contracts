export enum BatteryStatus {
    Idle = 'Idle',
    Charging = 'Charging',
    Discharging = 'Discharging',
    Maintenance = 'Maintenance',
    Offline = 'Offline'
}

export enum StorageOrderType {
    Buy = 'Buy',
    Sell = 'Sell'
}

export interface BatterySystem {
    id: string;
    owner: string;
    capacityKWh: number;       // Total capacity in kWh
    currentChargeKWh: number;  // Current charge level
    maxChargeRateKW: number;   // Max charging rate in kW
    maxDischargeRateKW: number;
    efficiency: number;        // Round-trip efficiency 0-100
    cycleCount: number;
    status: BatteryStatus;
    registeredAt: number;
    lastUpdated: number;
}

export interface StorageOrder {
    id: string;
    owner: string;
    batteryId: string;
    orderType: StorageOrderType;
    capacityKWh: number;
    pricePerKWh: number;
    expiresAt: number;
    filled: boolean;
    createdAt: number;
}

export interface ArbitrageOpportunity {
    id: string;
    batteryId: string;
    buyPrice: number;
    sellPrice: number;
    capacityKWh: number;
    estimatedProfit: number;
    executedAt: number;
}

export interface StoragePerformanceReport {
    batteryId: string;
    utilizationPercent: number;
    cyclesThisPeriod: number;
    energyThroughputKWh: number;
    revenueGenerated: number;
    reportedAt: number;
}
