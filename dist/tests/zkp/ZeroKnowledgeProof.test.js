"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ZeroKnowledgeProof_1 = require("../../contracts/zkp/ZeroKnowledgeProof");
describe('Zero Knowledge Proof Architecture Tests', () => {
    let zkpSystem;
    beforeEach(() => {
        zkpSystem = new ZeroKnowledgeProof_1.ZeroKnowledgeProof();
    });
    test('Should generate and verify a ZK proof successfully in under 5 seconds', async () => {
        const metadata = {
            sender: '0xSenderAddress',
            recipient: '0xRecipientAddress',
            energyAmount: 100,
            pricePerUnit: 1.5,
            timestamp: Date.now()
        };
        const startTime = Date.now();
        const { proof, publicSignals } = await zkpSystem.generateProof(metadata);
        expect(Date.now() - startTime).toBeLessThan(5000); // Acceptance: under 5s
        const isValid = await zkpSystem.verifyProof(proof, publicSignals);
        expect(isValid).toBe(true);
    });
    test('Should handle batch processing of 100+ proofs efficiently', async () => {
        const batch = Array.from({ length: 150 }).map((_, i) => ({
            sender: `0xSender${i}`,
            recipient: `0xRecipient${i}`,
            energyAmount: 50,
            pricePerUnit: 1.2,
            timestamp: Date.now()
        }));
        const results = await zkpSystem.generateBatchProofs(batch);
        expect(results).toHaveLength(150);
        const proofs = results.map(r => r.proof);
        const signals = results.map(r => r.publicSignals);
        const validArray = await zkpSystem.verifyBatchProofs(proofs, signals);
        expect(validArray.every(v => v === true)).toBe(true);
    });
    test('Privacy controls should securely gate access to full metadata', async () => {
        const metadata = {
            sender: '0xPrivateSender',
            recipient: '0xPrivateRecipient',
            energyAmount: 200,
            pricePerUnit: 2.0,
            timestamp: Date.now()
        };
        const { publicSignals } = await zkpSystem.generateProof(metadata);
        const auditor = '0xAuditor';
        zkpSystem.privacy.grantAuditAccess(auditor);
        // Retrieve the unencrypted metadata via selective disclosure using the public verifier
        const retrieved = zkpSystem.privacy.revealTradeDetails(publicSignals.nullifierHash, auditor);
        expect(retrieved?.sender).toBe('0xPrivateSender');
        zkpSystem.privacy.revokeAuditAccess(auditor);
        expect(() => zkpSystem.privacy.revealTradeDetails(publicSignals.nullifierHash, auditor)).toThrow('Unauthorized Access');
    });
});
//# sourceMappingURL=ZeroKnowledgeProof.test.js.map