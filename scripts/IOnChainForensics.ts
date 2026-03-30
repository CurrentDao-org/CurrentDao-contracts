export interface IOnChainForensics {
  analyzeTransaction(txHash: string, data: any): string[];
  detectSuspiciousActivity(txData: any): boolean;
  collectEvidence(txHash: string, legalStandardRef: string): void;
  generateForensicReport(txHash: string): object;
  performChainAnalysis(address: string): any[];
}