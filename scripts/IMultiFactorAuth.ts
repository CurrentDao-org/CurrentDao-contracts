export interface IMultiFactorAuth {
  addFactor(user: string, type: string, value: string): void;
  verify(user: string, factorsProvided: Record<string, string>): boolean;
  initiateRecovery(user: string, recoveryKey: string): void;
  executeEmergencyOverride(user: string, signatures: string[]): boolean;
  getAuditLogs(user: string): any[];
}