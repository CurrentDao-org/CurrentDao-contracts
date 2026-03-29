"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessor = void 0;
const BatchStructure_1 = require("./structures/BatchStructure");
const BatchingLib_1 = require("./libraries/BatchingLib");
/**
 * Main Batch Processor implementation
 * Handles transaction batching, validation, execution, and rollback
 */
class BatchProcessor {
    // --- State Variables ---
    batches = new Map();
    batchNonce = 0;
    transactionNonce = 0;
    config;
    metrics;
    // --- Events ---
    onBatchCreated;
    onBatchValidated;
    onBatchExecutionStarted;
    onBatchExecutionCompleted;
    onBatchRolledBack;
    onBatchCancelled;
    // --- Constructor ---
    constructor(config) {
        this.config = {
            maxTransactionsPerBatch: 100,
            maxGasPerBatch: 50000000,
            validationTimeout: 30000, // 30 seconds
            executionTimeout: 300000, // 5 minutes
            emergencyCancelEnabled: true,
            rollbackEnabled: true,
            gasOptimization: {
                targetGasSavings: 40,
                maxBatchSize: 100,
                minBatchSize: 5,
                priorityThreshold: BatchStructure_1.TransactionPriority.MEDIUM,
                gasPriceThreshold: 100
            },
            ...config
        };
        this.metrics = {
            totalBatches: 0,
            successfulBatches: 0,
            failedBatches: 0,
            averageGasSavings: 0,
            averageExecutionTime: 0,
            totalTransactionsProcessed: 0
        };
    }
    // --- Batch Creation and Management ---
    createBatch(transactions, submitter) {
        this.batchNonce++;
        const batchId = BatchingLib_1.BatchingLib.generateBatchId(submitter, Date.now(), this.batchNonce);
        // Validate all transactions before creating batch
        const validTransactions = transactions.filter(tx => BatchingLib_1.BatchingLib.validateTransaction(tx));
        if (validTransactions.length === 0) {
            throw new Error('No valid transactions provided');
        }
        if (validTransactions.length > this.config.maxTransactionsPerBatch) {
            throw new Error(`Batch size ${validTransactions.length} exceeds maximum ${this.config.maxTransactionsPerBatch}`);
        }
        // Determine batch priority based on highest priority transaction
        const batchPriority = Math.max(...validTransactions.map(tx => tx.priority));
        const batch = {
            id: batchId,
            transactions: validTransactions,
            status: BatchStructure_1.BatchStatus.PENDING,
            submitter,
            timestamp: Date.now(),
            gasLimit: validTransactions.reduce((sum, tx) => sum + tx.gasLimit, 0),
            gasUsed: 0,
            priority: batchPriority,
            maxTransactions: this.config.maxTransactionsPerBatch
        };
        this.batches.set(batchId, batch);
        this.metrics.totalBatches++;
        if (this.onBatchCreated) {
            this.onBatchCreated(batch);
        }
        return batchId;
    }
    addTransactionToBatch(batchId, transaction) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status !== BatchStructure_1.BatchStatus.PENDING) {
            throw new Error(`Cannot add transaction to batch with status ${batch.status}`);
        }
        if (!BatchingLib_1.BatchingLib.validateTransaction(transaction)) {
            throw new Error('Invalid transaction');
        }
        if (batch.transactions.length >= batch.maxTransactions) {
            throw new Error('Batch is at maximum capacity');
        }
        batch.transactions.push(transaction);
        batch.gasLimit += transaction.gasLimit;
        // Update batch priority if needed
        const newPriority = Math.max(batch.priority, transaction.priority);
        if (newPriority !== batch.priority) {
            batch.priority = newPriority;
        }
    }
    removeTransactionFromBatch(batchId, transactionId) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status !== BatchStructure_1.BatchStatus.PENDING) {
            throw new Error(`Cannot remove transaction from batch with status ${batch.status}`);
        }
        const transactionIndex = batch.transactions.findIndex(tx => tx.id === transactionId);
        if (transactionIndex === -1) {
            throw new Error(`Transaction ${transactionId} not found in batch`);
        }
        const removedTransaction = batch.transactions.splice(transactionIndex, 1)[0];
        batch.gasLimit -= removedTransaction.gasLimit;
        // Recalculate batch priority
        if (batch.transactions.length > 0) {
            batch.priority = Math.max(...batch.transactions.map(tx => tx.priority));
        }
    }
    getBatch(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        return { ...batch };
    }
    getBatches(status) {
        const batches = Array.from(this.batches.values());
        if (status !== undefined) {
            return batches.filter(batch => batch.status === status);
        }
        return batches;
    }
    // --- Batch Validation ---
    validateBatch(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        batch.status = BatchStructure_1.BatchStatus.VALIDATING;
        const validationResult = BatchingLib_1.BatchingLib.validateBatch(batch, this.config.gasOptimization);
        if (validationResult.isValid) {
            batch.transactions = validationResult.optimizedTransactions;
            batch.gasLimit = validationResult.gasEstimate;
        }
        if (this.onBatchValidated) {
            this.onBatchValidated(batchId, validationResult);
        }
        return validationResult;
    }
    validateTransaction(transaction) {
        return BatchingLib_1.BatchingLib.validateTransaction(transaction);
    }
    // --- Batch Execution ---
    async executeBatch(batchId) {
        return this.executeBatchWithPriority(batchId, BatchStructure_1.TransactionPriority.MEDIUM);
    }
    async executeBatchWithPriority(batchId, priority) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status !== BatchStructure_1.BatchStatus.VALIDATING && batch.status !== BatchStructure_1.BatchStatus.PENDING) {
            throw new Error(`Batch ${batchId} is not in a valid state for execution`);
        }
        // Validate batch before execution
        const validationResult = this.validateBatch(batchId);
        if (!validationResult.isValid) {
            throw new Error(`Batch validation failed: ${validationResult.errors.join(', ')}`);
        }
        batch.status = BatchStructure_1.BatchStatus.EXECUTING;
        batch.executionBlock = Date.now(); // Simulated block number
        if (this.onBatchExecutionStarted) {
            this.onBatchExecutionStarted(batchId);
        }
        const startTime = Date.now();
        const result = {
            batchId,
            success: false,
            executedTransactions: [],
            failedTransactions: [],
            gasUsed: 0,
            executionTime: 0,
            rollbackRequired: false
        };
        try {
            // Execute transactions in priority order
            const sortedTransactions = BatchingLib_1.BatchingLib.sortTransactionsByPriority(batch.transactions);
            const rollbackData = [];
            for (const transaction of sortedTransactions) {
                try {
                    // Simulate transaction execution
                    const executionResult = await this.executeTransaction(transaction);
                    if (executionResult.success) {
                        result.executedTransactions.push(transaction.id);
                        result.gasUsed += transaction.gasLimit;
                        // Create rollback data if enabled
                        if (this.config.rollbackEnabled && BatchingLib_1.BatchingLib.canRollback(transaction.type)) {
                            const rollbackItem = BatchingLib_1.BatchingLib.createRollbackData(transaction, executionResult.beforeState, executionResult.afterState);
                            rollbackData.push(rollbackItem);
                        }
                    }
                    else {
                        result.failedTransactions.push(transaction.id);
                        result.rollbackRequired = true;
                        break;
                    }
                }
                catch (error) {
                    result.failedTransactions.push(transaction.id);
                    result.rollbackRequired = true;
                    break;
                }
            }
            result.executionTime = Date.now() - startTime;
            result.success = result.failedTransactions.length === 0;
            batch.gasUsed = result.gasUsed;
            batch.rollbackData = rollbackData;
            if (result.success) {
                batch.status = BatchStructure_1.BatchStatus.COMPLETED;
                this.metrics.successfulBatches++;
            }
            else {
                batch.status = BatchStructure_1.BatchStatus.FAILED;
                this.metrics.failedBatches++;
                // Auto-rollback if enabled and required
                if (this.config.rollbackEnabled && result.rollbackRequired) {
                    await this.rollbackBatch(batchId);
                }
            }
            // Update metrics
            this.updateMetrics(result);
        }
        catch (error) {
            batch.status = BatchStructure_1.BatchStatus.FAILED;
            this.metrics.failedBatches++;
            result.success = false;
            result.executionTime = Date.now() - startTime;
        }
        if (this.onBatchExecutionCompleted) {
            this.onBatchExecutionCompleted(batchId, result);
        }
        return result;
    }
    // --- Rollback and Emergency Functions ---
    async rollbackBatch(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (!this.config.rollbackEnabled) {
            throw new Error('Rollback is not enabled');
        }
        if (!batch.rollbackData || batch.rollbackData.length === 0) {
            throw new Error('No rollback data available for this batch');
        }
        try {
            // Execute rollback in reverse order
            const reversedRollbackData = [...batch.rollbackData].reverse();
            for (const rollbackItem of reversedRollbackData) {
                if (rollbackItem.canRollback) {
                    await this.executeRollback(rollbackItem);
                }
            }
            batch.status = BatchStructure_1.BatchStatus.ROLLED_BACK;
            if (this.onBatchRolledBack) {
                this.onBatchRolledBack(batchId);
            }
            return true;
        }
        catch (error) {
            batch.status = BatchStructure_1.BatchStatus.FAILED;
            return false;
        }
    }
    emergencyCancelBatch(batchId, reason) {
        if (!this.config.emergencyCancelEnabled) {
            throw new Error('Emergency cancellation is not enabled');
        }
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status === BatchStructure_1.BatchStatus.COMPLETED) {
            throw new Error('Cannot cancel a completed batch');
        }
        batch.status = BatchStructure_1.BatchStatus.CANCELLED;
        batch.failureReason = reason;
        if (this.onBatchCancelled) {
            this.onBatchCancelled(batchId, reason);
        }
    }
    // --- Gas Optimization ---
    optimizeBatchGas(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        const optimizedTransactions = BatchingLib_1.BatchingLib.optimizeTransactions(batch.transactions, this.config.gasOptimization);
        const gasEstimate = BatchingLib_1.BatchingLib.estimateGasCost(optimizedTransactions);
        const gasSavings = BatchingLib_1.BatchingLib.calculateGasSavings(batch.transactions, optimizedTransactions);
        return {
            isValid: true,
            errors: [],
            warnings: gasSavings < this.config.gasOptimization.targetGasSavings
                ? [`Gas savings ${gasSavings.toFixed(2)}% below target ${this.config.gasOptimization.targetGasSavings}%`]
                : [],
            gasEstimate,
            optimizedTransactions
        };
    }
    estimateBatchGas(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        return BatchingLib_1.BatchingLib.estimateGasCost(batch.transactions);
    }
    // --- Status and Monitoring ---
    getBatchStatus(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        return batch.status;
    }
    getBatchMetrics() {
        return { ...this.metrics };
    }
    getTransactionsByPriority(batchId, priority) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        return batch.transactions.filter(tx => tx.priority === priority);
    }
    // --- Configuration ---
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    // --- Private Helper Methods ---
    async executeTransaction(transaction) {
        // Simulate transaction execution
        // In a real implementation, this would interact with the blockchain
        const beforeState = {
            balance: 1000,
            nonce: this.transactionNonce
        };
        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 10));
        const afterState = {
            balance: beforeState.balance - (transaction.value || 0),
            nonce: beforeState.nonce + 1
        };
        // Simulate occasional failures for testing - but make it more predictable
        // Only fail if the transaction ID contains "fail" for deterministic testing
        const shouldFail = transaction.id.includes('fail');
        const success = !shouldFail;
        return { success, beforeState, afterState };
    }
    async executeRollback(rollbackData) {
        // Simulate rollback execution
        await new Promise(resolve => setTimeout(resolve, 5));
        // In a real implementation, this would restore the beforeState
        console.log(`Rolling back transaction ${rollbackData.transactionId}`);
    }
    updateMetrics(result) {
        this.metrics.totalTransactionsProcessed += result.executedTransactions.length;
        // Update average execution time
        const totalExecutionTime = this.metrics.averageExecutionTime * (this.metrics.successfulBatches + this.metrics.failedBatches - 1);
        this.metrics.averageExecutionTime = (totalExecutionTime + result.executionTime) / (this.metrics.successfulBatches + this.metrics.failedBatches);
        // Update average gas savings (simplified calculation)
        const currentGasSavings = 40; // Placeholder - would calculate actual savings
        const totalGasSavings = this.metrics.averageGasSavings * (this.metrics.successfulBatches - 1);
        this.metrics.averageGasSavings = (totalGasSavings + currentGasSavings) / this.metrics.successfulBatches;
    }
}
exports.BatchProcessor = BatchProcessor;
//# sourceMappingURL=BatchProcessor.js.map