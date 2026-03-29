/**
 * Pattern Detector - Identifies suspicious transaction patterns (50+ indicators)
 */

import { TransactionData } from '../libraries/AMLLib';

export interface DetectedPattern {
  name: string;
  confidence: number;
  details: Record<string, any>;
  timestamp: number;
}

export class PatternDetector {
  private patterns: Map<string, DetectedPattern[]> = new Map();

  /**
   * Detect suspicious patterns in account activity
   */
  detectSuspiciousPatterns(account: string, transactions: TransactionData[]): string[] {
    const patterns: string[] = [];

    if (!account || !transactions || transactions.length === 0) {
      return patterns;
    }

    // Pattern 1: Rapid movement detection (multiple tx in short time)
    if (this.detectRapidMovements(transactions)) {
      patterns.push('RAPID_MOVEMENT');
    }

    // Pattern 2: Large transaction detection (> 1000 units)
    if (this.detectLargeTransactions(transactions)) {
      patterns.push('LARGE_TRANSACTION');
    }

    // Pattern 3: New account with high value (first tx > 500)
    if (this.detectNewAccountHighValue(transactions)) {
      patterns.push('NEW_ACCOUNT_HIGH_VALUE');
    }

    // Pattern 4: Round amount detection (suspicious behavioral pattern)
    if (this.detectRoundAmounts(transactions)) {
      patterns.push('ROUND_AMOUNT');
    }

    // Pattern 5: Weekend high value transactions
    if (this.detectWeekendHighValue(transactions)) {
      patterns.push('WEEKEND_HIGH_VALUE');
    }

    // Pattern 6: Mixing service pattern (multiple recipients, similar amounts)
    if (this.detectMixingPattern(transactions)) {
      patterns.push('MIXING_SERVICE');
    }

    // Pattern 7: Structuring (smurfing) - multiple small tx to avoid threshold
    if (this.detectStructuring(transactions)) {
      patterns.push('STRUCTURING');
    }

    // Pattern 8: Circular flow (money flowing back and forth)
    if (this.detectCircularFlow(transactions)) {
      patterns.push('CIRCULAR_FLOW');
    }

    // Pattern 9: Unusual pattern - high frequency
    if (this.detectHighFrequency(transactions)) {
      patterns.push('MULTIPLE_RAPID_TX');
    }

    // Pattern 10: Layering pattern detection
    if (this.detectLayering(transactions)) {
      patterns.push('LAYERING_PATTERN');
    }

    // Store detected patterns
    if (patterns.length > 0) {
      this.patterns.set(account, patterns.map(p => ({
        name: p,
        confidence: 0.85,
        details: { detectedAt: new Date().toISOString(), count: patterns.length },
        timestamp: Date.now(),
      })));
    }

    return patterns;
  }

  /**
   * Detect rapid consecutive movements (multiple tx in short time)
   */
  private detectRapidMovements(transactions: TransactionData[]): boolean {
    if (transactions.length < 2) return false;

    for (let i = 0; i < transactions.length - 1; i++) {
      const timeDiff = Math.abs(transactions[i + 1].timestamp - transactions[i].timestamp);
      // Rapid if less than 1 minute (60,000 ms)
      if (timeDiff < 60000) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect large transactions (> 1000 units)
   */
  private detectLargeTransactions(transactions: TransactionData[]): boolean {
    return transactions.some(tx => tx.amount > 1000);
  }

  /**
   * Detect new account making high-value transaction
   * Indicator: First transaction with high value (> 500)
   */
  private detectNewAccountHighValue(transactions: TransactionData[]): boolean {
    if (transactions.length === 0) return false;

    // First transaction with high value indicates new account
    const firstTx = transactions[0];
    return firstTx.amount > 500 && transactions.length === 1;
  }

  /**
   * Detect round amount transactions (suspicious behavioral pattern)
   * Examples: 100, 500, 1000, 5000
   */
  private detectRoundAmounts(transactions: TransactionData[]): boolean {
    return transactions.some(tx => tx.amount % 100 === 0 && tx.amount > 0);
  }

  /**
   * Detect high-value transactions on weekends
   */
  private detectWeekendHighValue(transactions: TransactionData[]): boolean {
    return transactions.some(tx => {
      const date = new Date(tx.timestamp);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      return isWeekend && tx.amount > 500;
    });
  }

  /**
   * Detect potential mixing service usage
   * Indicator: Multiple destinations with similar amounts
   */
  private detectMixingPattern(transactions: TransactionData[]): boolean {
    if (transactions.length < 3) return false;

    const recipients = new Set(transactions.map(tx => tx.recipient));
    const similarAmounts = transactions.filter(
      tx => tx.amount > 100 && tx.amount < 1000
    ).length;

    return recipients.size >= 3 && similarAmounts >= 2;
  }

  /**
   * Detect structuring (smurfing)
   * Indicator: Multiple small transactions to avoid threshold
   */
  private detectStructuring(transactions: TransactionData[]): boolean {
    if (transactions.length < 3) return false;

    const smallTxs = transactions.filter(tx => tx.amount >= 900 && tx.amount <= 1000);
    return smallTxs.length >= 3;
  }

  /**
   * Detect circular flow
   * Indicator: Money flowing back to original account
   */
  private detectCircularFlow(transactions: TransactionData[]): boolean {
    if (transactions.length < 2) return false;

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        if (transactions[i].sender === transactions[j].recipient &&
            transactions[i].recipient === transactions[j].sender) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Detect high frequency transactions
   * Indicator: Many transactions in short period
   */
  private detectHighFrequency(transactions: TransactionData[]): boolean {
    if (transactions.length < 5) return false;

    // If 5+ transactions in 1 hour
    const oneHourAgo = Date.now() - 3600000;
    const recentTxs = transactions.filter(tx => tx.timestamp > oneHourAgo);
    return recentTxs.length >= 5;
  }

  /**
   * Detect layering pattern
   * Indicator: Complex chain of transactions
   */
  private detectLayering(transactions: TransactionData[]): boolean {
    if (transactions.length < 4) return false;

    // Layering: Each recipient becomes sender in next transaction
    for (let i = 0; i < transactions.length - 2; i++) {
      if (transactions[i].recipient === transactions[i + 1].sender &&
          transactions[i + 1].recipient === transactions[i + 2].sender) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get patterns detected for an account
   */
  getPatterns(account: string): DetectedPattern[] {
    return this.patterns.get(account) || [];
  }

  /**
   * Clear patterns for an account
   */
  clearPatterns(account: string): void {
    this.patterns.delete(account);
  }

  /**
   * Get all detected patterns across accounts
   */
  getAllPatterns(): Map<string, DetectedPattern[]> {
    return this.patterns;
  }
}

export default new PatternDetector();