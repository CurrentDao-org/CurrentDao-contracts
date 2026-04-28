import {
    Jurisdiction,
    ComplianceRule,
    ComplianceCheck,
    RegulatoryReport,
    ComplianceAlert,
    ComplianceStatus
} from '../structures/ComplianceStructs';

export interface IInternationalCompliance {
    // Jurisdiction management
    addJurisdiction(code: string, name: string, type: string, caller: string): void;
    deactivateJurisdiction(code: string, caller: string): void;

    // Rule management
    addRule(jurisdictionCode: string, description: string, ruleData: string, caller: string): string;
    updateRule(ruleId: string, ruleData: string, caller: string): void;
    deactivateRule(ruleId: string, caller: string): void;

    // Compliance checking
    checkCompliance(
        transactionId: string,
        address: string,
        jurisdictionCode: string,
        transactionData: Record<string, unknown>
    ): ComplianceCheck;

    batchCheckCompliance(
        transactionIds: string[],
        addresses: string[],
        jurisdictionCodes: string[],
        transactionDataList: Record<string, unknown>[]
    ): ComplianceCheck[];

    // Reporting
    generateReport(
        jurisdictionCode: string,
        reportType: string,
        periodStart: number,
        periodEnd: number,
        caller: string
    ): string;

    submitReport(reportId: string, caller: string): void;

    // Alerts
    resolveAlert(alertId: string, caller: string): void;

    // Queries
    getJurisdiction(code: string): Jurisdiction;
    getRule(ruleId: string): ComplianceRule;
    getCheck(checkId: string): ComplianceCheck;
    getReport(reportId: string): RegulatoryReport;
    getAlert(alertId: string): ComplianceAlert;
    getActiveAlerts(address: string): ComplianceAlert[];
    getJurisdictionRules(jurisdictionCode: string): ComplianceRule[];
    getComplianceStatus(address: string, jurisdictionCode: string): ComplianceStatus;
    totalJurisdictions(): number;
}
