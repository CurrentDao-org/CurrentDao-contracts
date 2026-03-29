export interface UsageMetrics {
    id: string;
    anonymizedUserId: string;
    contractAddress: string;
    functionName: string;
    gasUsed: number;
    transactionValue: number;
    blockNumber: number;
    timestamp: number;
    executionTime: number;
    success: boolean;
    errorCode?: string;
}
export interface EngagementMetrics {
    period: 'daily' | 'weekly' | 'monthly';
    timestamp: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
    totalTransactions: number;
    uniqueContracts: number;
    averageSessionDuration: number;
    bounceRate: number;
    retentionRate: number;
    userSatisfactionScore?: number;
    featureUsage: Map<string, number>;
    peakActivityHours: number[];
}
export interface PerformanceIndicators {
    systemHealth: 'healthy' | 'warning' | 'critical';
    averageGasUsage: number;
    gasEfficiency: number;
    averageExecutionTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
    latency: number;
    availability: number;
    resourceUtilization: number;
    timestamp: number;
    alerts: PerformanceAlert[];
}
export interface PerformanceAlert {
    metric: string;
    value: number;
    threshold: number;
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: number;
    resolved: boolean;
}
export interface HistoricalAnalytics {
    timestamp: number;
    metricType: 'usage' | 'engagement' | 'performance';
    value: number;
    metadata?: Record<string, any>;
    period: 'hourly' | 'daily' | 'weekly';
}
export interface AggregatedData {
    totalUsers: number;
    activeUsers: number;
    totalTransactions: number;
    totalGasUsed: number;
    averageGasUsage: number;
    totalValue: number;
    averageTransactionValue: number;
    uniqueContracts: number;
    topContracts: Array<{
        address: string;
        usage: number;
        percentage: number;
    }>;
    timeRange: {
        start: number;
        end: number;
    };
    lastUpdated: number;
}
export interface PrivacySettings {
    userAddress: string;
    dataCollection: boolean;
    anonymizationLevel: 'none' | 'partial' | 'full';
    dataRetention: number;
    sharingConsent: boolean;
    analyticsOptOut: boolean;
    createdAt: number;
    updatedAt: number;
}
export interface OptimizationSuggestion {
    id: string;
    category: 'gas' | 'performance' | 'user_experience' | 'security';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    impact: {
        gasSavings?: number;
        performanceImprovement?: number;
        userExperienceImprovement?: number;
    };
    implementation: {
        difficulty: 'easy' | 'medium' | 'hard';
        estimatedTime: number;
        prerequisites: string[];
    };
    status: 'pending' | 'in_progress' | 'implemented' | 'rejected';
    createdAt: number;
    validUntil: number;
}
export interface AnalyticsReport {
    id: string;
    type: 'weekly' | 'monthly';
    period: {
        start: number;
        end: number;
    };
    generatedAt: number;
    summary: {
        totalUsers: number;
        activeUsers: number;
        totalTransactions: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
        keyMetrics: Array<{
            name: string;
            value: number;
            change: number;
            trend: 'up' | 'down' | 'stable';
        }>;
    };
    sections: {
        usage: ReportSection;
        engagement: ReportSection;
        performance: ReportSection;
        optimization: ReportSection;
    };
    recommendations: OptimizationSuggestion[];
}
export interface ReportSection {
    title: string;
    data: any;
    insights: string[];
    charts: ChartData[];
}
export interface ChartData {
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: Array<{
        label: string;
        value: number;
        timestamp?: number;
    }>;
    metadata?: Record<string, any>;
}
export interface AnalyticsConfiguration {
    maxHistoryDays: number;
    aggregationInterval: number;
    privacyLevel: 'minimal' | 'standard' | 'strict';
    alertThresholds: {
        gasUsage: number;
        errorRate: number;
        latency: number;
        availability: number;
    };
    reportSchedule: {
        weekly: boolean;
        monthly: boolean;
        recipients: string[];
    };
    optimization: {
        enabled: boolean;
        autoImplement: boolean;
        maxPriority: 'low' | 'medium' | 'high' | 'critical';
    };
}
export interface UserAnalytics {
    anonymizedId: string;
    firstSeen: number;
    lastSeen: number;
    totalTransactions: number;
    totalGasUsed: number;
    contractsInteracted: Set<string>;
    functionsUsed: Map<string, number>;
    sessionHistory: UserSession[];
    preferences: UserPreferences;
}
export interface UserSession {
    id: string;
    startTime: number;
    endTime?: number;
    transactions: number;
    contracts: Set<string>;
    duration: number;
}
export interface UserPreferences {
    privacySettings: PrivacySettings;
    notificationSettings: {
        reports: boolean;
        optimizations: boolean;
        alerts: boolean;
    };
    dashboardSettings: {
        defaultPeriod: 'daily' | 'weekly' | 'monthly';
        favoriteMetrics: string[];
    };
}
export interface ContractAnalytics {
    address: string;
    totalUsage: number;
    uniqueUsers: number;
    averageGasUsage: number;
    functionUsage: Map<string, number>;
    errorRate: number;
    lastUsed: number;
    popularity: number;
}
export interface TimeSeriesData {
    timestamp: number;
    value: number;
    metadata?: Record<string, any>;
}
export interface AggregationCache {
    key: string;
    data: any;
    timestamp: number;
    ttl: number;
}
export declare const DEFAULT_PRIVACY_SETTINGS: PrivacySettings;
export declare const DEFAULT_CONFIGURATION: AnalyticsConfiguration;
export declare const OPTIMIZATION_TEMPLATES: OptimizationSuggestion[];
export type MetricType = 'usage' | 'engagement' | 'performance';
export type AggregationType = 'total' | 'average' | 'median' | 'min' | 'max';
export type TimeGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type PrivacyLevel = 'none' | 'partial' | 'full';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type OptimizationCategory = 'gas' | 'performance' | 'user_experience' | 'security';
export type ReportType = 'weekly' | 'monthly';
export type ChartType = 'line' | 'bar' | 'pie' | 'area';
//# sourceMappingURL=UsageStructure.d.ts.map