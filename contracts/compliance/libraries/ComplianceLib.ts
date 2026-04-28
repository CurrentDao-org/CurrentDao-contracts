import { ComplianceCheck, ComplianceStatus, ComplianceRule } from '../structures/ComplianceStructs';

export class ComplianceLib {
    static generateCheckId(transactionId: string, address: string, timestamp: number): string {
        return `CHK-${transactionId.slice(0, 8)}-${address.slice(0, 6)}-${timestamp}`;
    }

    static generateReportId(jurisdictionCode: string, reportType: string, timestamp: number): string {
        return `RPT-${jurisdictionCode}-${reportType}-${timestamp}`;
    }

    static generateAlertId(address: string, jurisdictionCode: string, timestamp: number): string {
        return `ALT-${address.slice(0, 6)}-${jurisdictionCode}-${timestamp}`;
    }

    /**
     * Evaluate a transaction against a set of rules.
     * Returns list of failed rule IDs.
     */
    static evaluateRules(rules: ComplianceRule[], transactionData: Record<string, unknown>): string[] {
        const failed: string[] = [];
        for (const rule of rules) {
            if (!rule.active) continue;
            // Minimal rule evaluation: parse ruleData as JSON constraints
            try {
                const constraints = JSON.parse(rule.ruleData) as Record<string, unknown>;
                for (const [key, value] of Object.entries(constraints)) {
                    if (transactionData[key] !== undefined && transactionData[key] !== value) {
                        failed.push(rule.id);
                        break;
                    }
                }
            } catch {
                // Unparseable rule data — skip
            }
        }
        return failed;
    }

    static isCompliant(check: ComplianceCheck): boolean {
        return check.status === ComplianceStatus.Compliant;
    }
}
