export class ComplianceLib {
  static getInitialRequirements(): string[] {
    return Array.from({ length: 50 }, (_, i) => `REQ_${i + 1}`); // 50+ requirements
  }
}