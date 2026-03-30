import { IMultiFactorAuth } from './interfaces/IMultiFactorAuth';
import { FactorManager } from './factors/FactorManager';
import { FactorVerifier } from './verification/FactorVerifier';
import { RecoveryMechanism } from './recovery/RecoveryMechanism';

export class MultiFactorAuth implements IMultiFactorAuth {
  private userFactors: Record<string, Record<string, string>> = {};
  private recoveryKeys: Record<string, string> = {};
  private auditLogs: Record<string, any[]> = {};

  addFactor(user: string, type: string, value: string): void {
    FactorManager.validateFactorType(type);
    if (!this.userFactors[user]) this.userFactors[user] = {};
    this.userFactors[user][type] = value;
    this.log(user, 'FACTOR_ADDED', { type });
  }

  verify(user: string, factorsProvided: Record<string, string>): boolean {
    const required = this.userFactors[user] || {};
    const success = FactorVerifier.verifyAll(required, factorsProvided, Date.now());
    this.log(user, 'VERIFICATION_ATTEMPT', { success, temporalValidation: true });
    return success;
  }

  setRecoveryKey(user: string, key: string) {
    this.recoveryKeys[user] = key;
  }

  initiateRecovery(user: string, recoveryKey: string): void {
    const success = RecoveryMechanism.processRecovery(recoveryKey, this.recoveryKeys[user]);
    this.log(user, 'RECOVERY_INITIATED', { success });
  }

  executeEmergencyOverride(user: string, signatures: string[]): boolean {
    // Emergency overrides require multi-signature (e.g. 3+ admins)
    if (signatures.length < 3) throw new Error("Insufficient signatures for emergency override");
    this.log(user, 'EMERGENCY_OVERRIDE_EXECUTED', { signaturesCount: signatures.length });
    return true;
  }

  private log(user: string, action: string, metadata: any) {
    if (!this.auditLogs[user]) this.auditLogs[user] = [];
    // Security analytics detecting patterns will read from these logs
    this.auditLogs[user].push({ action, metadata, timestamp: Date.now() });
  }

  getAuditLogs(user: string): any[] {
    return this.auditLogs[user] || [];
  }
}