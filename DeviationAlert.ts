export class DeviationAlert {
  static triggerAlertIfDeviated(oldPrice: number, newPrice: number): boolean {
    if (oldPrice === 0) return false;
    const deviation = Math.abs(newPrice - oldPrice) / oldPrice;
    return deviation >= 0.03; // Triggers on >= 3% price changes
  }
}