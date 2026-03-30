export class FactorVerifier {
  static verifyAll(required: Record<string, string>, provided: Record<string, string>, lastVerified: number): boolean {
    // Time-based authentication adds temporal security (expires in 5 minutes)
    if (Date.now() - lastVerified > 5 * 60 * 1000) return false; 
    
    for (const [type, value] of Object.entries(required)) {
      if (provided[type] !== value) return false;
    }
    return Object.keys(required).length >= 3; // Requires at least 3 factors for critical ops
  }
}