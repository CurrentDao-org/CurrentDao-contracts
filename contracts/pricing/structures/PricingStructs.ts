export enum PricingModel {
    FLAT = 'FLAT',
    TIME_OF_USE = 'TIME_OF_USE',
    REAL_TIME = 'REAL_TIME',
    DEMAND_RESPONSE = 'DEMAND_RESPONSE',
}

export interface PricePoint {
    timestamp: number;
    price: bigint; // price per kWh in WATT tokens (scaled by 1e6)
    supply: number; // kWh available
    demand: number; // kWh demanded
    region: string;
}

export interface GeographicZone {
    regionId: string;
    basePrice: bigint;
    peakMultiplier: number; // e.g. 1.5 = 150% of base during peak
    offPeakMultiplier: number; // e.g. 0.7 = 70% of base during off-peak
    peakHoursStart: number; // hour of day (0-23)
    peakHoursEnd: number;
}

export interface OracleData {
    source: string;
    price: bigint;
    timestamp: number;
    confidence: number; // 0-100
}

export interface PriceHistory {
    regionId: string;
    prices: PricePoint[];
    lastUpdated: number;
}
