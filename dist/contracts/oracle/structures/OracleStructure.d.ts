export type Address = string;
export type u128 = bigint;
export type u64 = number;
export type i64 = number;
export type Bool = boolean;
export type Vec<T> = T[];
export type Map<K, V> = {
    [key: string]: V;
};
export type Set<T> = {
    [key: string]: boolean;
};
export declare class OracleRegistry {
    oracles: Map<Address, Oracle>;
    activeOracles: Set<Address>;
    assetOracles: Map<Address, Vec<Address>>;
    constructor();
}
export declare class Oracle {
    id: Address;
    metadata: OracleMetadata;
    reputation: i64;
    isActive: Bool;
    lastSubmission: u64;
    totalSubmissions: u64;
    successfulSubmissions: u64;
    slashCount: u64;
    registeredAt: u64;
    constructor(id: Address, metadata: OracleMetadata, initialReputation?: i64);
    getSuccessRate(): u64;
    getWeight(): u64;
    canSubmit(minDelay: u64): Bool;
}
export declare class OracleMetadata {
    name: string;
    description: string;
    website: string;
    contact: string;
    fee: u64;
    minDelay: u64;
    supportedAssets: Vec<Address>;
    constructor(name: string, description: string, website: string, contact: string, fee: u64, minDelay: u64, supportedAssets: Vec<Address>);
}
export declare class PriceFeed {
    oracleId: Address;
    assetId: Address;
    price: u128;
    timestamp: u64;
    signature: Uint8Array;
    isValid: Bool;
    deviationScore: u64;
    constructor(oracleId: Address, assetId: Address, price: u128, timestamp: u64, signature: Uint8Array);
    isExpired(maxAge: u64): Bool;
}
export declare class PriceHistory {
    assetId: Address;
    dataPoints: Vec<PriceDataPoint>;
    maxSize: u64;
    constructor(assetId: Address, maxSize?: u64);
    addDataPoint(dataPoint: PriceDataPoint): void;
    getLatestPrice(): u128;
    getPriceAt(timestamp: u64): u128;
    getAveragePrice(fromTimestamp: u64, toTimestamp: u64): u128;
}
export declare class PriceDataPoint {
    price: u128;
    timestamp: u64;
    oracleId: Address;
    isValid: Bool;
    weight: u64;
    constructor(price: u128, timestamp: u64, oracleId: Address, isValid: Bool, weight?: u64);
}
export declare class AggregationResult {
    weightedPrice: u128;
    totalWeight: u64;
    participatingOracles: u64;
    standardDeviation: u128;
    isValid: Bool;
    confidence: u64;
    constructor();
    calculateConfidence(): u64;
}
export declare class DeviationThreshold {
    assetId: Address;
    maxDeviationPercent: u64;
    windowSize: u64;
    minSamples: u64;
    constructor(assetId: Address, maxDeviationPercent?: u64, // 5%
    windowSize?: u64, // 1 hour
    minSamples?: u64);
}
export declare class OracleConfig {
    maxOraclesPerAsset: u64;
    minReputationThreshold: i64;
    maxPriceAge: u64;
    aggregationInterval: u64;
    slashThreshold: u64;
    rewardMultiplier: u128;
    automatedUpdates: Bool;
    constructor();
}
//# sourceMappingURL=OracleStructure.d.ts.map