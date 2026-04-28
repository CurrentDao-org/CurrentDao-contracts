import { IRegulatoryReporting } from './interfaces/IRegulatoryReporting';
import { RegulatoryReport, RegulatorySchedule, ComplianceData, ComplianceInsight, ReportType, ReportStatus, ReportingFrequency } from './structures/ReportingStructs';
import { ReportingLib } from './libraries/ReportingLib';

/**
 * RegulatoryReporting - Automated regulatory reporting with compliance data collection,
 * report generation, automated submission, validation, 7+ year archive, and analytics.
 * Resolves issue #101.
 */
export class RegulatoryReporting implements IRegulatoryReporting {
    private reports: Map<string, RegulatoryReport> = new Map();
    private archive: Map<string, RegulatoryReport> = new Map(); // 7+ year retention
    private schedules: Map<string, RegulatorySchedule> = new Map(); // key: entityId_reportType
    private complianceData: Map<string, ComplianceData> = new Map(); // key: entityId_period
    private authorizedSubmitters: Set<string> = new Set();
    private regulatorApis: Map<string, string> = new Map(); // regulatorId => endpoint
    private owner: string;
    private nonce: number = 0;

    constructor(owner: string) {
        this.owner = owner;
        this.authorizedSubmitters.add(owner);
    }

    // --- Configuration ---

    public addAuthorizedSubmitter(submitter: string, caller: string): void {
        this.onlyOwner(caller);
        this.authorizedSubmitters.add(submitter);
    }

    public registerRegulatorApi(regulatorId: string, endpoint: string, caller: string): void {
        this.onlyOwner(caller);
        this.regulatorApis.set(regulatorId, endpoint);
    }

    public registerSchedule(schedule: RegulatorySchedule, caller: string): void {
        this.onlyOwner(caller);
        const key = `${schedule.entityId}_${schedule.reportType}`;
        schedule.nextDue = ReportingLib.getNextDueDate(schedule.frequency);
        this.schedules.set(key, schedule);
    }

    // --- Data Collection ---

    public collectComplianceData(
        entityId: string,
        period: string,
        data: ComplianceData,
        caller: string
    ): string {
        if (!this.authorizedSubmitters.has(caller)) {
            throw new Error('RegulatoryReporting: unauthorized data submitter');
        }
        if (data.entityId !== entityId) throw new Error('RegulatoryReporting: entity ID mismatch');

        const score = ReportingLib.validateComplianceData(data);
        if (score < 80) throw new Error(`RegulatoryReporting: data validation failed (score: ${score})`);

        const key = `${entityId}_${period}`;
        this.complianceData.set(key, data);
        return key;
    }

    // --- Report Generation ---

    public generateReport(
        entityId: string,
        period: string,
        type: ReportType,
        caller: string
    ): string {
        if (!this.authorizedSubmitters.has(caller)) {
            throw new Error('RegulatoryReporting: unauthorized');
        }

        const dataKey = `${entityId}_${period}`;
        const data = this.complianceData.get(dataKey);
        if (!data) throw new Error('RegulatoryReporting: no compliance data for period');

        const scheduleKey = `${entityId}_${type}`;
        const schedule = this.schedules.get(scheduleKey);
        const regulatorId = schedule?.regulatorId ?? 'default';

        const id = ReportingLib.generateReportId(entityId, period, type, this.nonce++);
        const report: RegulatoryReport = {
            id,
            type,
            entityId,
            period,
            data,
            status: ReportStatus.DRAFT,
            createdAt: Date.now(),
            regulatorId,
            validationScore: 0,
            submissionDeadline: schedule?.nextDue ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
            archiveHash: '',
        };

        report.archiveHash = ReportingLib.generateArchiveHash(report);
        this.reports.set(id, report);
        this.archive.set(id, { ...report }); // archive immediately for 7+ year retention

        return id;
    }

    // --- Validation ---

    public validateReport(reportId: string, caller: string): number {
        if (!this.authorizedSubmitters.has(caller)) {
            throw new Error('RegulatoryReporting: unauthorized');
        }

        const report = this.requireReport(reportId);
        if (report.status !== ReportStatus.DRAFT) {
            throw new Error('RegulatoryReporting: report not in draft state');
        }

        const score = ReportingLib.validateComplianceData(report.data);
        report.validationScore = score;
        report.status = ReportStatus.VALIDATED;
        report.validatedAt = Date.now();
        this.reports.set(reportId, report);
        this.archive.set(reportId, { ...report });

        return score;
    }

    // --- Submission ---

    public submitReport(reportId: string, caller: string): void {
        if (!this.authorizedSubmitters.has(caller)) {
            throw new Error('RegulatoryReporting: unauthorized');
        }

        const report = this.requireReport(reportId);
        if (report.status !== ReportStatus.VALIDATED) {
            throw new Error('RegulatoryReporting: report must be validated before submission');
        }
        if (report.validationScore < 99) {
            throw new Error('RegulatoryReporting: validation score below 99 threshold');
        }

        // Simulate API submission to regulator
        const endpoint = this.regulatorApis.get(report.regulatorId);
        if (!endpoint && report.regulatorId !== 'default') {
            throw new Error(`RegulatoryReporting: no API registered for regulator ${report.regulatorId}`);
        }

        report.status = ReportStatus.SUBMITTED;
        report.submittedAt = Date.now();
        this.reports.set(reportId, report);
        this.archive.set(reportId, { ...report });

        // Update schedule next due date
        const scheduleKey = `${report.entityId}_${report.type}`;
        const schedule = this.schedules.get(scheduleKey);
        if (schedule) {
            schedule.lastSubmitted = Date.now();
            schedule.nextDue = ReportingLib.getNextDueDate(schedule.frequency);
            this.schedules.set(scheduleKey, schedule);
        }
    }

    // --- Queries ---

    public getReport(reportId: string): RegulatoryReport {
        return this.requireReport(reportId);
    }

    public getReportsByEntity(entityId: string): RegulatoryReport[] {
        return Array.from(this.reports.values()).filter(r => r.entityId === entityId);
    }

    public getSchedule(entityId: string, reportType: ReportType): RegulatorySchedule {
        const key = `${entityId}_${reportType}`;
        const schedule = this.schedules.get(key);
        if (!schedule) throw new Error(`RegulatoryReporting: schedule not found for ${key}`);
        return schedule;
    }

    public getDueReports(): RegulatoryReport[] {
        const now = Date.now();
        return Array.from(this.reports.values()).filter(
            r => r.status !== ReportStatus.SUBMITTED &&
                 r.status !== ReportStatus.ACCEPTED &&
                 r.submissionDeadline <= now
        );
    }

    public getComplianceInsights(entityId: string, period: string): ComplianceInsight {
        const key = `${entityId}_${period}`;
        const data = this.complianceData.get(key);
        if (!data) throw new Error('RegulatoryReporting: no data for insights');
        return ReportingLib.generateInsights(data);
    }

    public getArchiveReport(reportId: string): RegulatoryReport {
        const report = this.archive.get(reportId);
        if (!report) throw new Error(`RegulatoryReporting: archived report ${reportId} not found`);
        return report;
    }

    public getArchiveSize(): number {
        return this.archive.size;
    }

    // --- Private Helpers ---

    private requireReport(reportId: string): RegulatoryReport {
        const report = this.reports.get(reportId);
        if (!report) throw new Error(`RegulatoryReporting: report ${reportId} not found`);
        return report;
    }

    private onlyOwner(caller: string): void {
        if (caller !== this.owner) throw new Error('RegulatoryReporting: only owner');
    }
}
