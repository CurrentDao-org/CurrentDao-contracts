import { ComplianceRegistry } from '../../contracts/compliance/ComplianceRegistry';

describe('ComplianceRegistry', () => {
  let registry: ComplianceRegistry;

  beforeEach(() => {
    registry = new ComplianceRegistry();
  });

  it('should track 50+ requirements and block non-compliant users', () => {
    expect(registry.checkCompliance('user1')).toBe(false);
    expect(() => registry.certifyUser('user1')).toThrow('User non-compliant. Triggers appropriate restrictions.');
  });

  it('should allow certification for fully compliant users', () => {
    for (let i = 1; i <= 50; i++) {
      registry.updateUserStatus('user2', `REQ_${i}`, true);
    }
    const cert = registry.certifyUser('user2');
    expect(cert).toContain('CERT_user2');
  });

  it('should generate reports and keep audit trail', () => {
    registry.updateUserStatus('user3', 'REQ_1', true);
    expect(registry.getAuditTrail().length).toBeGreaterThan(0);
    expect(registry.generateQuarterlyReport()).toHaveProperty('period', 'Q1');
  });
});