import { Transaction, Batch, TransactionPriority, TransactionType, BatchValidationResult, GasOptimizationConfig } from '../structures/BatchStructure';
/**
 * Library of utility functions for transaction batching
 */
export declare class BatchingLib {
    /**
     * Generates a unique batch ID
     * @param submitter Address of the batch submitter
     * @param timestamp Current timestamp
     * @param nonce Unique nonce
     * @returns Unique batch ID
     */
    static generateBatchId(submitter: string, timestamp: number, nonce: number): string;
    /**
     * Generates a unique transaction ID
     * @param from Address of the transaction sender
     * @param timestamp Current timestamp
     * @param nonce Unique nonce
     * @returns Unique transaction ID
     */
    static generateTransactionId(from: string, timestamp: number, nonce: number): string;
    /**
     * Sorts transactions by priority (highest first)
     * @param transactions Array of transactions to sort
     * @returns Sorted transactions
     */
    static sortTransactionsByPriority(transactions: Transaction[]): Transaction[];
    /**
     * Groups transactions by priority level
     * @param transactions Array of transactions
     * @returns Object with transactions grouped by priority
     */
    static groupTransactionsByPriority(transactions: Transaction[]): Record<TransactionPriority, Transaction[]>;
    /**
     * Validates a single transaction
     * @param transaction Transaction to validate
     * @returns True if valid, false otherwise
     */
    static validateTransaction(transaction: Transaction): boolean;
    /**
     * Validates a batch of transactions
     * @param batch Batch to validate
     * @param config Gas optimization configuration
     * @returns Validation result
     */
    static validateBatch(batch: Batch, config: GasOptimizationConfig): BatchValidationResult;
    /**
     * Optimizes transactions for gas efficiency
     * @param transactions Array of transactions to optimize
     * @param config Gas optimization configuration
     * @returns Optimized transactions
     */
    static optimizeTransactions(transactions: Transaction[], config: GasOptimizationConfig): Transaction[];
    /**
     * Groups similar transactions together
     * @param transactions Array of transactions
     * @returns Grouped transactions
     */
    static groupSimilarTransactions(transactions: Transaction[]): Transaction[];
    /**
     * Optimizes gas limit for a specific transaction
     * @param transaction Transaction to optimize
     * @returns Optimized gas limit
     */
    static optimizeGasLimit(transaction: Transaction): number;
    /**
     * Estimates total gas cost for transactions
     * @param transactions Array of transactions
     * @returns Total gas estimate
     */
    static estimateGasCost(transactions: Transaction[]): number;
    /**
     * Calculates gas savings percentage
     * @param originalTransactions Original transactions
     * @param optimizedTransactions Optimized transactions
     * @returns Gas savings percentage
     */
    static calculateGasSavings(originalTransactions: Transaction[], optimizedTransactions: Transaction[]): number;
    /**
     * Calculates batch execution time estimate
     * @param transactions Array of transactions
     * @returns Estimated execution time in milliseconds
     */
    static estimateExecutionTime(transactions: Transaction[]): number;
    /**
     * Creates rollback data for a transaction
     * @param transaction Transaction to create rollback data for
     * @param beforeState State before transaction execution
     * @param afterState State after transaction execution
     * @returns Rollback data
     */
    static createRollbackData(transaction: Transaction, beforeState: any, afterState: any): any;
    /**
     * Checks if a transaction can be rolled back
     * @param transactionType Type of transaction
     * @returns True if rollback is possible
     */
    static canRollback(transactionType: TransactionType): boolean;
    /**
     * Generates a batch hash for integrity verification
     * @param batch Batch to hash
     * @returns Batch hash
     */
    static generateBatchHash(batch: Batch): string;
}
//# sourceMappingURL=BatchingLib.d.ts.map