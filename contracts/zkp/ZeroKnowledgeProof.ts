import type { IZeroKnowledgeProof, ITradeMetadata, IPublicSignals, IZKProof } from './interfaces/IZeroKnowledgeProof';
import { ProofGenerator } from './proofs/ProofGenerator';
import { ProofVerifier } from './verification/ProofVerifier';
import { PrivacyControls } from './privacy/PrivacyControls';
import crypto from 'node:crypto';

/**
 * Main facade for Zero-Knowledge Proof system in the CurrentDao ecosystem.
 * Enables private energy trading by masking sensitive details off-chain 
 * and verifying proofs with < 200k gas equivalence.
 */
export class ZeroKnowledgeProof implements IZeroKnowledgeProof {
    private generator: ProofGenerator;
    private verifier: ProofVerifier;
    public privacy: PrivacyControls;

    constructor() {
        this.generator = new ProofGenerator();
        this.verifier = new ProofVerifier();
        this.privacy = new PrivacyControls();
    }

    async generateProof(metadata: ITradeMetadata): Promise<{ proof: IZKProof; publicSignals: IPublicSignals }> {
        const result = await this.generator.generateTradeProof(metadata);
        
        // Securely link raw metadata for regulators using the nullifier
        const lookupId = result.publicSignals.nullifierHash;
        this.privacy.secureTradeData(lookupId, metadata);

        return result;
    }

    async verifyProof(proof: IZKProof, publicSignals: IPublicSignals): Promise<boolean> {
        return this.verifier.verifyTradeProof(proof, publicSignals);
    }

    async generateBatchProofs(metadataBatch: ITradeMetadata[]): Promise<{ proof: IZKProof; publicSignals: IPublicSignals }[]> {
        const results = await this.generator.generateBatchProofs(metadataBatch);
        
        // Secure metadata for each batched proof
        results.forEach((res, i) => {
            const lookupId = res.publicSignals.nullifierHash;
            this.privacy.secureTradeData(lookupId, metadataBatch[i]);
        });

        return results;
    }

    async verifyBatchProofs(proofs: IZKProof[], publicSignalsBatch: IPublicSignals[]): Promise<boolean[]> {
        return this.verifier.verifyBatchProofs(proofs, publicSignalsBatch);
    }
}
