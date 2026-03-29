import { UsageMetrics, EngagementMetrics, PerformanceIndicators, AggregatedData, PrivacySettings, OptimizationSuggestion, AnalyticsConfiguration, TimeSeriesData, UserAnalytics } from '../structures/UsageStructure';
/**
 * Utility library for analytics calculations and data processing
 */
export declare class AnalyticsLib {
    /**
     * Anonymizes user address based on privacy settings
     */
    static anonymizeAddress(userAddress: string, settings: PrivacySettings): string;
    private static partialAnonymize;
    private static fullAnonymize;
    /**
     * Calculates trend analysis for time series data
     */
    static calculateTrend(data: TimeSeriesData[]): {
        trend: 'increasing' | 'decreasing' | 'stable';
        changePercentage: number;
        confidence: number;
    };
    /**
     * Aggregates time series data by specified granularity
     */
    static aggregateByGranularity(data: TimeSeriesData[], granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'): TimeSeriesData[];
    /**
     * Calculates performance indicators from usage metrics
     */
    static calculatePerformanceIndicators(metrics: UsageMetrics[]): PerformanceIndicators;
    /**
     * Calculates engagement metrics from user analytics
     */
    static calculateEngagementMetrics(userAnalytics: UserAnalytics[], period: 'daily' | 'weekly' | 'monthly', timestamp?: number): EngagementMetrics;
    private static getPeriodMs;
    private static calculateRetentionRate;
    private static calculatePeakActivityHours;
    /**
     * Aggregates usage data into summary statistics
     */
    static aggregateUsageData(metrics: UsageMetrics[], timeRange?: {
        start: number;
        end: number;
    }): AggregatedData;
    /**
     * Generates optimization suggestions based on analytics data
     */
    static generateOptimizationSuggestions(metrics: UsageMetrics[], performance: PerformanceIndicators, config: AnalyticsConfiguration): OptimizationSuggestion[];
    /**
     * Estimates gas savings for batch operations
     */
    static estimateBatchGasSavings(singleOperationGas: number, batchSize: number): number;
    /**
     * Calculates optimal batch size for gas efficiency
     */
    static calculateOptimalBatchSize(baseGasCost: number, perItemGasCost: number, maxGasLimit?: number): number;
    /**
     * Validates privacy settings compliance
     */
    static validatePrivacyCompliance(settings: PrivacySettings): boolean;
    /**
     * Cleans up old data based on retention policies
     */
    static cleanupOldData(data: {
        timestamp: number;
    }[], maxAge: number): {
        timestamp: number;
    }[];
}
//# sourceMappingURL=AnalyticsLib.d.ts.map