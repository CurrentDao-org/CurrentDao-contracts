export enum EscrowStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    DELIVERED = 'DELIVERED',
    DISPUTED = 'DISPUTED',
    SETTLED = 'SETTLED',
    REFUNDED = 'REFUNDED',
    EXPIRED = 'EXPIRED',
}

export enum DisputeResolution {
    PENDING = 'PENDING',
    BUYER_WINS = 'BUYER_WINS',
    SELLER_WINS = 'SELLER_WINS',
    SPLIT = 'SPLIT',
}

export interface EscrowParticipant {
    address: string;
    share: number; // percentage (0-100)
}

export interface EscrowDeposit {
    id: string;
    buyer: string;
    seller: string;
    participants: EscrowParticipant[];
    amount: bigint; // WATT tokens
    energyAmount: number; // kWh
    status: EscrowStatus;
    createdAt: number;
    expiresAt: number;
    deliveryConfirmedAt?: number;
    settledAt?: number;
    iotSensorId?: string;
    deliveryProof?: string;
}

export interface Dispute {
    escrowId: string;
    initiator: string;
    reason: string;
    createdAt: number;
    resolvedAt?: number;
    resolution: DisputeResolution;
    arbitrator?: string;
}
