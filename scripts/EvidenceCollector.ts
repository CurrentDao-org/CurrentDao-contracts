export class EvidenceCollector {
  static collect(txHash: string, legalStandardRef: string): any {
    return {
      txHash,
      legalStandard: legalStandardRef,
      immutableTimestamp: Date.now(),
    };
  }
}