export class AccuracyMonitor {
  static checkAccuracy(actualPrice: number, calculatedTWAP: number): boolean {
    if (calculatedTWAP === 0) return false;
    const errorRate = Math.abs(actualPrice - calculatedTWAP) / calculatedTWAP;
    return errorRate < 0.01; // < 1% error
  }
}