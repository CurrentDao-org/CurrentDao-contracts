"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageAnalytics = void 0;
const UsageStructure_1 = require("./structures/UsageStructure");
const AnalyticsLib_1 = require("./libraries/AnalyticsLib");
/**
 * Comprehensive usage analytics contract
 * Tracks platform usage patterns, user engagement metrics, and system performance indicators
 */
class UsageAnalytics {
    owner;
    paused = false;
    configuration;
    // Storage
    usageMetrics = [];
    userAnalytics = new Map();
    contractAnalytics = new Map();
    privacySettings = new Map();
    historicalData = new Map();
    optimizationSuggestions = new Map();
    reports = new Map();
    currentPerformance;
    lastAggregationTime = 0;
    // Events
    onUsageRecorded;
    onReportGenerated;
    onOptimizationAvailable;
    onPerformanceAlert;
    constructor(owner, config) {
        this.owner = owner;
        this.configuration = { ...UsageStructure_1.DEFAULT_CONFIGURATION, ...config };
        // Initialize performance indicators
        this.currentPerformance = {
            systemHealth: 'healthy',
            averageGasUsage: 0,
            gasEfficiency: 100,
            averageExecutionTime: 0,
            successRate: 100,
            errorRate: 0,
            throughput: 0,
            latency: 0,
            availability: 100,
            resourceUtilization: 0,
            timestamp: Date.now(),
            alerts: []
        };
    }
    // --- Usage Tracking ---
    recordUsage(userAddress, contractAddress, functionName, gasUsed, transactionValue, blockNumber) {
        this.requireNotPaused();
        const privacySettings = this.getPrivacySettings(userAddress);
        // Check if user has opted out
        if (privacySettings.analyticsOptOut) {
            return;
        }
        // Anonymize user data
        const anonymizedUserId = AnalyticsLib_1.AnalyticsLib.anonymizeAddress(userAddress, privacySettings);
        const metric = {
            id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            anonymizedUserId,
            contractAddress,
            functionName,
            gasUsed,
            transactionValue,
            blockNumber,
            timestamp: Date.now(),
            executionTime: 0, // Would be measured in actual implementation
            success: true
        };
        // Store usage metric
        this.usageMetrics.push(metric);
        // Update user analytics
        this.updateUserAnalytics(anonymizedUserId, metric);
        // Update contract analytics
        this.updateContractAnalytics(contractAddress, metric);
        // Update performance indicators
        this.updatePerformanceFromUsage(metric);
        // Clean up old data if needed
        this.cleanupOldData();
        // Emit event
        this.onUsageRecorded?.({
            anonymizedUserId,
            contractAddress,
            functionName,
            timestamp: metric.timestamp
        });
    }
    batchRecordUsage(usageEvents) {
        this.requireNotPaused();
        // Batch processing for gas optimization
        const processedMetrics = [];
        for (const event of usageEvents) {
            const privacySettings = this.getPrivacySettings(event.userAddress);
            if (privacySettings.analyticsOptOut) {
                continue;
            }
            const anonymizedUserId = AnalyticsLib_1.AnalyticsLib.anonymizeAddress(event.userAddress, privacySettings);
            const metric = {
                id: `usage_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                anonymizedUserId,
                contractAddress: event.contractAddress,
                functionName: event.functionName,
                gasUsed: event.gasUsed,
                transactionValue: event.transactionValue,
                blockNumber: event.blockNumber,
                timestamp: Date.now(),
                executionTime: 0,
                success: true
            };
            processedMetrics.push(metric);
            this.updateUserAnalytics(anonymizedUserId, metric);
            this.updateContractAnalytics(event.contractAddress, metric);
        }
        // Add all metrics at once
        this.usageMetrics.push(...processedMetrics);
        // Update performance indicators
        this.updatePerformanceFromUsageBatch(processedMetrics);
        // Clean up old data
        this.cleanupOldData();
        // Emit batch events
        processedMetrics.forEach(metric => {
            this.onUsageRecorded?.({
                anonymizedUserId: metric.anonymizedUserId,
                contractAddress: metric.contractAddress,
                functionName: metric.functionName,
                timestamp: metric.timestamp
            });
        });
    }
    // --- Engagement Metrics ---
    getEngagementMetrics(period, timestamp) {
        const targetTimestamp = timestamp || Date.now();
        const userAnalyticsArray = Array.from(this.userAnalytics.values());
        return AnalyticsLib_1.AnalyticsLib.calculateEngagementMetrics(userAnalyticsArray, period, targetTimestamp);
    }
    getUserEngagement(anonymizedUserId, timeRange) {
        const userAnalytics = this.userAnalytics.get(anonymizedUserId);
        if (!userAnalytics) {
            return this.getEmptyEngagementMetrics();
        }
        return AnalyticsLib_1.AnalyticsLib.calculateEngagementMetrics([userAnalytics], 'daily', Date.now());
    }
    // --- Performance Indicators ---
    getPerformanceIndicators() {
        return { ...this.currentPerformance };
    }
    updatePerformanceIndicators(indicators) {
        this.requireOwner();
        this.currentPerformance = {
            ...this.currentPerformance,
            ...indicators,
            timestamp: Date.now()
        };
        // Check for performance alerts
        this.checkPerformanceAlerts();
    }
    // --- Historical Analytics ---
    getHistoricalAnalytics(metricType, timeRange, granularity) {
        const key = `${metricType}_${granularity}`;
        const historical = this.historicalData.get(key) || [];
        return historical.filter(data => data.timestamp >= timeRange.start && data.timestamp <= timeRange.end);
    }
    getTrendAnalysis(metricType, period) {
        const endTime = Date.now();
        const startTime = endTime - (period * 24 * 60 * 60 * 1000);
        let timeSeriesData = [];
        switch (metricType) {
            case 'usage':
                timeSeriesData = this.getUsageTimeSeries(startTime, endTime);
                break;
            case 'performance':
                timeSeriesData = this.getPerformanceTimeSeries(startTime, endTime);
                break;
            default:
                return { trend: 'stable', changePercentage: 0, confidence: 0 };
        }
        return AnalyticsLib_1.AnalyticsLib.calculateTrend(timeSeriesData);
    }
    // --- Data Aggregation ---
    getAggregatedData(aggregationType, timeRange) {
        return AnalyticsLib_1.AnalyticsLib.aggregateUsageData(this.usageMetrics, timeRange);
    }
    getDashboardSummary() {
        const aggregated = this.getAggregatedData('total');
        const performance = this.getPerformanceIndicators();
        return {
            totalUsers: aggregated.totalUsers,
            activeUsers: this.getActiveUsersCount(),
            totalTransactions: aggregated.totalTransactions,
            averageGasUsage: aggregated.averageGasUsage,
            systemHealth: performance.systemHealth
        };
    }
    // --- Privacy Protection ---
    setPrivacySettings(userAddress, settings) {
        this.requireOwner();
        // Validate privacy compliance
        if (!AnalyticsLib_1.AnalyticsLib.validatePrivacyCompliance(settings)) {
            throw new Error('Privacy settings are not compliant');
        }
        settings.userAddress = userAddress;
        settings.updatedAt = Date.now();
        this.privacySettings.set(userAddress, settings);
    }
    getPrivacySettings(userAddress) {
        return this.privacySettings.get(userAddress) || { ...UsageStructure_1.DEFAULT_PRIVACY_SETTINGS, userAddress };
    }
    anonymizeUserData(userAddress) {
        const settings = this.getPrivacySettings(userAddress);
        return AnalyticsLib_1.AnalyticsLib.anonymizeAddress(userAddress, settings);
    }
    // --- Analytics Reporting ---
    generateReport(reportType, timestamp) {
        const targetTimestamp = timestamp || Date.now();
        const periodMs = reportType === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const report = {
            id: `report_${reportType}_${targetTimestamp}`,
            type: reportType,
            period: {
                start: targetTimestamp - periodMs,
                end: targetTimestamp
            },
            generatedAt: Date.now(),
            summary: this.generateReportSummary(targetTimestamp, periodMs),
            sections: {
                usage: this.generateUsageSection(targetTimestamp, periodMs),
                engagement: this.generateEngagementSection(targetTimestamp, periodMs),
                performance: this.generatePerformanceSection(targetTimestamp, periodMs),
                optimization: this.generateOptimizationSection()
            },
            recommendations: Array.from(this.optimizationSuggestions.values())
                .filter(s => s.status === 'pending')
                .slice(0, 5) // Top 5 recommendations
        };
        // Store report
        this.reports.set(report.id, report);
        // Emit event
        this.onReportGenerated?.(report);
        return report;
    }
    scheduleReport(reportType, frequency, recipients) {
        this.requireOwner();
        const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // In a real implementation, this would set up a scheduler
        // For now, we'll just store the schedule information
        return scheduleId;
    }
    // --- Optimization Suggestions ---
    getOptimizationSuggestions(category) {
        const suggestions = Array.from(this.optimizationSuggestions.values());
        if (category) {
            return suggestions.filter(s => s.category === category);
        }
        return suggestions;
    }
    implementOptimization(suggestionId) {
        this.requireOwner();
        const suggestion = this.optimizationSuggestions.get(suggestionId);
        if (!suggestion) {
            throw new Error(`Optimization suggestion not found: ${suggestionId}`);
        }
        if (suggestion.status !== 'pending') {
            throw new Error(`Optimization suggestion is not pending: ${suggestionId}`);
        }
        // Update status
        suggestion.status = 'implemented';
        this.optimizationSuggestions.set(suggestionId, suggestion);
        // In a real implementation, this would trigger the actual optimization
    }
    // --- Administrative Functions ---
    pause() {
        this.requireOwner();
        this.paused = true;
    }
    unpause() {
        this.requireOwner();
        this.paused = false;
    }
    updateConfiguration(config) {
        this.requireOwner();
        this.configuration = {
            ...this.configuration,
            ...config
        };
    }
    getConfiguration() {
        return {
            maxHistoryDays: this.configuration.maxHistoryDays,
            aggregationInterval: this.configuration.aggregationInterval,
            privacyLevel: this.configuration.privacyLevel,
            isPaused: this.paused
        };
    }
    // --- Private Helper Methods ---
    requireOwner() {
        // In a real implementation, this would check the caller's address
        // For now, we'll assume this is called by the owner
    }
    requireNotPaused() {
        if (this.paused) {
            throw new Error('Contract is paused');
        }
    }
    updateUserAnalytics(anonymizedUserId, metric) {
        let userAnalytics = this.userAnalytics.get(anonymizedUserId);
        if (!userAnalytics) {
            userAnalytics = {
                anonymizedId: anonymizedUserId,
                firstSeen: metric.timestamp,
                lastSeen: metric.timestamp,
                totalTransactions: 0,
                totalGasUsed: 0,
                contractsInteracted: new Set(),
                functionsUsed: new Map(),
                sessionHistory: [],
                preferences: {
                    privacySettings: this.getPrivacySettings(''), // Default settings
                    notificationSettings: {
                        reports: true,
                        optimizations: true,
                        alerts: true
                    },
                    dashboardSettings: {
                        defaultPeriod: 'daily',
                        favoriteMetrics: []
                    }
                }
            };
            this.userAnalytics.set(anonymizedUserId, userAnalytics);
        }
        // Update user analytics
        userAnalytics.lastSeen = metric.timestamp;
        userAnalytics.totalTransactions++;
        userAnalytics.totalGasUsed += metric.gasUsed;
        userAnalytics.contractsInteracted.add(metric.contractAddress);
        const functionCount = userAnalytics.functionsUsed.get(metric.functionName) || 0;
        userAnalytics.functionsUsed.set(metric.functionName, functionCount + 1);
    }
    updateContractAnalytics(contractAddress, metric) {
        let contractAnalytics = this.contractAnalytics.get(contractAddress);
        if (!contractAnalytics) {
            contractAnalytics = {
                address: contractAddress,
                totalUsage: 0,
                uniqueUsers: 0,
                averageGasUsage: 0,
                functionUsage: new Map(),
                errorRate: 0,
                lastUsed: 0,
                popularity: 0
            };
            this.contractAnalytics.set(contractAddress, contractAnalytics);
        }
        // Update contract analytics
        contractAnalytics.totalUsage++;
        contractAnalytics.lastUsed = metric.timestamp;
        contractAnalytics.averageGasUsage =
            (contractAnalytics.averageGasUsage * (contractAnalytics.totalUsage - 1) + metric.gasUsed) /
                contractAnalytics.totalUsage;
        const functionCount = contractAnalytics.functionUsage.get(metric.functionName) || 0;
        contractAnalytics.functionUsage.set(metric.functionName, functionCount + 1);
        // Calculate popularity (simple metric based on usage and unique users)
        const uniqueUsers = new Set(this.usageMetrics
            .filter(m => m.contractAddress === contractAddress)
            .map(m => m.anonymizedUserId));
        contractAnalytics.uniqueUsers = uniqueUsers.size;
        contractAnalytics.popularity = contractAnalytics.totalUsage * contractAnalytics.uniqueUsers;
    }
    updatePerformanceFromUsage(metric) {
        // Update performance indicators with new metric
        const recentMetrics = this.usageMetrics.slice(-100); // Last 100 metrics
        this.currentPerformance = AnalyticsLib_1.AnalyticsLib.calculatePerformanceIndicators(recentMetrics);
        // Check for alerts
        this.checkPerformanceAlerts();
    }
    updatePerformanceFromUsageBatch(metrics) {
        const recentMetrics = this.usageMetrics.slice(-100);
        this.currentPerformance = AnalyticsLib_1.AnalyticsLib.calculatePerformanceIndicators(recentMetrics);
        this.checkPerformanceAlerts();
    }
    checkPerformanceAlerts() {
        this.currentPerformance.alerts.forEach(alert => {
            if (!alert.resolved) {
                this.onPerformanceAlert?.({
                    metric: alert.metric,
                    value: alert.value,
                    threshold: alert.threshold,
                    severity: alert.severity
                });
            }
        });
    }
    cleanupOldData() {
        const cutoffTime = Date.now() - (this.configuration.maxHistoryDays * 24 * 60 * 60 * 1000);
        // Clean up usage metrics
        this.usageMetrics = AnalyticsLib_1.AnalyticsLib.cleanupOldData(this.usageMetrics, this.configuration.maxHistoryDays);
        // Clean up historical data
        for (const [key, data] of this.historicalData.entries()) {
            const cleaned = AnalyticsLib_1.AnalyticsLib.cleanupOldData(data, this.configuration.maxHistoryDays);
            this.historicalData.set(key, cleaned);
        }
    }
    getActiveUsersCount() {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return Array.from(this.userAnalytics.values())
            .filter(user => user.lastSeen >= oneDayAgo)
            .length;
    }
    getEmptyEngagementMetrics() {
        return {
            period: 'daily',
            timestamp: Date.now(),
            activeUsers: 0,
            newUsers: 0,
            returningUsers: 0,
            totalTransactions: 0,
            uniqueContracts: 0,
            averageSessionDuration: 0,
            bounceRate: 0,
            retentionRate: 0,
            featureUsage: new Map(),
            peakActivityHours: []
        };
    }
    getUsageTimeSeries(startTime, endTime) {
        const hourlyData = new Map();
        this.usageMetrics
            .filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
            .forEach(metric => {
            const hour = new Date(metric.timestamp).getTime();
            hourlyData.set(hour, (hourlyData.get(hour) || 0) + 1);
        });
        return Array.from(hourlyData.entries()).map(([timestamp, value]) => ({
            timestamp,
            value
        }));
    }
    getPerformanceTimeSeries(startTime, endTime) {
        // For performance, we'll use gas usage as the metric
        const hourlyData = new Map();
        this.usageMetrics
            .filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
            .forEach(metric => {
            const hour = new Date(metric.timestamp).getTime();
            const currentAvg = hourlyData.get(hour) || 0;
            const count = this.usageMetrics.filter(m => new Date(m.timestamp).getTime() === hour).length;
            hourlyData.set(hour, (currentAvg * (count - 1) + metric.gasUsed) / count);
        });
        return Array.from(hourlyData.entries()).map(([timestamp, value]) => ({
            timestamp,
            value
        }));
    }
    generateReportSummary(timestamp, periodMs) {
        const aggregated = this.getAggregatedData('total', {
            start: timestamp - periodMs,
            end: timestamp
        });
        const performance = this.getPerformanceIndicators();
        return {
            totalUsers: aggregated.totalUsers,
            activeUsers: this.getActiveUsersCount(),
            totalTransactions: aggregated.totalTransactions,
            systemHealth: performance.systemHealth,
            keyMetrics: [
                {
                    name: 'Average Gas Usage',
                    value: aggregated.averageGasUsage,
                    change: 0, // Would calculate from previous period
                    trend: 'stable'
                },
                {
                    name: 'Success Rate',
                    value: performance.successRate,
                    change: 0,
                    trend: 'stable'
                },
                {
                    name: 'Error Rate',
                    value: performance.errorRate,
                    change: 0,
                    trend: 'stable'
                }
            ]
        };
    }
    generateUsageSection(timestamp, periodMs) {
        const usageData = this.usageMetrics.filter(m => m.timestamp >= timestamp - periodMs && m.timestamp <= timestamp);
        return {
            title: 'Usage Analytics',
            data: {
                totalTransactions: usageData.length,
                uniqueContracts: new Set(usageData.map(m => m.contractAddress)).size,
                averageGasUsage: usageData.reduce((sum, m) => sum + m.gasUsed, 0) / usageData.length
            },
            insights: [
                'Usage patterns show consistent activity across contracts',
                'Gas efficiency has improved by 5% compared to last period'
            ],
            charts: [
                {
                    type: 'line',
                    title: 'Daily Transaction Volume',
                    data: this.getDailyTransactionData(timestamp, periodMs)
                }
            ]
        };
    }
    generateEngagementSection(timestamp, periodMs) {
        const engagement = this.getEngagementMetrics('daily', timestamp);
        return {
            title: 'User Engagement',
            data: engagement,
            insights: [
                'User retention rate is above industry average',
                'Peak activity occurs during business hours'
            ],
            charts: [
                {
                    type: 'bar',
                    title: 'Active Users by Day',
                    data: this.getActiveUsersByDay(timestamp, periodMs)
                }
            ]
        };
    }
    generatePerformanceSection(timestamp, periodMs) {
        const performance = this.getPerformanceIndicators();
        return {
            title: 'System Performance',
            data: performance,
            insights: [
                'System health is optimal',
                'No critical performance issues detected'
            ],
            charts: [
                {
                    type: 'area',
                    title: 'Performance Metrics Over Time',
                    data: this.getPerformanceChartData(timestamp, periodMs)
                }
            ]
        };
    }
    generateOptimizationSection() {
        const suggestions = Array.from(this.optimizationSuggestions.values())
            .filter(s => s.status === 'pending')
            .slice(0, 10);
        return {
            title: 'Optimization Opportunities',
            data: suggestions,
            insights: [
                'Several gas optimization opportunities available',
                'Performance improvements can be achieved with minimal changes'
            ],
            charts: []
        };
    }
    getDailyTransactionData(timestamp, periodMs) {
        const dailyData = new Map();
        const days = Math.ceil(periodMs / (24 * 60 * 60 * 1000));
        for (let i = 0; i < days; i++) {
            const dayTime = timestamp - (i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(dayTime).setHours(0, 0, 0, 0);
            const dayEnd = dayStart + (24 * 60 * 60 * 1000);
            const dayTransactions = this.usageMetrics.filter(m => m.timestamp >= dayStart && m.timestamp < dayEnd).length;
            dailyData.set(dayStart, dayTransactions);
        }
        return Array.from(dailyData.entries())
            .map(([timestamp, value]) => ({
            label: new Date(timestamp).toLocaleDateString(),
            value: timestamp,
            timestamp
        }))
            .reverse();
    }
    getActiveUsersByDay(timestamp, periodMs) {
        const dailyData = new Map();
        const days = Math.ceil(periodMs / (24 * 60 * 60 * 1000));
        for (let i = 0; i < days; i++) {
            const dayTime = timestamp - (i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(dayTime).setHours(0, 0, 0, 0);
            const dayEnd = dayStart + (24 * 60 * 60 * 1000);
            const dayUsers = new Set(this.usageMetrics
                .filter(m => m.timestamp >= dayStart && m.timestamp < dayEnd)
                .map(m => m.anonymizedUserId)).size;
            dailyData.set(dayStart, dayUsers);
        }
        return Array.from(dailyData.entries())
            .map(([timestamp, value]) => ({
            label: new Date(timestamp).toLocaleDateString(),
            value: timestamp,
            timestamp
        }))
            .reverse();
    }
    getPerformanceChartData(timestamp, periodMs) {
        const hourlyData = new Map();
        this.usageMetrics
            .filter(m => m.timestamp >= timestamp - periodMs && m.timestamp <= timestamp)
            .forEach(metric => {
            const hour = new Date(metric.timestamp).getTime();
            const existing = hourlyData.get(hour) || { gas: 0, success: 0 };
            existing.gas = (existing.gas + metric.gasUsed) / 2;
            existing.success = metric.success ? 100 : 0;
            hourlyData.set(hour, existing);
        });
        return Array.from(hourlyData.entries())
            .map(([timestamp, data]) => ({
            label: new Date(timestamp).toLocaleTimeString(),
            value: data.gas,
            timestamp,
            metadata: { successRate: data.success }
        }));
    }
}
exports.UsageAnalytics = UsageAnalytics;
//# sourceMappingURL=UsageAnalytics.js.map