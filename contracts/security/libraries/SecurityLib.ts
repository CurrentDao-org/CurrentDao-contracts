import { Vulnerability } from '../structures/SecurityStructs';

export class SecurityLib {
  static calculateScore(vulns: Vulnerability[]): number {
    let score = 100;

    for (const v of vulns) {
      if (v.resolved) continue;

      switch (v.severity) {
        case 'low':
          score -= 2;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'high':
          score -= 15;
          break;
        case 'critical':
          score -= 40;
          break;
      }
    }

    return Math.max(0, score);
  }

  static isCritical(v: Vulnerability): boolean {
    return v.severity === 'critical';
  }

  static isHighRisk(vulns: Vulnerability[]): boolean {
    return vulns.some(
      (v) => v.severity === 'critical' && !v.resolved
    );
  }
}