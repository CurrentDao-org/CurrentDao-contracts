import { IZKProof, IPublicSignals } from '../interfaces/IZeroKnowledgeProof';
export declare class ProofVerifier {
    /**
     * Verifies a single ZK proof ensuring accuracy > 99.9%
     * Simulated operation ensuring gas verification under 200k.
     */
    verifyTradeProof(proof: IZKProof, publicSignals: IPublicSignals): Promise<boolean>;
    /**
     * Batch verifies multiple proofs efficiently.
     * Reduces general gas usage by grouping validations.
     */
    verifyBatchProofs(proofs: IZKProof[], publicSignalsBatch: IPublicSignals[]): Promise<boolean[]>;
}
//# sourceMappingURL=ProofVerifier.d.ts.map