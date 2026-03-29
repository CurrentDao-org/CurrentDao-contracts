/**
 * IAntiMoneyLaundering - Interface for AML contract
 */

import { TransactionData } from '../libraries/AMLLib';

export interface IAntiMoneyLaundering {
  /**
   * Monitor a transaction for AML compliance
   */
  monitorTransaction(tx: TransactionData): Promise<{ allowed: boolean; riskScore: number }>;

  /**
   * Detect suspicious patterns for an account
   */
  detectSuspiciousPatterns(account: string): Promise<string[]>;

  /**
   * Calculate risk score for an account
   */
  calculateRiskScore(account: string): Promise<number>;

  /**
   * Add address to blacklist
   */
  addToBlacklist(address: string, expirationMs?: number, reason?: string): void;

  /**
   * Remove address from blacklist
   */
  removeFromBlacklist(address: string): boolean;

  /**
   * Check if address is blacklisted
   */
  isBlacklisted(address: string): boolean;

  /**
   * Get blacklist
   */
  getBlacklist(): Array<{ address: string; expiration: number; reason: string }>;

  /**
   * Get all alerts
   */
  getAlerts(): any[];

  /**
   * Update alert status
   */
  updateAlertStatus(alertId: string, status: string): boolean;

  /**
   * Verify compliance for account
   */
  verifyCompliance(account: string): Promise<boolean>;

  /**
   * Get compliance status
   */
  getComplianceStatus(account: string): Promise<{
    compliant: boolean;
    riskLevel: string;
    riskScore: number;
  }>;

  /**
   * Get all AML indicators
   */
  getAMLIndicators(): string[];

  /**
   * Set risk thresholds
   */
  setRiskThresholds(suspicious: number, highRisk: number, critical: number): void;

  /**
   * Generate compliance report
   */
  generateComplianceReport(): {
    totalTransactions: number;
    flaggedAccounts: number;
    alertsGenerated: number;
    blacklistedAddresses: number;
  };

  /**
   * Report to regulator
   */
  reportToRegulator(report: string): { success: boolean; message: string };
}