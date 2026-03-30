import { ParticipationMetrics, DAOHealthMetrics } from '../structures/AnalyticsStructure';
import { PrivacySettings, UsageMetrics, EngagementMetrics, AggregatedData, UserAnalytics } from '../structures/UsageStructure';

export class AnalyticsLib {
    /**
     * Calculates the participation rate for a given proposal.
     */
    public static calculateParticipationRate(voterCount: number, totalTokenHolders: number): number {
        if (totalTokenHolders === 0) return 0;
        return (voterCount / totalTokenHolders) * 100;
    }

    /**
     * Calculates success percentage from total proposals.
     */
    public static calculateSuccessRate(successful: number, total: number): number {
        if (total === 0) return 0;
        return (successful / total) * 100;
    }

    /**
     * Aggregates metrics to produce a general health score.
     */
    public static calculateHealthScore(metrics: DAOHealthMetrics): number {
        // Weighted average of metrics
        const engagementWeight = 0.4;
        const successWeight = 0.3;
        const participationWeight = 0.3;

        const healthScore = (metrics.networkEngagement * engagementWeight) + 
                            (metrics.successRate * successWeight) + 
                            (metrics.averageParticipation * participationWeight);

        return Math.min(100, Math.max(0, healthScore));
    }

    /**
     * Anonymizes an address based on privacy settings.
     */
    public static anonymizeAddress(address: string, settings: PrivacySettings): string {
        if (settings.anonymizationLevel === 'none') return address;
        
        // Simple hash-like anonymization for simulation
        let hash = 0;
        for (let i = 0; i < address.length; i++) {
            const char = address.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `anon_${Math.abs(hash).toString(16)}`;
    }

    /**
     * Calculates trend from historical data.
     */
    public static calculateTrend(data: any[]): { trend: 'increasing' | 'decreasing' | 'stable', changePercentage: number, confidence: number } {
        if (data.length < 2) return { trend: 'stable', changePercentage: 0, confidence: 0 };
        
        const last = data[data.length - 1];
        const previous = data[data.length - 2];
        
        const lastVal = typeof last === 'number' ? last : (last.value || 0);
        const prevVal = typeof previous === 'number' ? previous : (previous.value || 0);
        
        if (prevVal === 0) return { trend: lastVal > 0 ? 'increasing' : 'stable', changePercentage: 0, confidence: 0.5 };

        const changePercentage = ((lastVal - prevVal) / prevVal) * 100;
        const confidence = Math.min(0.9, 0.5 + (data.length / 100));

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (changePercentage > 5) trend = 'increasing';
        else if (changePercentage < -5) trend = 'decreasing';

        return { trend, changePercentage, confidence };
    }

    /**
     * Calculates performance indicators from usage metrics.
     */
    public static calculatePerformanceIndicators(metrics: UsageMetrics[]): any {
        if (metrics.length === 0) return { averageGasUsage: 0, errorRate: 0 };
        
        const totalGas = metrics.reduce((sum, m) => sum + m.gasUsed, 0);
        const errorCount = metrics.filter(m => !m.success).length;
        
        return {
            averageGasUsage: totalGas / metrics.length,
            errorRate: (errorCount / metrics.length) * 100,
            successRate: ((metrics.length - errorCount) / metrics.length) * 100,
            timestamp: Date.now(),
            alerts: [] // Should be populated based on thresholds
        };
    }

    /**
     * Estimates gas savings from batching.
     */
    public static estimateBatchGasSavings(singleGas: number, batchSize: number): number {
        if (batchSize <= 1) return 0;
        const baseOverhead = 21000;
        const batchOverhead = 30000;
        
        const individualTotal = singleGas * batchSize;
        const batchedTotal = batchOverhead + ((singleGas - baseOverhead) * batchSize);
        
        return Math.max(0, ((individualTotal - batchedTotal) / individualTotal) * 100);
    }

    /**
     * Calculates optimal batch size based on costs.
     */
    public static calculateOptimalBatchSize(baseCost: number, perItemCost: number): number {
        // Simple heuristic: balance overhead vs processing time
        return Math.min(50, Math.max(2, Math.floor(baseCost / (perItemCost * 0.1))));
    }

    /**
     * Validates privacy settings compliance.
     */
    public static validatePrivacyCompliance(settings: PrivacySettings): boolean {
        // Ensure minimum requirements are met
        return settings.dataRetention <= 365 && 
               (!settings.dataCollection || settings.anonymizationLevel !== 'none');
    }

    /**
     * Cleans up old data based on retention policy.
     */
    public static cleanupOldData(data: any[], retentionDays: number): any[] {
        const now = Date.now();
        const cutoff = now - (retentionDays * 24 * 60 * 60 * 1000);
        return data.filter(item => item.timestamp >= cutoff);
    }

    /**
     * Calculates engagement metrics for a set of users.
     */
    public static calculateEngagementMetrics(userAnalytics: UserAnalytics[], period: 'daily' | 'weekly' | 'monthly', timestamp: number): EngagementMetrics {
        const activeUsers = userAnalytics.length;
        const totalTransactions = userAnalytics.reduce((sum, u) => sum + u.totalTransactions, 0);
        
        const uniqueContracts = new Set<string>();
        userAnalytics.forEach(u => u.contractsInteracted.forEach(c => uniqueContracts.add(c)));

        const featureUsage = new Map<string, number>();
        userAnalytics.forEach(u => {
            u.functionsUsed.forEach((count, func) => {
                featureUsage.set(func, (featureUsage.get(func) || 0) + count);
            });
        });

        return {
            period,
            timestamp,
            activeUsers,
            newUsers: userAnalytics.filter(u => u.firstSeen > timestamp - 86400000).length, // Simplified
            returningUsers: userAnalytics.filter(u => u.firstSeen <= timestamp - 86400000).length,
            totalTransactions,
            uniqueContracts: uniqueContracts.size,
            averageSessionDuration: 0, // Simplified
            bounceRate: 0,
            retentionRate: 0,
            featureUsage,
            peakActivityHours: []
        };
    }

    /**
     * Aggregates usage metrics.
     */
    public static aggregateUsageData(metrics: UsageMetrics[], timeRange?: { start: number; end: number }): AggregatedData {
        const filtered = timeRange 
            ? metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
            : metrics;

        const totalTransactions = filtered.length;
        if (totalTransactions === 0) {
            return {
                totalUsers: 0,
                activeUsers: 0,
                totalTransactions: 0,
                totalGasUsed: 0,
                averageGasUsage: 0,
                totalValue: 0,
                averageTransactionValue: 0,
                uniqueContracts: 0,
                topContracts: [],
                timeRange: timeRange || { start: 0, end: Date.now() },
                lastUpdated: Date.now()
            };
        }

        const totalGasUsed = filtered.reduce((sum, m) => sum + m.gasUsed, 0);
        const totalValue = filtered.reduce((sum, m) => sum + m.transactionValue, 0);
        const uniqueUsers = new Set(filtered.map(m => m.anonymizedUserId)).size;
        const uniqueContractsSet = new Set(filtered.map(m => m.contractAddress));

        const contractUsage = new Map<string, number>();
        filtered.forEach(m => contractUsage.set(m.contractAddress, (contractUsage.get(m.contractAddress) || 0) + 1));
        
        const topContracts = Array.from(contractUsage.entries())
            .map(([address, usage]) => ({ address, usage, percentage: (usage / totalTransactions) * 100 }))
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 5);

        return {
            totalUsers: uniqueUsers,
            activeUsers: uniqueUsers,
            totalTransactions,
            totalGasUsed,
            averageGasUsage: totalGasUsed / totalTransactions,
            totalValue,
            averageTransactionValue: totalValue / totalTransactions,
            uniqueContracts: uniqueContractsSet.size,
            topContracts,
            timeRange: timeRange || { start: filtered[0].timestamp, end: filtered[filtered.length - 1].timestamp },
            lastUpdated: Date.now()
        };
    }
}

