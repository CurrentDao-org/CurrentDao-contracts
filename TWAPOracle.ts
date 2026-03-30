import { ITWAPOracle } from './interfaces/ITWAPOracle';
import { PriceCalculator } from './price/PriceCalculator';
import { AccuracyMonitor } from './monitoring/AccuracyMonitor';
import { DeviationAlert } from './alerts/DeviationAlert';

export class TWAPOracle implements ITWAPOracle {
  private priceHistory: Record<string, { price: number; timestamp: number; source: string; weight: number }[]> = {};
  private windows: Record<string, number> = {};
  private lastUpdate: Record<string, number> = {};
  private readonly THIRTY_DAYS = 30 * 24 * 60 * 60;

  updatePrice(asset: string, price: number, source: string, weight: number, timestamp: number): void {
    if (this.lastUpdate[asset] && timestamp - this.lastUpdate[asset] < 30) {
      throw new Error("Updates must be scheduled at least 30 seconds apart.");
    }
    
    if (!this.priceHistory[asset]) this.priceHistory[asset] = [];
    
    if (this.priceHistory[asset].length > 0) {
      const lastPrice = this.priceHistory[asset][this.priceHistory[asset].length - 1].price;
      if (DeviationAlert.triggerAlertIfDeviated(lastPrice, price)) {
        console.warn(`Deviation alert: ${asset} price changed by over 3%`);
      }
    }

    this.priceHistory[asset].push({ price, timestamp, source, weight });
    this.priceHistory[asset] = this.priceHistory[asset].filter(p => timestamp - p.timestamp <= this.THIRTY_DAYS);
    this.lastUpdate[asset] = timestamp;
  }

  getTWAP(asset: string, windowSeconds: number): number {
    const prices = this.priceHistory[asset] || [];
    const twap = PriceCalculator.calculateTWAP(prices, windowSeconds, Date.now() / 1000);
    if (prices.length > 0 && !AccuracyMonitor.checkAccuracy(prices[prices.length - 1].price, twap)) {
      console.warn("Accuracy monitor: error rate exceeds 1%");
    }
    return twap;
  }

  setWindow(asset: string, windowSeconds: number): void {
    if (windowSeconds < 60 || windowSeconds > 86400) {
      throw new Error("Time windows must be between 1 minute and 24 hours.");
    }
    this.windows[asset] = windowSeconds;
  }

  getHistoricalPrices(asset: string) { return this.priceHistory[asset] || []; }

  checkManipulation(asset: string, sourceWeightTotal: number): boolean {
    return sourceWeightTotal >= 51; // Requires >= 51% control
  }
}