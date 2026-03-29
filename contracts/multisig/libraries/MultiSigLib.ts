import { Transaction } from '../structures/MultiSigStructure';

export class MultiSigLib {
    /**
     * Checks if a transaction has enough confirmations.
     */
    public static isReady(transaction: Transaction, threshold: number): boolean {
        return transaction.numConfirmations >= threshold && !transaction.executed;
    }

    /**
     * Hashes transaction details to generate a unique ID.
     */
    public static hash(to: string, value: number, data: string, nonce: number): string {
        // Mock hash generation
        return `MS_TX_${to.slice(0, 6)}_${value}_${nonce}_${Date.now()}`;
    }

    /**
     * Checks if a transaction is still valid to be executed.
     */
    public static isValid(transaction: Transaction, currentTime: number): boolean {
        return currentTime <= transaction.deadline && !transaction.executed;
    }

    /**
     * Estimates the gas cost of a single signature operation.
     */
    public static estimateSignatureGas(signatureCount: number): number {
        const baseSignatureGas = 18000;
        return Math.max(baseSignatureGas, signatureCount * baseSignatureGas);
    }

    /**
     * Estimates gas for a multisig transaction with workflow and signature complexity.
     */
    public static estimateTransactionGas(data: string, workflowStages: number, signatureCount: number): number {
        const baseGas = 45000;
        const dataGas = data.length * 12;
        const workflowGas = workflowStages * 10000;
        const signatureGas = this.estimateSignatureGas(signatureCount);
        return baseGas + dataGas + workflowGas + signatureGas;
    }

    /**
     * Calculates optimized gas usage for a transaction batch.
     */
    public static optimizeBatchGas(estimatedGasPerTx: number[]): {
        originalGas: number;
        optimizedGas: number;
        gasSavings: number;
        gasSavingsPct: number;
    } {
        const originalGas = estimatedGasPerTx.reduce((sum, gas) => sum + gas, 0);
        if (estimatedGasPerTx.length === 0) {
            return {
                originalGas: 0,
                optimizedGas: 0,
                gasSavings: 0,
                gasSavingsPct: 0
            };
        }

        // Simulate storage/read amortization for batched execution.
        const batchingDiscountPct = Math.min(25, 10 + estimatedGasPerTx.length * 2);
        const optimizedGas = Math.floor(originalGas * (1 - batchingDiscountPct / 100));
        const gasSavings = originalGas - optimizedGas;

        return {
            originalGas,
            optimizedGas,
            gasSavings,
            gasSavingsPct: originalGas > 0 ? (gasSavings / originalGas) * 100 : 0
        };
    }

    /**
     * Returns the number of approvals required for a super-majority.
     */
    public static calculateSuperMajority(totalOwners: number, superMajorityPct: number): number {
        if (totalOwners < 1) return 0;
        const clampedPct = Math.max(1, Math.min(100, superMajorityPct));
        return Math.ceil(totalOwners * (clampedPct / 100));
    }
}
