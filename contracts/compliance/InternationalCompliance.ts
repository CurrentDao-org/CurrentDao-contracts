import { IInternationalCompliance } from './interfaces/IInternationalCompliance';
import {
    Jurisdiction,
    JurisdictionType,
    ComplianceRule,
    ComplianceCheck,
    ComplianceStatus,
    RegulatoryReport,
    ComplianceAlert,
    AlertSeverity,
    AuditEntry
} from './structures/ComplianceStructs';
import { ComplianceLib } from './libraries/ComplianceLib';

/**
 * InternationalCompliance
 *
 * Global regulatory compliance framework covering 50+ jurisdictions.
 * Provides automated compliance checking, regulatory reporting,
 * audit trail, and real-time alerting (within 1 minute).
 */
export class InternationalCompliance implements IInternationalCompliance {
    private jurisdictions: Map<string, Jurisdiction> = new Map();
    private rules: Map<string, ComplianceRule> = new Map();
    private jurisdictionRules: Map<string, Set<string>> = new Map(); // jurisdictionCode => ruleIds
    private checks: Map<string, ComplianceCheck> = new Map();
    private reports: Map<string, RegulatoryReport> = new Map();
    private alerts: Map<string, ComplianceAlert> = new Map();
    private addressAlerts: Map<string, Set<string>> = new Map(); // address => alertIds
    private auditLog: AuditEntry[] = [];

    private owner: string;
    private ruleCount = 0;
    private checkCount = 0;
    private reportCount = 0;
    private alertCount = 0;
    private auditCount = 0;

    constructor(owner: string) {
        this.owner = owner;
    }

    // --- Jurisdiction management ---

    addJurisdiction(code: string, name: string, type: string, caller: string): void {
        this.onlyOwner(caller);
        if (this.jurisdictions.has(code)) throw new Error(`InternationalCompliance: jurisdiction ${code} already exists`);
        const jurisdiction: Jurisdiction = {
            code,
            name,
            type: type as JurisdictionType,
            active: true,
            ruleCount: 0,
            lastUpdated: Date.now()
        };
        this.jurisdictions.set(code, jurisdiction);
        this.jurisdictionRules.set(code, new Set());
        this.appendAudit(caller, 'ADD_JURISDICTION', `code=${code}`);
    }

    deactivateJurisdiction(code: string, caller: string): void {
        this.onlyOwner(caller);
        const j = this.getJurisdiction(code);
        j.active = false;
        j.lastUpdated = Date.now();
        this.appendAudit(caller, 'DEACTIVATE_JURISDICTION', `code=${code}`);
    }

    // --- Rule management ---

