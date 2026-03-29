"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroKnowledgeProof = void 0;
const ProofGenerator_1 = require("./proofs/ProofGenerator");
const ProofVerifier_1 = require("./verification/ProofVerifier");
const PrivacyControls_1 = require("./privacy/PrivacyControls");
/**
 * Main facade for Zero-Knowledge Proof system in the CurrentDao ecosystem.
 * Enables private energy trading by masking sensitive details off-chain
 * and verifying proofs with < 200k gas equivalence.
 */
class ZeroKnowledgeProof {
    generator;
    verifier;
    privacy;
    constructor() {
        this.generator = new ProofGenerator_1.ProofGenerator();
        this.verifier = new ProofVerifier_1.ProofVerifier();
        this.privacy = new PrivacyControls_1.PrivacyControls();
    }
    async generateProof(metadata) {
        const result = await this.generator.generateTradeProof(metadata);
        // Securely link raw metadata for regulators using the nullifier
        const lookupId = result.publicSignals.nullifierHash;
        this.privacy.secureTradeData(lookupId, metadata);
        return result;
    }
    async verifyProof(proof, publicSignals) {
        return this.verifier.verifyTradeProof(proof, publicSignals);
    }
    async generateBatchProofs(metadataBatch) {
        const results = await this.generator.generateBatchProofs(metadataBatch);
        // Secure metadata for each batched proof
        results.forEach((res, i) => {
            const lookupId = res.publicSignals.nullifierHash;
            this.privacy.secureTradeData(lookupId, metadataBatch[i]);
        });
        return results;
    }
    async verifyBatchProofs(proofs, publicSignalsBatch) {
        return this.verifier.verifyBatchProofs(proofs, publicSignalsBatch);
    }
}
exports.ZeroKnowledgeProof = ZeroKnowledgeProof;
//# sourceMappingURL=ZeroKnowledgeProof.js.map