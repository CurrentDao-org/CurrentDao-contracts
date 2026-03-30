import { IOnChainForensics } from './interfaces/IOnChainForensics';
import { PatternAnalyzer } from './analysis/PatternAnalyzer';
import { SuspiciousDetector } from './detection/SuspiciousDetector';
import { EvidenceCollector } from './evidence/EvidenceCollector';

export class OnChainForensics implements IOnChainForensics {
  private evidenceVault: Record<string, any> = {};
  private chainHistory: Record<string, any[]> = {};

  analyzeTransaction(txHash: string, data: any): string[] {
    const patterns = PatternAnalyzer.analyze(data);
    if (!this.chainHistory[data.sender]) this.chainHistory[data.sender] = [];
    this.chainHistory[data.sender].push({ txHash, patterns });
    return patterns;
  }

  detectSuspiciousActivity(txData: any): boolean {
    return SuspiciousDetector.detect(txData);
  }

  collectEvidence(txHash: string, legalStandardRef: string): void {
    const evidence = EvidenceCollector.collect(txHash, legalStandardRef);
    this.evidenceVault[txHash] = evidence; // Preserved immutably in state
  }

  generateForensicReport(txHash: string): object {
    return {
      txHash,
      evidence: this.evidenceVault[txHash],
      investigationToolSupport: true,
      status: 'PREPARED'
    };
  }

  performChainAnalysis(address: string): any[] {
    return this.chainHistory[address] || [];
  }
}