import { Vulnerability, SecurityReport } from '../structures/SecurityStructs';

export interface ISecurityAuditFramework {
  scan(contractAddress: string): Promise<Vulnerability[]>;

  generateReport(contractAddress: string): Promise<SecurityReport>;

  resolveVulnerability(id: string): Promise<void>;

  getSecurityScore(contractAddress: string): Promise<number>;
}