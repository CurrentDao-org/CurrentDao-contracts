import { RegulatoryReport, RegulatorySchedule, ComplianceData, ComplianceInsight, ReportType, ReportingFrequency } from '../structures/ReportingStructs';

export interface IRegulatoryReporting {
    registerSchedule(schedule: RegulatorySchedule, caller: string): void;

    collectComplianceData(entityId: string, period: string, data: ComplianceData, caller: string): string;

    generateReport(entityId: string, period: string, type: ReportType, caller: string): string;

    validateReport(reportId: string, caller: string): number; // returns validation score

    submitReport(reportId: string, caller: string): void;

    getReport(reportId: string): RegulatoryReport;

    getReportsByEntity(entityId: string): RegulatoryReport[];

    getSchedule(entityId: string, reportType: ReportType): RegulatorySchedule;

    getDueReports(): RegulatoryReport[];

    getComplianceInsights(entityId: string, period: string): ComplianceInsight;

    getArchiveReport(reportId: string): RegulatoryReport; // 7+ year archive access
}
