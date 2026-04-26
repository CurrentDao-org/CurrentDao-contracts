import { SecurityAuditFramework } from './SecurityAuditFramework';

describe('SecurityAuditFramework', () => {
  const framework = new SecurityAuditFramework({
    minScoreThreshold: 80,
    scanners: ['slither', 'mythx'],
    alertThreshold: 'high',
  });

  it('should scan contract', async () => {
    const vulns = await framework.scan('0xCONTRACT');

    expect(vulns.length).toBeGreaterThan(0);
  });

  it('should generate report with score', async () => {
    await framework.scan('0xCONTRACT');

    const report =
      await framework.generateReport('0xCONTRACT');

    expect(report.score).toBeLessThan(100);
  });

  it('should resolve vulnerability', async () => {
    const vulns = await framework.scan('0xCONTRACT');

    await framework.resolveVulnerability(vulns[0].id);

    const report =
      await framework.generateReport('0xCONTRACT');

    expect(report.vulnerabilities[0].resolved).toBe(true);
  });
});