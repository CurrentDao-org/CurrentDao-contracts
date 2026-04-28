import { ComplianceData, RegulatoryReport, ReportingFrequency, ComplianceInsight } from '../structures/ReportingStructs';

export class ReportingLib {
    // 7+ years in milliseconds
    static readonly ARCHIVE_RETENTION_MS = 7 * 365 * 24 * 60 * 60 * 1000;

    static generateReportId(entityId: string, period: string, type: string, nonce: number): string {
        return `report_${entityId}_${period}_${type}_${nonce}`;
    }

    /**
     * Validates compliance data and returns a score (0-100).
     * Target: 99.9% verification rate.
     */
    static validateComplianceData(data: ComplianceData): number {
        let score = 100;

        if (data.energyProduced < 0) score -= 30;
        if (data.energyConsumed < 0) score -= 30;
        if (data.co2Emissions < 0) score -= 30;
        if (data.renewablePercentage < 0 || data.renewablePercentage > 100) score -= 30;
        if (data.gridUptime < 0 || data.gridUptime > 100) score -= 30;
        if (!data.entityId || !data.period) score -= 20;

        return Math.max(0, score);
    }

    /**
     * Generates a content hash for archival integrity (7+ year retention).
     */
    static generateArchiveHash(report: Partial<RegulatoryReport>): string {
        const content = JSON.stringify({
            id: report.id,
            entityId: report.entityId,
            period: report.period,
            type: report.type,
            data: report.data,
            createdAt: report.createdAt,
        });
        // Simple deterministic hash for archival
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
        }
        return `0x${Math.abs(hash).toString(16).padStart(8, '0')}`;
    }

    static getNextDueDate(frequency: ReportingFrequency, from: number = Date.now()): number {
        const ms = {
            [ReportingFrequency.DAILY]: 24 * 60 * 60 * 1000,
            [ReportingFrequency.WEEKLY]: 7 * 24 * 60 * 60 * 1000,
            [ReportingFrequency.MONTHLY]: 30 * 24 * 60 * 60 * 1000,
            [ReportingFrequency.QUARTERLY]: 90 * 24 * 60 * 60 * 1000,
            [ReportingFrequency.ANNUAL]: 365 * 24 * 60 * 60 * 1000,
        };
        return from + ms[frequency];
    }

    static generateInsights(data: ComplianceData): ComplianceInsight {
        const recommendations: string[] = [];
        let score = 100;

        if (data.renewablePercentage < 50) {
            recommendations.push('Increase renewable energy share to above 50%');
            score -= 20;
        }
        if (data.co2Emissions > data.energyProduced * 0.5) {
            recommendations.push('Reduce CO2 emissions per kWh produced');
            score -= 15;
        }
        if (data.gridUptime < 99.9) {
            recommendations.push('Improve grid uptime to meet 99.9% target');
            score -= 10;
        }

        const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : 'HIGH';

        return {
            entityId: data.entityId,
            period: data.period,
            complianceScore: Math.max(0, score),
            recommendations,
            riskLevel,
            generatedAt: Date.now(),
        };
    }
}
