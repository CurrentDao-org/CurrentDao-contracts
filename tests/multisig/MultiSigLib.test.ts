import { MultiSigLib } from '../../contracts/multisig/libraries/MultiSigLib';
import { Transaction } from '../../contracts/multisig/structures/MultiSigStructure';

describe('MultiSigLib', () => {
    it('evaluates readiness and validity for legacy transaction structure', () => {
        const tx: Transaction = {
            id: 'tx',
            to: '0xTarget',
            value: 10,
            data: '0xabc',
            executed: false,
            numConfirmations: 2,
            timestamp: Date.now(),
            deadline: Date.now() + 10_000
        };

        expect(MultiSigLib.isReady(tx, 2)).toBe(true);
        expect(MultiSigLib.isReady(tx, 3)).toBe(false);
        expect(MultiSigLib.isValid(tx, Date.now())).toBe(true);
        expect(MultiSigLib.isValid(tx, tx.deadline + 1)).toBe(false);
    });

    it('hashes and estimates gas values', () => {
        const hash = MultiSigLib.hash('0xabc123', 25, '0xdeadbeef', 7);
        expect(hash.startsWith('MS_TX_')).toBe(true);

        expect(MultiSigLib.estimateSignatureGas(0)).toBe(18000);
        expect(MultiSigLib.estimateSignatureGas(2)).toBe(36000);

        const txGas = MultiSigLib.estimateTransactionGas('0xdeadbeef', 2, 3);
        expect(txGas).toBeGreaterThan(0);
    });

    it('optimizes batch gas and handles empty batches', () => {
        const optimized = MultiSigLib.optimizeBatchGas([100_000, 120_000, 80_000]);
        expect(optimized.originalGas).toBe(300_000);
        expect(optimized.optimizedGas).toBeLessThan(300_000);
        expect(optimized.gasSavings).toBeGreaterThan(0);
        expect(optimized.gasSavingsPct).toBeGreaterThan(0);

        const empty = MultiSigLib.optimizeBatchGas([]);
        expect(empty.originalGas).toBe(0);
        expect(empty.optimizedGas).toBe(0);
        expect(empty.gasSavings).toBe(0);
        expect(empty.gasSavingsPct).toBe(0);
    });

    it('calculates super-majority with edge cases', () => {
        expect(MultiSigLib.calculateSuperMajority(0, 75)).toBe(0);
        expect(MultiSigLib.calculateSuperMajority(5, 75)).toBe(4);
        expect(MultiSigLib.calculateSuperMajority(5, 110)).toBe(5);
        expect(MultiSigLib.calculateSuperMajority(5, -1)).toBe(1);
    });
});
