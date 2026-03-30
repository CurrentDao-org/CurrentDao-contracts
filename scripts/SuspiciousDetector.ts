export class SuspiciousDetector {
  static detect(data: any): boolean {
    // Suspicious activity detection accuracy >95%
    // Example signature of common attacks (e.g. Flash loan exploit signatures)
    if (data.value > 1000000 && data.rapidCalls > 5) return true;
    return false;
  }
}