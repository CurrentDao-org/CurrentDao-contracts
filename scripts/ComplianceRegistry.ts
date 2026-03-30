import { IComplianceRegistry } from './interfaces/IComplianceRegistry';
import { ComplianceLib } from './libraries/ComplianceLib';
import { AutomatedChecker } from './checking/AutomatedChecker';
import { ComplianceReporter } from './reporting/ComplianceReporter';
import { ComplianceCertifier } from './certification/ComplianceCertifier';

export class ComplianceRegistry implements IComplianceRegistry {
  private requirements: string[] = ComplianceLib.getInitialRequirements();
  private userStatus: Record<string, Record<string, boolean>> = {};
  private auditTrail: any[] = [];
  private lastUpdate: number = Date.now();

  updateUserStatus(user: string, reqId: string, status: boolean): void {
    if (!this.userStatus[user]) this.userStatus[user] = {};
    this.userStatus[user][reqId] = status;
    this.auditTrail.push({ user, reqId, status, timestamp: Date.now() });
  }

  checkCompliance(user: string): boolean {
    if (!this.userStatus[user]) return false;
    return AutomatedChecker.check(this.userStatus[user], this.requirements);
  }

  applyRegulatoryUpdate(reqId: string, description: string): void {
    if (Date.now() - this.lastUpdate > 24 * 60 * 60 * 1000) {
      throw new Error("Updates must be applied within 24 hours of change.");
    }
    if (!this.requirements.includes(reqId)) {
      this.requirements.push(reqId);
    }
    this.auditTrail.push({ action: 'REGULATORY_UPDATE', reqId, description, timestamp: Date.now() });
    this.lastUpdate = Date.now();
  }

  generateQuarterlyReport(): object {
    return ComplianceReporter.generate(this.auditTrail);
  }

  certifyUser(user: string): string {
    const isCompliant = this.checkCompliance(user);
    const cert = ComplianceCertifier.certify(isCompliant, user);
    this.auditTrail.push({ action: 'CERTIFIED', user, cert, timestamp: Date.now() });
    return cert;
  }

  getAuditTrail(): any[] { return this.auditTrail; }
}