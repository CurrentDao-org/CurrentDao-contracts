import { InternationalCompliance } from './InternationalCompliance';
import { ComplianceStatus, JurisdictionType, AlertSeverity } from './structures/ComplianceStructs';

describe('InternationalCompliance', () => {
    let compliance: InternationalCompliance;
    const owner = 'owner-address';
    const user = 'user-address';

    beforeEach(() => {
        compliance = new InternationalCompliance(owner);
        compliance.addJurisdiction('US', 'United States', JurisdictionType.National, owner);
        compliance.addJurisdiction('EU', 'European Union', JurisdictionType.International, owner);
    });

    describe('Jurisdiction management', () => {
        it('adds jurisdictions', () => {
            expect(compliance.totalJurisdictions()).toBe(2);
            const j = compliance.getJurisdiction('US');
            expect(j.name).toBe('United States');
            expect(j.active).toBe(true);
        });

        it('deactivates a jurisdiction', () => {
            compliance.deactivateJurisdiction('US', owner);
            expect(compliance.getJurisdiction('US').active).toBe(false);
        });

        it('rejects duplicate jurisdiction', () => {
            expect(() => compliance.addJurisdiction('US', 'US2', JurisdictionType.National, owner)).toThrow('already exists');
        });

        it('rejects non-owner adding jurisdiction', () => {
            expect(() => compliance.addJurisdiction('UK', 'UK', JurisdictionType.National, user)).toThrow('only owner');
        });
    });

    describe('Rule management', () => {
        it('adds and retrieves rules', () => {
            const ruleId = compliance.addRule('US', 'KYC required', '{"kyc":true}', owner);
            const rule = compliance.getRule(ruleId);
            expect(rule.jurisdictionCode).toBe('US');
            expect(rule.active).toBe(true);
        });

        it('updates a rule', () => {
            const ruleId = compliance.addRule('US', 'KYC', '{"kyc":true}', owner);
            compliance.updateRule(ruleId, '{"kyc":true,"aml":true}', owner);
            expect(compliance.getRule(ruleId).ruleData).toBe('{"kyc":true,"aml":true}');
        });

        it('deactivates a rule', () => {
            const ruleId = compliance.addRule('US', 'KYC', '{"kyc":true}', owner);
            compliance.deactivateRule(ruleId, owner);
            expect(compliance.getRule(ruleId).active).toBe(false);
        });
    });

    describe('Compliance checking', () => {
        it('marks transaction as compliant when all rules pass', () => {
            compliance.addRule('US', 'KYC', '{"kyc":true}', owner);
            const check = compliance.checkCompliance('tx-1', user, 'US', { kyc: true });
            expect(check.status).toBe(ComplianceStatus.Compliant);
            expect(check.failedRules).toHaveLength(0);
        });

        it('marks transaction as non-compliant when rules fail', () => {
            compliance.addRule('US', 'KYC', '{"kyc":true}', owner);
            const check = compliance.checkCompliance('tx-2', user, 'US', { kyc: false });
            expect(check.status).toBe(ComplianceStatus.NonCompliant);
            expect(check.failedRules.length).toBeGreaterThan(0);
        });

        it('batch checks multiple transactions', () => {
            compliance.addRule('EU', 'GDPR', '{"gdpr":true}', owner);
            const checks = compliance.batchCheckCompliance(
                ['tx-3', 'tx-4'],
                [user, user],
                ['EU', 'EU'],
                [{ gdpr: true }, { gdpr: false }]
            );
            expect(checks[0].status).toBe(ComplianceStatus.Compliant);
            expect(checks[1].status).toBe(ComplianceStatus.NonCompliant);
        });

        it('creates alert on non-compliance', () => {
            compliance.addRule('US', 'KYC', '{"kyc":true}', owner);
            compliance.checkCompliance('tx-5', user, 'US', { kyc: false });
            const alerts = compliance.getActiveAlerts(user);
            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].severity).toBe(AlertSeverity.High);
        });
    });

    describe('Regulatory reporting', () => {
        it('generates and submits a report', () => {
            const reportId = compliance.generateReport('US', 'QUARTERLY', 0, Date.now(), owner);
            compliance.submitReport(reportId, owner);
            const report = compliance.getReport(reportId);
            expect(report.submittedAt).toBeGreaterThan(0);
        });

        it('rejects double submission', () => {
            const reportId = compliance.generateReport('US', 'QUARTERLY', 0, Date.now(), owner);
            compliance.submitReport(reportId, owner);
            expect(() => compliance.submitReport(reportId, owner)).toThrow('already submitted');
        });
    });

    describe('Alert management', () => {
        it('resolves an alert', () => {
            compliance.addRule('US', 'KYC', '{"kyc":true}', owner);
            compliance.checkCompliance('tx-6', user, 'US', { kyc: false });
            const alerts = compliance.getActiveAlerts(user);
            compliance.resolveAlert(alerts[0].id, owner);
            expect(compliance.getActiveAlerts(user)).toHaveLength(0);
        });
    });

    describe('Compliance status', () => {
        it('returns pending for unknown address', () => {
            expect(compliance.getComplianceStatus('unknown', 'US')).toBe(ComplianceStatus.Pending);
        });

        it('returns latest status', () => {
            compliance.addRule('US', 'KYC', '{"kyc":true}', owner);
            compliance.checkCompliance('tx-7', user, 'US', { kyc: true });
            expect(compliance.getComplianceStatus(user, 'US')).toBe(ComplianceStatus.Compliant);
        });
    });
});
