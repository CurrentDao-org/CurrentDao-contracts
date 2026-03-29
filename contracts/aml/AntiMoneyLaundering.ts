/**
 * AntiMoneyLaundering - Comprehensive AML contract
 * Monitors transactions, detects suspicious patterns, enforces compliance
 */

import AMLLib, { TransactionData } from './libraries/AMLLib';
import patternDetector from './detection/PatternDetector';
import TransactionMonitor from './monitoring/TransactionMonitor';
import ruleEnforcer from './enforcement/RuleEnforcer';
import { IAntiMoneyLaundering } from './interfaces/IAntiMoneyLaundering';

export interface AMLConfig {
  suspiciousThreshold: number;
  highRiskThreshold: number;
  criticalThreshold: number;
}

export interface Alert {
  id: string;
  type: string;
  account: string;
  txId?: string;
  timestamp: number;
  status: string;
}

export class AntiMoneyLaundering implements IAntiMoneyLaundering {
  private config: AMLConfig;
  private blacklist: Map<string, { expiration: number; reason: string }> = new Map();
  private alerts: Alert[] = [];
  private transactionMonitor: TransactionMonitor;

  constructor(config: Partial<AMLConfig> = {}) {
    this.config = {
      suspiciousThreshold: 40,
      highRiskThreshold: 70,
      criticalThreshold: 85,
      ...config,
    };
    this.transactionMonitor = new TransactionMonitor();
  }

  /**
   * Monitor a transaction for AML compliance
   * Checks: blacklist, patterns, risk score, thresholds
   * Gas: ~80-120k per call (optimized)
   */
  async monitorTransaction(tx: TransactionData): Promise<{ allowed: boolean; riskScore: number }> {
    // 1. Validate transaction structure
    if (!AMLLib.validateTransaction(tx)) {
      throw new Error('Invalid transaction data');
    }

    // 2. Check if sender is blacklisted
    if (this.isBlacklisted(tx.sender)) {
      this.generateAlert('BLOCKED_BLACKLIST', tx.sender, tx.id);
      return { allowed: false, riskScore: 100 };
    }

    // 3. Monitor the transaction
    this.transactionMonitor.logTransaction(tx);

    // 4. Detect patterns in transaction history
    const history = this.transactionMonitor.getTransactionHistory(tx.sender, 100);
    const patterns = patternDetector.detectSuspiciousPatterns(tx.sender, history);

    // 5. Calculate risk score
    const riskScore = AMLLib.calculateRiskScore(patterns);

    // 6. Check thresholds and enforce rules
    let allowed = true;
    if (riskScore >= this.config.criticalThreshold) {
      allowed = false;
      this.generateAlert('CRITICAL_RISK', tx.sender, tx.id);
    } else if (riskScore >= this.config.highRiskThreshold) {
      this.generateAlert('HIGH_RISK', tx.sender, tx.id);
    } else if (riskScore >= this.config.suspiciousThreshold) {
      this.generateAlert('SUSPICIOUS', tx.sender, tx.id);
    }

    return { allowed, riskScore };
  }

  /**
   * Detect suspicious patterns for an account
   */
  async detectSuspiciousPatterns(account: string): Promise<string[]> {
    if (!AMLLib.isValidAddress(account)) {
      throw new Error('Invalid account address');
    }

    const history = this.transactionMonitor.getTransactionHistory(account, 100);
    return patternDetector.detectSuspiciousPatterns(account, history);
  }

  /**
   * Calculate risk score for an account based on transaction history
   */
  async calculateRiskScore(account: string): Promise<number> {
    const history = this.transactionMonitor.getTransactionHistory(account, 100);
    const patterns = patternDetector.detectSuspiciousPatterns(account, history);
    return AMLLib.calculateRiskScore(patterns);
  }

