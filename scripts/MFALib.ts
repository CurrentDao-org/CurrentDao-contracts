export class MFALib {
  static getSupportedFactors(): string[] {
    return ['PASSWORD', 'TOTP', 'BIOMETRIC', 'HARDWARE']; // 3+ factors
  }
}