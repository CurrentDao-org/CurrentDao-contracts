export enum SignatureStatus {
    ACTIVE = 'active',
    REVOKED = 'revoked'
}

export interface SignatureRecord {
    signer: string;
    transactionId: string;
    stageId: string;
    signedAt: number;
    status: SignatureStatus;
    revokedAt?: number;
}

export interface SignerAnalytics {
    signer: string;
    signedCount: number;
    revokedCount: number;
    averageDelayMs: number;
    lastSignedAt: number;
    lastRevokedAt?: number;
}

export interface MultiSigAnalytics {
    totalTransactions: number;
    readyTransactions: number;
    executedTransactions: number;
    cancelledTransactions: number;
    expiredTransactions: number;
    totalSignatures: number;
    totalRevocations: number;
    averageConfirmationDelayMs: number;
    totalBatchGasSavings: number;
    signerAnalytics: SignerAnalytics[];
}
