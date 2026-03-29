/**
 * Rule Enforcer - Enforces AML compliance rules
 */

export interface RuleEnforcementResult {
  allowed: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class RuleEnforcer {
  private rules: Map<string, (data: any) => boolean> = new Map();

  /**
   * Register an AML rule
   */
  registerRule(ruleId: string, ruleFn: (data: any) => boolean): void {
    this.rules.set(ruleId, ruleFn);
  }

  /**
   * Enforce a specific AML rule
   */
  enforceRule(ruleType: string, data: any): RuleEnforcementResult {
    const ruleFn = this.rules.get(ruleType);

    if (!ruleFn) {
      return {
        allowed: true,
        reason: `Rule '${ruleType}' not found, allowing transaction`,
        severity: 'low',
      };
    }

    const allowed = ruleFn(data);

    return {
      allowed,
      reason: allowed ? `Rule '${ruleType}' passed` : `Rule '${ruleType}' failed`,
      severity: allowed ? 'low' : 'critical',
    };
  }

  /**
   * Get all registered rules
   */
  getRules(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }
}

export default new RuleEnforcer();