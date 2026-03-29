import { ITradeMetadata, IPrivacyControls } from '../interfaces/IZeroKnowledgeProof';
export declare class PrivacyControls implements IPrivacyControls {
    private authorizedAuditors;
    private offChainStorage;
    constructor();
    grantAuditAccess(auditor: string): void;
    revokeAuditAccess(auditor: string): void;
    hasAuditAccess(auditor: string): boolean;
    /**
     * Simulates storing private data that is linked to a trade identifier.
     * In production this could be encrypted on IPFS with keys shared only with auditors.
     */
    secureTradeData(tradeId: string, metadata: ITradeMetadata): void;
    /**
     * Simulates selective disclosure for regulatory compliance.
     * If the auditor is authorized, returns the detailed unencrypted metadata.
     */
    revealTradeDetails(tradeId: string, auditor: string): ITradeMetadata | null;
}
//# sourceMappingURL=PrivacyControls.d.ts.map