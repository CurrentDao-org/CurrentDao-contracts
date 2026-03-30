export type Address = string;
export type u64 = number;
export type u128 = bigint;

export interface TradeRecord {
    tradeId: string;
    market: Address;
    price: u128;
    volume: u128;
    timestamp: u64;
    bidDepth: u128;
    askDepth: u128;
}

export interface VWAPPoint {
    market: Address;
    periodSeconds: u64;
    timestamp: u64;
    vwap: u128;
    totalVolume: u128;
    tradeCount: u64;
    errorBps: u64;
    momentumBps: number;
    volumeTrend: 'surging' | 'rising' | 'stable' | 'cooling';
}

export interface VolumeMetrics {
    market: Address;
    fromTimestamp: u64;
    toTimestamp: u64;
    totalVolume: u128;
    tradeCount: u64;
    averageTradeSize: u128;
    buyPressureBps: u64;
}

export interface TrendMetrics {
    market: Address;
    shortPeriodSeconds: u64;
    longPeriodSeconds: u64;
    momentumBps: number;
    slopePerMinuteBps: number;
    isBullish: boolean;
    confidenceBps: u64;
}

export interface MarketDepthSnapshot {
    market: Address;
    timestamp: u64;
    bidDepth: u128;
    askDepth: u128;
    imbalanceBps: number;
}

export interface AccuracyReport {
    market: Address;
    periodSeconds: u64;
    averageErrorBps: u64;
    maxErrorBps: u64;
    withinThreshold: boolean;
}

export interface IVWAPOracle {
    recordTrade(trade: TradeRecord): void;
    getVWAP(market: Address, periodSeconds: u64, nowTimestamp?: u64): VWAPPoint;
    getHistoricalVWAP(
        market: Address,
        periodSeconds: u64,
        fromTimestamp: u64,
        toTimestamp: u64
    ): VWAPPoint[];
    getVolumeMetrics(market: Address, fromTimestamp: u64, toTimestamp: u64): VolumeMetrics;
    getTrendMetrics(market: Address): TrendMetrics;
    getMarketDepth(market: Address): MarketDepthSnapshot;
    getAccuracyReport(market: Address, periodSeconds: u64): AccuracyReport;
}
