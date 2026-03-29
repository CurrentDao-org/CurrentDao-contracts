import { Address, u128, u64, Vec, PriceFeed, Oracle, AggregationResult, DeviationThreshold, PriceHistory } from '../structures/OracleStructure';
export declare class AggregationLib {
    /**
     * Calculates weighted average price from multiple oracle feeds
     * Gas optimized: early termination, minimal loops, efficient calculations
     */
    static calculateWeightedAverage(priceFeeds: Vec<PriceFeed>, oracles: Map<Address, Oracle>): AggregationResult;
    /**
     * Gas optimized standard deviation calculation
     */
    static calculateStandardDeviationOptimized(prices: Vec<u128>, mean: u128): u128;
    /**
     * Gas optimized square root using binary search
     */
    static sqrtOptimized(value: u128): u128;
    /**
     * Gas optimized confidence calculation
     */
    static calculateConfidenceOptimized(result: AggregationResult, oracleCount: number): u64;
    /**
     * Square root approximation for BigInt
     */
    static sqrt(value: u128): u128;
    /**
     * Detects price deviation from historical data
     */
    static detectPriceDeviation(newPrice: u128, priceHistory: PriceHistory, threshold: DeviationThreshold): boolean;
    /**
     * Calculates average of prices
     */
    static calculateAverage(prices: Vec<u128>): u128;
    /**
     * Calculates deviation percentage
     */
    static calculateDeviationPercent(newPrice: u128, referencePrice: u128): u64;
    /**
     * Validates price feed against other feeds
     */
    static validatePriceFeed(targetFeed: PriceFeed, otherFeeds: Vec<PriceFeed>, maxDeviationPercent: u64): boolean;
    /**
     * Median-based aggregation (alternative to weighted average)
     */
    static calculateMedian(prices: Vec<u128>): u128;
    /**
     * Time-weighted average price (TWAP)
     */
    static calculateTWAP(priceHistory: PriceHistory, duration: u64): u128;
    /**
     * Exponential moving average
     */
    static calculateEMA(priceHistory: PriceHistory, period: u64, smoothing?: u64): u128;
    /**
     * Outlier detection using IQR method
     */
    static detectOutliers(prices: Vec<u128>): Vec<boolean>;
    /**
     * Confidence score based on multiple factors
     */
    static calculateConfidenceScore(result: AggregationResult, deviationThreshold: DeviationThreshold, recentVolatility: u64): u64;
}
//# sourceMappingURL=AggregationLib.d.ts.map