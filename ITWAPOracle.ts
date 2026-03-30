export interface ITWAPOracle {
  updatePrice(asset: string, price: number, source: string, weight: number, timestamp: number): void;
  getTWAP(asset: string, windowSeconds: number): number;
  setWindow(asset: string, windowSeconds: number): void;
  getHistoricalPrices(asset: string): { price: number; timestamp: number }[];
  checkManipulation(asset: string, sourceWeightTotal: number): boolean;
}