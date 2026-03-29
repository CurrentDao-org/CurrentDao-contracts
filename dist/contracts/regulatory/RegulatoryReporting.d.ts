import { IRegulatoryReporting, ComplianceReport, Requirement, Jurisdiction } from "./interfaces/IRegulatoryReporting";
export declare class RegulatoryReporting implements IRegulatoryReporting {
    private reports;
    private tracker;
    private generator;
    private submitter;
    constructor();
    generateReport(period: string): Promise<ComplianceReport>;
    trackRequirement(requirement: Requirement): void;
    updateRequirement(requirementId: string, updates: Partial<Requirement>): void;
    removeRequirement(requirementId: string): void;
    collectComplianceData(): Promise<any>;
    formatReport(report: ComplianceReport, standard: string): string;
    submitReport(reportId: string): Promise<boolean>;
    getHistoricalReports(period?: string, jurisdiction?: Jurisdiction): Promise<ComplianceReport[]>;
    getAuditData(reportId: string): Promise<any>;
}
//# sourceMappingURL=RegulatoryReporting.d.ts.map