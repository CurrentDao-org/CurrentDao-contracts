/**
 * Transaction Monitor - Tracks and logs all platform transactions
 */

import { TransactionData } from '../libraries/AMLLib';

export class TransactionMonitor {
  private transactions: Map<string, TransactionData[]> = new Map();
  private totalCount: number = 0;

  /**
   * Log a transaction to the monitoring system
   */
  logTransaction(tx: TransactionData): void {
    if (!this.transactions.has(tx.sender)) {
      this.transactions.set(tx.sender, []);
    }
    this.transactions.get(tx.sender)!.push(tx);
    this.totalCount++;
  }

  /**
   * Get transaction history for an account with optional limit
   */
  getTransactionHistory(account: string, limit: number = 100): TransactionData[] {
    const txs = this.transactions.get(account) || [];
    return txs.slice(Math.max(0, txs.length - limit));
  }

  /**
   * Get total transaction count across all accounts
   */
  getTransactionCount(): number {
    return this.totalCount;
  }

  /**
   * Clear transaction history for an account
   */
  clearHistory(account: string): void {
    this.transactions.delete(account);
  }

  /**
   * Get all monitored accounts
   */
  getMonitoredAccounts(): string[] {
    return Array.from(this.transactions.keys());
  }
}

export default TransactionMonitor;