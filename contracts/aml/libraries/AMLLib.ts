/**
 * AML Library - Core utilities for anti-money laundering operations
 */

export interface TransactionData {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: number;
  isRound?: boolean;
  isWeekend?: boolean;
  metadata?: Record<string, any>;
}

export class AMLLib {
  /**
   * Validate transaction data structure and values
   */
  static validateTransaction(tx: TransactionData): boolean {
    if (!tx) return false;
    if (!tx.id || typeof tx.id !== 'string') return false;
    if (!tx.sender || typeof tx.sender !== 'string') return false;
    if (!tx.recipient || typeof tx.recipient !== 'string') return false;
    if (typeof tx.amount !== 'number' || tx.amount <= 0) return false;
    if (typeof tx.timestamp !== 'number' || tx.timestamp <= 0) return false;

    // Validate address format (basic Ethereum check)
    if (!this.isValidAddress(tx.sender) || !this.isValidAddress(tx.recipient)) {
      return false;
    }

    return true;
  }

  /**
   * Validate Ethereum address format
   */
  static isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    // Basic validation: 42 chars, starts with 0x, hex chars
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Calculate risk score based on indicators and their weights
   * Returns score from 0-100
   */
  static calculateRiskScore(indicators: string[], weights: Map<string, number> = new Map()): number {
    if (!indicators || indicators.length === 0) return 0;

    const defaultWeights = new Map<string, number>([
      ['RAPID_MOVEMENT', 15],
      ['LARGE_TRANSACTION', 12],
      ['NEW_ACCOUNT_HIGH_VALUE', 18],
      ['ROUND_AMOUNT', 8],
      ['WEEKEND_HIGH_VALUE', 10],
      ['MIXING_SERVICE', 20],
      ['STRUCTURING', 16],
      ['UNUSUAL_PATTERN', 14],
      ['MULTIPLE_RAPID_TX', 13],
      ['CROSS_BORDER_HIGH', 17],
    ]);

    const finalWeights = weights.size > 0 ? weights : defaultWeights;
    let totalScore = 0;

    for (const indicator of indicators) {
      totalScore += finalWeights.get(indicator) || 10;
    }

    // Normalize to 0-100
    return Math.min(100, totalScore);
  }

  /**
   * Determine risk level from score
   * Adjusted thresholds: low (0-30), medium (31-60), high (61-85), critical (86-100)
   */
  static getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 30) return 'low';
    if (score <= 60) return 'medium';
    if (score <= 85) return 'high';
    return 'critical';
  }

  /**
   * Get all AML indicators for configuration (50+ indicators)
   */
  static getAllAMLIndicators(): string[] {
    return [
      // Transaction Pattern Indicators (8)
      'RAPID_MOVEMENT',
      'LARGE_TRANSACTION',
      'ROUND_AMOUNT',
      'UNUSUAL_PATTERN',
      'STRUCTURING',
      'MULTIPLE_RAPID_TX',
      'LAYERING_PATTERN',
      'INTEGRATION_PATTERN',

      // Account Behavior Indicators (8)
      'NEW_ACCOUNT_HIGH_VALUE',
      'DORMANT_ACCOUNT_ACTIVATION',
      'HIGH_FREQUENCY_TX',
      'CIRCULAR_FLOW',
      'POOL_MIXING',
      'EXCHANGE_HOPPING',
      'VPN_USAGE',
      'PRIVACY_TOOL_USAGE',

      // Geographic/Temporal Indicators (8)
      'WEEKEND_HIGH_VALUE',
      'MIDNIGHT_TX',
      'UNUSUAL_TIMEZONE',
      'CROSS_BORDER_HIGH',
      'SANCTIONED_JURISDICTION',
      'HIGH_RISK_COUNTRY',
      'RAPID_GEOLOCATION_CHANGE',
      'TIMEZONE_MISMATCH',

      // High-Risk Activities (10)
      'MIXING_SERVICE',
      'TUMBLER_SERVICE',
      'DARK_MARKET_LINK',
      'RANSOMWARE_LINKED',
      'SANCTIONS_WATCHLIST',
      'PEP_LINK',
      'SHELL_COMPANY',
      'POLITICALLY_EXPOSED',
      'TERRORIST_FINANCING',
      'DRUG_TRAFFICKING_LINK',

      // Behavioral Risk Indicators (10)
      'IDENTITY_MISMATCH',
      'MULTIPLE_ACCOUNTS_LINK',
      'SMURFING_DETECTION',
      'SUDDEN_WEALTH',
      'UNEXPLAINED_FUNDS',
      'BENEFICIAL_OWNER_UNKNOWN',
      'DOCUMENT_FRAUD_RISK',
      'INCONSISTENT_PROFILE',
      'HIGH_TRANSACTION_VELOCITY',
      'ANOMALOUS_BEHAVIOR',

      // Additional Regulatory Indicators (6)
      'CASH_INTENSIVE_BUSINESS',
      'LOAN_STRIPPING',
      'OVER_INVOICING',
      'TRADE_BASED_LAUNDERING',
      'BULK_CASH_SMUGGLING',
      'CRYPTOCURRENCY_MIXING',
    ];
  }

  /**
   * Validate risk threshold is within acceptable range (0-100)
   */
  static isValidRiskThreshold(threshold: number): boolean {
    return typeof threshold === 'number' && threshold >= 0 && threshold <= 100;
  }

  /**
   * Format transaction for logging/reporting
   */
  static formatTransaction(tx: TransactionData): string {
    return `TX[${tx.id}]: ${tx.sender} -> ${tx.recipient} | ${tx.amount} UNITS | ${new Date(tx.timestamp).toISOString()}`;
  }

  /**
   * Generate a hash-like ID for patterns (for testing)
   */
  static generatePatternId(pattern: string, account: string): string {
    return `${pattern}_${account}_${Date.now()}`;
  }
}

export default AMLLib;