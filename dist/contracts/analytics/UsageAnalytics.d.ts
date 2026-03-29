import { IUsageAnalytics } from './interfaces/IUsageAnalytics';
import { EngagementMetrics, PerformanceIndicators, HistoricalAnalytics, AggregatedData, PrivacySettings, OptimizationSuggestion, AnalyticsReport, AnalyticsConfiguration } from './structures/UsageStructure';
/**
 * Comprehensive usage analytics contract
 * Tracks platform usage patterns, user engagement metrics, and system performance indicators
 */
export declare class UsageAnalytics implements IUsageAnalytics {
    private owner;
    private paused;
    private configuration;
    private usageMetrics;
    private userAnalytics;
    private contractAnalytics;
    private privacySettings;
    private historicalData;
    private optimizationSuggestions;
    private reports;
    private currentPerformance;
    private lastAggregationTime;
    onUsageRecorded?: (event: {
        anonymizedUserId: string;
        contractAddress: string;
        functionName: string;
        timestamp: number;
    }) => void;
    onReportGenerated?: (report: AnalyticsReport) => void;
    onOptimizationAvailable?: (suggestions: OptimizationSuggestion[]) => void;
    onPerformanceAlert?: (alert: {
        metric: string;
        value: number;
        threshold: number;
        severity: 'low' | 'medium' | 'high';
    }) => void;
    constructor(owner: string, config?: Partial<AnalyticsConfiguration>);
    recordUsage(userAddress: string, contractAddress: string, functionName: string, gasUsed: number, transactionValue: number, blockNumber: number): void;
    batchRecordUsage(usageEvents: Array<{
        userAddress: string;
        contractAddress: string;
        functionName: string;
        gasUsed: number;
        transactionValue: number;
        blockNumber: number;
    }>): void;
    getEngagementMetrics(period: 'daily' | 'weekly' | 'monthly', timestamp?: number): EngagementMetrics;
    getUserEngagement(anonymizedUserId: string, timeRange?: {
        start: number;
        end: number;
    }): EngagementMetrics;
    getPerformanceIndicators(): PerformanceIndicators;
    updatePerformanceIndicators(indicators: Partial<PerformanceIndicators>): void;
    getHistoricalAnalytics(metricType: 'usage' | 'engagement' | 'performance', timeRange: {
        start: number;
        end: number;
    }, granularity: 'hourly' | 'daily' | 'weekly'): HistoricalAnalytics[];
    getTrendAnalysis(metricType: string, period: number): {
        trend: 'increasing' | 'decreasing' | 'stable';
        changePercentage: number;
        confidence: number;
    };
    getAggregatedData(aggregationType: 'total' | 'average' | 'median', timeRange?: {
        start: number;
        end: number;
    }): AggregatedData;
    getDashboardSummary(): {
        totalUsers: number;
        activeUsers: number;
        totalTransactions: number;
        averageGasUsage: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
    };
    setPrivacySettings(userAddress: string, settings: PrivacySettings): void;
    getPrivacySettings(userAddress: string): PrivacySettings;
    anonymizeUserData(userAddress: string): string;
    generateReport(reportType: 'weekly' | 'monthly', timestamp?: number): AnalyticsReport;
    scheduleReport(reportType: 'weekly' | 'monthly', frequency: 'daily' | 'weekly' | 'monthly', recipients: string[]): string;
    getOptimizationSuggestions(category?: string): OptimizationSuggestion[];
    implementOptimization(suggestionId: string): void;
    pause(): void;
    unpause(): void;
    updateConfiguration(config: {
        maxHistoryDays?: number;
        aggregationInterval?: number;
        privacyLevel?: 'minimal' | 'standard' | 'strict';
    }): void;
    getConfiguration(): {
        maxHistoryDays: number;
        aggregationInterval: number;
        privacyLevel: 'minimal' | 'standard' | 'strict';
        isPaused: boolean;
    };
    private requireOwner;
    private requireNotPaused;
    private updateUserAnalytics;
    private updateContractAnalytics;
    private updatePerformanceFromUsage;
    private updatePerformanceFromUsageBatch;
    private checkPerformanceAlerts;
    private cleanupOldData;
    private getActiveUsersCount;
    private getEmptyEngagementMetrics;
    private getUsageTimeSeries;
    private getPerformanceTimeSeries;
    private generateReportSummary;
    private generateUsageSection;
    private generateEngagementSection;
    private generatePerformanceSection;
    private generateOptimizationSection;
    private getDailyTransactionData;
    private getActiveUsersByDay;
    private getPerformanceChartData;
}
//# sourceMappingURL=UsageAnalytics.d.ts.map