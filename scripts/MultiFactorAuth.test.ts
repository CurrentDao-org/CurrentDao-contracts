import { MultiFactorAuth } from '../../contracts/mfa/MultiFactorAuth';

describe('MultiFactorAuth', () => {
  let mfa: MultiFactorAuth;

  beforeEach(() => {
    mfa = new MultiFactorAuth();
  });

  it('should support 3+ factors and require all for critical ops verification', () => {
    mfa.addFactor('alice', 'PASSWORD', 'pass123');
    mfa.addFactor('alice', 'TOTP', '123456');
    mfa.addFactor('alice', 'BIOMETRIC', 'hashX');
    
    const success = mfa.verify('alice', {
      'PASSWORD': 'pass123',
      'TOTP': '123456',
      'BIOMETRIC': 'hashX'
    });
    expect(success).toBe(true);
  });

  it('should process recovery mechanism for lost factors', () => {
    mfa.setRecoveryKey('bob', 'recKey99');
    expect(() => mfa.initiateRecovery('bob', 'wrongKey')).toThrow('Invalid recovery mechanism key');
    expect(() => mfa.initiateRecovery('bob', 'recKey99')).not.toThrow();
  });

  it('should require multi-signature for emergency overrides', () => {
    expect(() => mfa.executeEmergencyOverride('charlie', ['sig1', 'sig2'])).toThrow('Insufficient signatures for emergency override');
    expect(mfa.executeEmergencyOverride('charlie', ['sig1', 'sig2', 'sig3'])).toBe(true);
  });

  it('should maintain security analytics logs', () => {
    mfa.addFactor('dave', 'PASSWORD', 'pass');
    mfa.verify('dave', { 'PASSWORD': 'wrong' });
    const logs = mfa.getAuditLogs('dave');
    expect(logs.length).toBe(2);
    expect(logs[1].action).toBe('VERIFICATION_ATTEMPT');
  });
});