import type { IZeroKnowledgeProof, ITradeMetadata, IPublicSignals, IZKProof } from './interfaces/IZeroKnowledgeProof';
import { PrivacyControls } from './privacy/PrivacyControls';
/**
 * Main facade for Zero-Knowledge Proof system in the CurrentDao ecosystem.
 * Enables private energy trading by masking sensitive details off-chain
 * and verifying proofs with < 200k gas equivalence.
 */
export declare class ZeroKnowledgeProof implements IZeroKnowledgeProof {
    private generator;
    private verifier;
    privacy: PrivacyControls;
    constructor();
    generateProof(metadata: ITradeMetadata): Promise<{
        proof: IZKProof;
        publicSignals: IPublicSignals;
    }>;
    verifyProof(proof: IZKProof, publicSignals: IPublicSignals): Promise<boolean>;
    generateBatchProofs(metadataBatch: ITradeMetadata[]): Promise<{
        proof: IZKProof;
        publicSignals: IPublicSignals;
    }[]>;
    verifyBatchProofs(proofs: IZKProof[], publicSignalsBatch: IPublicSignals[]): Promise<boolean[]>;
}
//# sourceMappingURL=ZeroKnowledgeProof.d.ts.map