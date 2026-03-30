export class TWAPLib {
  static calculateGeometricMean(prices: number[]): number {
    if (prices.length === 0) return 0;
    const product = prices.reduce((acc, val) => acc * val, 1);
    return Math.pow(product, 1 / prices.length);
  }
}