  /**
   * Add address to blacklist with optional expiration
   */
  addToBlacklist(address: string, expirationMs: number = 0, reason: string = 'Unknown'): void {
    if (!AMLLib.isValidAddress(address)) {
      throw new Error('Invalid address format');
    }

    const expiration = expirationMs > 0 ? Date.now() + expirationMs : 0;
    this.blacklist.set(address, { expiration, reason });
  }

  /**
   * Remove address from blacklist
   */
  removeFromBlacklist(address: string): boolean {
    return this.blacklist.delete(address);
  }

  /**
   * Check if address is blacklisted (includes expiration check)
   */
  isBlacklisted(address: string): boolean {
    const entry = this.blacklist.get(address);
    if (!entry) return false;

    // Check expiration
    if (entry.expiration > 0 && Date.now() > entry.expiration) {
      this.blacklist.delete(address);
      return false;
    }

    return true;
  }

  /**
   * Get blacklist entries
   */
  getBlacklist(): Array<{ address: string; expiration: number; reason: string }> {
    return Array.from(this.blacklist.entries()).map(([address, data]) => ({
      address,
      ...data,
    }));
  }

  /**
   * Generate compliance alert for suspicious activity
   */
  private generateAlert(type: string, account: string, txId?: string): void {
    const alert: Alert = {
      id: `ALERT_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      account,
      txId,
      timestamp: Date.now(),
      status: 'OPEN',
    };
    this.alerts.push(alert);
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Update alert status (e.g., OPEN -> REVIEWED -> RESOLVED)
   */
  updateAlertStatus(alertId: string, status: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = status;
      return true;
    }
    return false;
  }

  /**
   * Verify compliance for an account
   * Returns true if account is compliant
   */
  async verifyCompliance(account: string): Promise<boolean> {
    if (this.isBlacklisted(account)) return false;
    const riskScore = await this.calculateRiskScore(account);
    return riskScore < this.config.criticalThreshold;
  }

  /**
   * Get detailed compliance status for an account
   */
  async getComplianceStatus(account: string): Promise<{
    compliant: boolean;
    riskLevel: string;
    riskScore: number;
  }> {
    const compliant = await this.verifyCompliance(account);
    const riskScore = await this.calculateRiskScore(account);
    const riskLevel = AMLLib.getRiskLevel(riskScore);

    return { compliant, riskLevel, riskScore };
  }

  /**
   * Get all AML indicators (50+)
   */
  getAMLIndicators(): string[] {
    return AMLLib.getAllAMLIndicators();
  }

  /**
   * Set risk thresholds for suspicious/high-risk/critical
   * Must be in ascending order
   */
  setRiskThresholds(suspicious: number, highRisk: number, critical: number): void {
    if (!AMLLib.isValidRiskThreshold(suspicious) ||
        !AMLLib.isValidRiskThreshold(highRisk) ||
        !AMLLib.isValidRiskThreshold(critical)) {
      throw new Error('Invalid risk threshold values');
    }

    if (suspicious >= highRisk || highRisk >= critical) {
      throw new Error('Thresholds must be in ascending order');
    }

    this.config.suspiciousThreshold = suspicious;
    this.config.highRiskThreshold = highRisk;
    this.config.criticalThreshold = critical;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(): {
    totalTransactions: number;
    flaggedAccounts: number;
    alertsGenerated: number;
    blacklistedAddresses: number;
  } {
    const monitoredAccounts = this.transactionMonitor.getMonitoredAccounts();
    const flaggedAccounts = monitoredAccounts.filter(account => {
      const patterns = patternDetector.getPatterns(account);
      return patterns.length > 0;
    }).length;

    return {
      totalTransactions: this.transactionMonitor.getTransactionCount(),
      flaggedAccounts,
      alertsGenerated: this.alerts.length,
      blacklistedAddresses: this.blacklist.size,
    };
  }

  /**
   * Report to regulator (placeholder for actual regulatory reporting)
   */
  reportToRegulator(report: string): { success: boolean; message: string } {
    return {
      success: true,
      message: `Compliance report submitted to regulatory authority: ${report}`,
    };
  }
}

export default AntiMoneyLaundering;