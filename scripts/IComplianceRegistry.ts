export interface IComplianceRegistry {
  updateUserStatus(user: string, reqId: string, status: boolean): void;
  checkCompliance(user: string): boolean;
  applyRegulatoryUpdate(reqId: string, description: string): void;
  generateQuarterlyReport(): object;
  certifyUser(user: string): string;
  getAuditTrail(): any[];
}