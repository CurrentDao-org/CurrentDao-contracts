import { RegulatoryReporting } from './RegulatoryReporting';
import { ReportType, ReportStatus, ReportingFrequency } from './structures/ReportingStructs';

describe('RegulatoryReporting', () => {
    let reporting: RegulatoryReporting;
    const owner = 'owner';
    const entityId = 'entity1';
    const period = '2026-Q1';

    const validData = {
        entityId,
        period,
        energyProduced: 10000,
        energyConsumed: 8000,
        co2Emissions: 500,
        renewablePercentage: 75,
        gridUptime: 99.95,
        metadata: { region: 'US-WEST' },
    };

    const schedule = {
        entityId,
        reportType: ReportType.COMPLIANCE,
        frequency: ReportingFrequency.QUARTERLY,
        regulatorId: 'EPA',
        nextDue: Date.now() + 90 * 24 * 60 * 60 * 1000,
    };

    beforeEach(() => {
        reporting = new RegulatoryReporting(owner);
        reporting.registerRegulatorApi('EPA', 'https://api.epa.gov/submit', owner);
    });

    describe('collectComplianceData', () => {
        it('collects valid compliance data', () => {
            const key = reporting.collectComplianceData(entityId, period, validData, owner);
            expect(key).toBe(`${entityId}_${period}`);
        });

        it('rejects invalid data (negative values)', () => {
            expect(() =>
                reporting.collectComplianceData(entityId, period, { ...validData, energyProduced: -1 }, owner)
            ).toThrow();
        });

        it('rejects unauthorized submitter', () => {
            expect(() =>
                reporting.collectComplianceData(entityId, period, validData, 'hacker')
            ).toThrow();
        });
    });

    describe('generateReport', () => {
        beforeEach(() => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            reporting.registerSchedule(schedule, owner);
        });

        it('generates a report in DRAFT status', () => {
            const id = reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            const report = reporting.getReport(id);
            expect(report.status).toBe(ReportStatus.DRAFT);
            expect(report.entityId).toBe(entityId);
            expect(report.archiveHash).toBeTruthy();
        });

        it('archives report immediately on generation', () => {
            const id = reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            expect(reporting.getArchiveReport(id)).toBeDefined();
        });

        it('rejects generation without compliance data', () => {
            expect(() =>
                reporting.generateReport(entityId, '2025-Q4', ReportType.COMPLIANCE, owner)
            ).toThrow();
        });
    });

    describe('validateReport', () => {
        it('validates report and returns score >= 99', () => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            const id = reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            const score = reporting.validateReport(id, owner);
            expect(score).toBeGreaterThanOrEqual(99);
            expect(reporting.getReport(id).status).toBe(ReportStatus.VALIDATED);
        });

        it('rejects validation of non-draft report', () => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            const id = reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            reporting.validateReport(id, owner);
            expect(() => reporting.validateReport(id, owner)).toThrow();
        });
    });

    describe('submitReport', () => {
        it('submits validated report', () => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            reporting.registerSchedule(schedule, owner);
            const id = reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            reporting.validateReport(id, owner);
            reporting.submitReport(id, owner);
            expect(reporting.getReport(id).status).toBe(ReportStatus.SUBMITTED);
        });

        it('rejects submission of unvalidated report', () => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            const id = reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            expect(() => reporting.submitReport(id, owner)).toThrow();
        });
    });

    describe('getReportsByEntity', () => {
        it('returns all reports for entity', () => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            reporting.generateReport(entityId, period, ReportType.EMISSIONS, owner);
            expect(reporting.getReportsByEntity(entityId)).toHaveLength(2);
        });
    });

    describe('getComplianceInsights', () => {
        it('generates insights with recommendations', () => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            const insights = reporting.getComplianceInsights(entityId, period);
            expect(insights.complianceScore).toBeGreaterThan(0);
            expect(insights.riskLevel).toBeDefined();
        });

        it('flags low renewable percentage', () => {
            reporting.collectComplianceData(entityId, period, { ...validData, renewablePercentage: 20 }, owner);
            const insights = reporting.getComplianceInsights(entityId, period);
            expect(insights.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('archive', () => {
        it('archive grows with each report', () => {
            reporting.collectComplianceData(entityId, period, validData, owner);
            reporting.generateReport(entityId, period, ReportType.COMPLIANCE, owner);
            expect(reporting.getArchiveSize()).toBeGreaterThanOrEqual(1);
        });
    });

    describe('registerSchedule', () => {
        it('registers a reporting schedule', () => {
            reporting.registerSchedule(schedule, owner);
            const s = reporting.getSchedule(entityId, ReportType.COMPLIANCE);
            expect(s.frequency).toBe(ReportingFrequency.QUARTERLY);
        });

        it('rejects non-owner', () => {
            expect(() => reporting.registerSchedule(schedule, 'hacker')).toThrow();
        });
    });
});
