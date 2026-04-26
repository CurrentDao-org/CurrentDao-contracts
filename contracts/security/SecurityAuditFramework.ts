import crypto from 'crypto';
import {
  Vulnerability,
  SecurityReport,
  SecurityConfig,
} from './structures/SecurityStructs';

import { ISecurityAuditFramework } from './interfaces/ISecurityAuditFramework';
import { SecurityLib } from './libraries/SecurityLib';

export class SecurityAuditFramework
  implements ISecurityAuditFramework
{
  private vulnerabilities: Map<string, Vulnerability[]> = new Map();
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // 🔍 Simulated scan (real system = Slither/MythX/Static analyzers)
  async scan(contractAddress: string): Promise<Vulnerability[]> {
    const mockVulns: Vulnerability[] = [
      {
        id: crypto.randomUUID(),
        contract: contractAddress,
        type: 'reentrancy',
        severity: 'high',
        description: 'Possible reentrancy vulnerability detected',
        detectedAt: Date.now(),
        resolved: false,
      },
      {
        id: crypto.randomUUID(),
        contract: contractAddress,
        type: 'unchecked-call',
        severity: 'medium',
        description: 'Unchecked external call result',
        detectedAt: Date.now(),
        resolved: false,
      },
    ];

    this.vulnerabilities.set(contractAddress, mockVulns);

    return mockVulns;
  }

  async generateReport(
    contractAddress: string
  ): Promise<SecurityReport> {
    const vulns =
      this.vulnerabilities.get(contractAddress) || [];

    const score = SecurityLib.calculateScore(vulns);

    return {
      id: crypto.randomUUID(),
      score,
      vulnerabilities: vulns,
      timestamp: Date.now(),
    };
  }

  async resolveVulnerability(id: string): Promise<void> {
    for (const [, vulns] of this.vulnerabilities) {
      const v = vulns.find((x) => x.id === id);
      if (v) {
        v.resolved = true;
        return;
      }
    }

    throw new Error('Vulnerability not found');
  }

  async getSecurityScore(
    contractAddress: string
  ): Promise<number> {
    const vulns =
      this.vulnerabilities.get(contractAddress) || [];

    return SecurityLib.calculateScore(vulns);
  }
}