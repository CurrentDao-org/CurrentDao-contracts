"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyControls = void 0;
class PrivacyControls {
    authorizedAuditors;
    // Mock storage of raw trade metadata linked to a secure identifier
    offChainStorage;
    constructor() {
        this.authorizedAuditors = new Set();
        this.offChainStorage = new Map();
    }
    grantAuditAccess(auditor) {
        this.authorizedAuditors.add(auditor);
    }
    revokeAuditAccess(auditor) {
        this.authorizedAuditors.delete(auditor);
    }
    hasAuditAccess(auditor) {
        return this.authorizedAuditors.has(auditor);
    }
    /**
     * Simulates storing private data that is linked to a trade identifier.
     * In production this could be encrypted on IPFS with keys shared only with auditors.
     */
    secureTradeData(tradeId, metadata) {
        this.offChainStorage.set(tradeId, { ...metadata });
    }
    /**
     * Simulates selective disclosure for regulatory compliance.
     * If the auditor is authorized, returns the detailed unencrypted metadata.
     */
    revealTradeDetails(tradeId, auditor) {
        if (!this.hasAuditAccess(auditor)) {
            throw new Error('Unauthorized Access: Auditor does not have compliance access right.');
        }
        const data = this.offChainStorage.get(tradeId);
        return data || null;
    }
}
exports.PrivacyControls = PrivacyControls;
//# sourceMappingURL=PrivacyControls.js.map