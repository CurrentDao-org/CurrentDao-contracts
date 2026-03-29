import { IPriceOracle, OracleMetadata, OracleInfo, PriceDataPoint } from './interfaces/IPriceOracle';
import { DeviationThreshold, OracleConfig } from './structures/OracleStructure';
import { Address, u128, u64, i64, Bool, Vec } from './structures/OracleStructure';
export declare class PriceOracle implements IPriceOracle {
    private registry;
    private priceHistories;
    private deviationThresholds;
    private config;
    private owner;
    private paused;
    private lastAggregationTime;
    constructor(owner: Address);
    submitPriceFeed(oracleId: Address, price: u128, timestamp: u64, signature: Uint8Array): void;
    getCurrentPrice(assetId: Address): u128;
    getHistoricalPrice(assetId: Address, timestamp: u64): u128;
    registerOracle(oracleAddress: Address, metadata: OracleMetadata): void;
    updateOracleReputation(oracleId: Address, reputationDelta: i64): void;
    deactivateOracle(oracleId: Address): void;
    getAggregatedPrice(assetId: Address): u128;
    validatePriceFeed(price: u128, oracleId: Address): Bool;
    detectPriceDeviation(assetId: Address, newPrice: u128): Bool;
    getOracleInfo(oracleId: Address): OracleInfo;
    getActiveOracles(): Vec<Address>;
    getPriceHistory(assetId: Address, fromTimestamp: u64, toTimestamp: u64): Vec<PriceDataPoint>;
    pause(): void;
    unpause(): void;
    updateConfig(newConfig: Partial<OracleConfig>): void;
    setDeviationThreshold(assetId: Address, threshold: DeviationThreshold): void;
    private requireOwner;
    private requireNotPaused;
    private requireValidOracle;
    private requireOracleCanSubmit;
    private getAssetIdFromOracle;
    private storePriceFeed;
    private updateOracleStats;
    private checkAggregationTrigger;
    private scheduleNextAggregation;
    /**
     * Force immediate aggregation for an asset
     */
    forceAggregation(assetId: Address): void;
    /**
     * Enable automated price updates
     */
    enableAutomatedUpdates(): void;
    /**
     * Disable automated price updates
     */
    disableAutomatedUpdates(): void;
    private performAggregation;
    private getLatestFeedFromOracle;
    private getOtherRecentFeeds;
    private handleInvalidSubmission;
    private emitPriceFeedSubmitted;
    private emitPriceAggregated;
    private emitOracleRegistered;
    private emitOracleReputationUpdated;
    private emitSuspiciousPriceDetected;
}
//# sourceMappingURL=PriceOracle.d.ts.map