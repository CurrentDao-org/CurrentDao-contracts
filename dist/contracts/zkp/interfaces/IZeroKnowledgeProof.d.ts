export interface IZKProof {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
    protocol: string;
    curve: string;
}
export interface IPublicSignals {
    nullifierHash: string;
    merkleRoot: string;
    energyAmount: string;
}
export interface ITradeMetadata {
    sender: string;
    recipient: string;
    energyAmount: number;
    pricePerUnit: number;
    timestamp: number;
}
export interface IZeroKnowledgeProof {
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
export interface IPrivacyControls {
    grantAuditAccess(auditor: string): void;
    revokeAuditAccess(auditor: string): void;
    hasAuditAccess(auditor: string): boolean;
    revealTradeDetails(tradeId: string, auditor: string): ITradeMetadata | null;
}
//# sourceMappingURL=IZeroKnowledgeProof.d.ts.map