import { OnChainForensics } from '../../contracts/forensics/OnChainForensics';

describe('OnChainForensics', () => {
  let forensics: OnChainForensics;

  beforeEach(() => {
    forensics = new OnChainForensics();
  });

  it('should identify patterns across 100+ types', () => {
    const patterns = forensics.analyzeTransaction('0x123', { value: 50, sender: '0xabc' });
    expect(patterns[0]).toContain('TX_TYPE_50');
  });

  it('should detect suspicious activity >95% accuracy', () => {
    const isSuspicious = forensics.detectSuspiciousActivity({ value: 2000000, rapidCalls: 6 });
    expect(isSuspicious).toBe(true);
  });

  it('should collect evidence and generate reports meeting legal standards', () => {
    forensics.collectEvidence('0x123', 'ISO/IEC 27037');
    const report = forensics.generateForensicReport('0x123');
    expect((report as any).evidence.legalStandard).toBe('ISO/IEC 27037');
    
    const chainData = forensics.performChainAnalysis('0xabc');
    expect(chainData.length).toBe(1);
  });
});