export class ComplianceCertifier {
  static certify(isCompliant: boolean, user: string): string {
    if (!isCompliant) throw new Error("User non-compliant. Triggers appropriate restrictions.");
    return `CERT_${user}_${Date.now()}`;
  }
}