    addRule(jurisdictionCode: string, description: string, ruleData: string, caller: string): string {
        this.onlyOwner(caller);
        const j = this.getJurisdiction(jurisdictionCode);
        if (!j.active) throw new Error('InternationalCompliance: jurisdiction not active');

        const id = `RULE-${jurisdictionCode}-${this.ruleCount++}`;
        const rule: ComplianceRule = {
            id,
            jurisdictionCode,
            description,
            ruleData,
            active: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.rules.set(id, rule);
        this.jurisdictionRules.get(jurisdictionCode)!.add(id);
        j.ruleCount++;
        j.lastUpdated = Date.now();
        this.appendAudit(caller, 'ADD_RULE', `ruleId=${id}`);
        return id;
    }

    updateRule(ruleId: string, ruleData: string, caller: string): void {
        this.onlyOwner(caller);
        const rule = this.getRule(ruleId);
        rule.ruleData = ruleData;
        rule.updatedAt = Date.now();
        this.appendAudit(caller, 'UPDATE_RULE', `ruleId=${ruleId}`);
    }

    deactivateRule(ruleId: string, caller: string): void {
        this.onlyOwner(caller);
        const rule = this.getRule(ruleId);
        rule.active = false;
        rule.updatedAt = Date.now();
        this.appendAudit(caller, 'DEACTIVATE_RULE', `ruleId=${ruleId}`);
    }

    // --- Compliance checking ---

    checkCompliance(
        transactionId: string,
        address: string,
        jurisdictionCode: string,
        transactionData: Record<string, unknown>
    ): ComplianceCheck {
        const j = this.getJurisdiction(jurisdictionCode);
        if (!j.active) throw new Error('InternationalCompliance: jurisdiction not active');

        const rules = this.getJurisdictionRules(jurisdictionCode);
        const failedRules = ComplianceLib.evaluateRules(rules, transactionData);
        const status = failedRules.length === 0 ? ComplianceStatus.Compliant : ComplianceStatus.NonCompliant;

        const checkId = ComplianceLib.generateCheckId(transactionId, address, Date.now() + this.checkCount++);
        const check: ComplianceCheck = {
            id: checkId,
            transactionId,
            address,
            jurisdictionCode,
            status,
            failedRules,
            checkedAt: Date.now()
        };
        this.checks.set(checkId, check);

        // Auto-alert on non-compliance
        if (status === ComplianceStatus.NonCompliant) {
            this.createAlert(address, jurisdictionCode, AlertSeverity.High,
                `Non-compliant transaction ${transactionId}: failed rules [${failedRules.join(', ')}]`);
        }

        return check;
    }

    batchCheckCompliance(
        transactionIds: string[],
        addresses: string[],
        jurisdictionCodes: string[],
        transactionDataList: Record<string, unknown>[]
    ): ComplianceCheck[] {
        const len = transactionIds.length;
        if (addresses.length !== len || jurisdictionCodes.length !== len || transactionDataList.length !== len) {
            throw new Error('InternationalCompliance: array length mismatch');
        }
        return transactionIds.map((txId, i) =>
            this.checkCompliance(txId, addresses[i], jurisdictionCodes[i], transactionDataList[i])
        );
    }

    // --- Reporting ---

    generateReport(
        jurisdictionCode: string,
        reportType: string,
        periodStart: number,
        periodEnd: number,
        caller: string
    ): string {
        this.onlyOwner(caller);
        const j = this.getJurisdiction(jurisdictionCode);

        // Collect checks for this jurisdiction in the period
        const relevantChecks = Array.from(this.checks.values()).filter(
            c => c.jurisdictionCode === jurisdictionCode &&
                c.checkedAt >= periodStart && c.checkedAt <= periodEnd
        );
        const data = JSON.stringify({
            jurisdictionCode,
            reportType,
            periodStart,
            periodEnd,
            totalChecks: relevantChecks.length,
            compliantCount: relevantChecks.filter(c => c.status === ComplianceStatus.Compliant).length,
            nonCompliantCount: relevantChecks.filter(c => c.status === ComplianceStatus.NonCompliant).length
        });

        const reportId = ComplianceLib.generateReportId(jurisdictionCode, reportType, Date.now() + this.reportCount++);
        const report: RegulatoryReport = {
            id: reportId,
            jurisdictionCode,
            reportType,
            periodStart,
            periodEnd,
            data,
            generatedAt: Date.now(),
            submittedAt: 0
        };
        this.reports.set(reportId, report);
        this.appendAudit(caller, 'GENERATE_REPORT', `reportId=${reportId}`);
        return reportId;
    }

    submitReport(reportId: string, caller: string): void {
        this.onlyOwner(caller);
        const report = this.getReport(reportId);
        if (report.submittedAt > 0) throw new Error('InternationalCompliance: report already submitted');
        report.submittedAt = Date.now();
        this.appendAudit(caller, 'SUBMIT_REPORT', `reportId=${reportId}`);
    }

    // --- Alerts ---

    resolveAlert(alertId: string, caller: string): void {
        this.onlyOwner(caller);
        const alert = this.getAlert(alertId);
        alert.resolved = true;
        this.appendAudit(caller, 'RESOLVE_ALERT', `alertId=${alertId}`);
    }

    // --- Queries ---

    getJurisdiction(code: string): Jurisdiction {
        const j = this.jurisdictions.get(code);
        if (!j) throw new Error(`InternationalCompliance: jurisdiction ${code} not found`);
        return j;
    }

    getRule(ruleId: string): ComplianceRule {
        const r = this.rules.get(ruleId);
        if (!r) throw new Error(`InternationalCompliance: rule ${ruleId} not found`);
        return r;
    }

    getCheck(checkId: string): ComplianceCheck {
        const c = this.checks.get(checkId);
        if (!c) throw new Error(`InternationalCompliance: check ${checkId} not found`);
        return c;
    }

    getReport(reportId: string): RegulatoryReport {
        const r = this.reports.get(reportId);
        if (!r) throw new Error(`InternationalCompliance: report ${reportId} not found`);
        return r;
    }

    getAlert(alertId: string): ComplianceAlert {
        const a = this.alerts.get(alertId);
        if (!a) throw new Error(`InternationalCompliance: alert ${alertId} not found`);
        return a;
    }

    getActiveAlerts(address: string): ComplianceAlert[] {
        const ids = this.addressAlerts.get(address) ?? new Set<string>();
        return Array.from(ids)
            .map(id => this.alerts.get(id)!)
            .filter(a => a && !a.resolved);
    }

    getJurisdictionRules(jurisdictionCode: string): ComplianceRule[] {
        const ids = this.jurisdictionRules.get(jurisdictionCode) ?? new Set<string>();
        return Array.from(ids).map(id => this.rules.get(id)!).filter(Boolean);
    }

    getComplianceStatus(address: string, jurisdictionCode: string): ComplianceStatus {
        // Return status of the most recent check for this address+jurisdiction
        const checks = Array.from(this.checks.values())
            .filter(c => c.address === address && c.jurisdictionCode === jurisdictionCode)
            .sort((a, b) => b.checkedAt - a.checkedAt);
        return checks.length > 0 ? checks[0].status : ComplianceStatus.Pending;
    }

    totalJurisdictions(): number {
        return this.jurisdictions.size;
    }

    // --- Helpers ---

    private onlyOwner(caller: string): void {
        if (caller !== this.owner) throw new Error('InternationalCompliance: only owner');
    }

    private createAlert(address: string, jurisdictionCode: string, severity: AlertSeverity, message: string): void {
        const id = ComplianceLib.generateAlertId(address, jurisdictionCode, Date.now() + this.alertCount++);
        const alert: ComplianceAlert = {
            id,
            address,
            jurisdictionCode,
            severity,
            message,
            resolved: false,
            createdAt: Date.now()
        };
        this.alerts.set(id, alert);
        if (!this.addressAlerts.has(address)) this.addressAlerts.set(address, new Set());
        this.addressAlerts.get(address)!.add(id);
    }

    private appendAudit(actor: string, action: string, details: string): void {
        this.auditLog.push({
            id: `AUD-${this.auditCount++}`,
            actor,
            action,
            details,
            timestamp: Date.now()
        });
    }
}
