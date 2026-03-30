import { TWAPLib } from '../libraries/TWAPLib';

export class PriceCalculator {
  static calculateTWAP(pricePoints: { price: number; timestamp: number }[], windowSeconds: number, currentTimestamp: number): number {
    const validPrices = pricePoints
      .filter(p => currentTimestamp - p.timestamp <= windowSeconds)
      .map(p => p.price);
    
    if (validPrices.length === 0) return 0;
    return TWAPLib.calculateGeometricMean(validPrices);
  }
}