export class ForensicsLib {
  static getTransactionTypes(): string[] {
    return Array.from({ length: 100 }, (_, i) => `TX_TYPE_${i}`); // 100+ transaction types
  }
}