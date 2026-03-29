import type { IZKProof, IPublicSignals, ITradeMetadata } from '../interfaces/IZeroKnowledgeProof';
export declare class ProofGenerator {
    /**
     * Generates a zk-SNARK proof for a single private energy trade.
     * Ensures generation within performance constraints.
     */
    generateTradeProof(metadata: ITradeMetadata): Promise<{
        proof: IZKProof;
        publicSignals: IPublicSignals;
    }>;
    /**
     * Generates proofs for a batch of trades, optimizing performance for scalability.
     * Required to handle 100+ proofs efficiently.
     */
    generateBatchProofs(metadataBatch: ITradeMetadata[]): Promise<{
        proof: IZKProof;
        publicSignals: IPublicSignals;
    }[]>;
}
//# sourceMappingURL=ProofGenerator.d.ts.map