import { IBatchProcessor } from './interfaces/IBatchProcessor';
import { Batch, Transaction, BatchStatus, TransactionPriority, BatchValidationResult, BatchExecutionResult, BatchMetrics, BatchConfig } from './structures/BatchStructure';
/**
 * Main Batch Processor implementation
 * Handles transaction batching, validation, execution, and rollback
 */
export declare class BatchProcessor implements IBatchProcessor {
    private batches;
    private batchNonce;
    private transactionNonce;
    private config;
    private metrics;
    onBatchCreated?: (batch: Batch) => void;
    onBatchValidated?: (batchId: string, result: BatchValidationResult) => void;
    onBatchExecutionStarted?: (batchId: string) => void;
    onBatchExecutionCompleted?: (batchId: string, result: BatchExecutionResult) => void;
    onBatchRolledBack?: (batchId: string) => void;
    onBatchCancelled?: (batchId: string, reason: string) => void;
    constructor(config?: Partial<BatchConfig>);
    createBatch(transactions: Transaction[], submitter: string): string;
    addTransactionToBatch(batchId: string, transaction: Transaction): void;
    removeTransactionFromBatch(batchId: string, transactionId: string): void;
    getBatch(batchId: string): Batch;
    getBatches(status?: BatchStatus): Batch[];
    validateBatch(batchId: string): BatchValidationResult;
    validateTransaction(transaction: Transaction): boolean;
    executeBatch(batchId: string): Promise<BatchExecutionResult>;
    executeBatchWithPriority(batchId: string, priority: TransactionPriority): Promise<BatchExecutionResult>;
    rollbackBatch(batchId: string): Promise<boolean>;
    emergencyCancelBatch(batchId: string, reason: string): void;
    optimizeBatchGas(batchId: string): BatchValidationResult;
    estimateBatchGas(batchId: string): number;
    getBatchStatus(batchId: string): BatchStatus;
    getBatchMetrics(): BatchMetrics;
    getTransactionsByPriority(batchId: string, priority: TransactionPriority): Transaction[];
    updateConfig(config: Partial<BatchConfig>): void;
    getConfig(): BatchConfig;
    private executeTransaction;
    private executeRollback;
    private updateMetrics;
}
//# sourceMappingURL=BatchProcessor.d.ts.map