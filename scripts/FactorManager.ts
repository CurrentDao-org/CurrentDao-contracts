import { MFALib } from '../libraries/MFALib';

export class FactorManager {
  static validateFactorType(type: string): void {
    if (!MFALib.getSupportedFactors().includes(type)) {
      throw new Error(`Unsupported factor type: ${type}`);
    }
  }
}