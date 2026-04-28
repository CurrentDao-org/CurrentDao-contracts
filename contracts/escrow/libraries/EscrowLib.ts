import { EscrowDeposit, EscrowStatus } from '../structures/EscrowStructs';

export class EscrowLib {
    static generateEscrowId(buyer: string, seller: string, amount: bigint, nonce: number): string {
        return `escrow_${buyer}_${seller}_${amount}_${nonce}_${Date.now()}`;
    }

    static isExpired(escrow: EscrowDeposit): boolean {
        return Date.now() > escrow.expiresAt;
    }

    static canSettle(escrow: EscrowDeposit): boolean {
        return escrow.status === EscrowStatus.DELIVERED;
    }

    static canRefund(escrow: EscrowDeposit): boolean {
        return (
            escrow.status === EscrowStatus.ACTIVE &&
            EscrowLib.isExpired(escrow)
        );
    }

    static validateParticipantShares(participants: Array<{ address: string; share: number }>): void {
        if (participants.length > 10) throw new Error('EscrowLib: max 10 participants');
        const total = participants.reduce((sum, p) => sum + p.share, 0);
        if (total !== 100) throw new Error('EscrowLib: participant shares must sum to 100');
    }

    static calculateSettlementAmount(amount: bigint, share: number): bigint {
        return (amount * BigInt(share)) / BigInt(100);
    }

    // Gas optimization: batch multiple escrow operations
    static estimateGasSavings(batchSize: number): number {
        const individualGas = 120000;
        const batchGas = individualGas * batchSize * 0.4; // ~60% savings
        return individualGas * batchSize - batchGas;
    }
}
