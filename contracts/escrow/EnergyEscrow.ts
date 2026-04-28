import { IEnergyEscrow } from './interfaces/IEnergyEscrow';
import { EscrowDeposit, EscrowStatus, Dispute, DisputeResolution, EscrowParticipant } from './structures/EscrowStructs';
import { EscrowLib } from './libraries/EscrowLib';

/**
 * EnergyEscrow - Secure energy transaction escrow with automated settlement,
 * multi-party support, dispute resolution, and WATT token integration.
 * Resolves issue #88.
 */
export class EnergyEscrow implements IEnergyEscrow {
    private escrows: Map<string, EscrowDeposit> = new Map();
    private disputes: Map<string, Dispute> = new Map();
    private balances: Map<string, bigint> = new Map(); // WATT token balances
    private nonce: number = 0;
    private owner: string;
    private arbitrator: string;
    private settledCount: number = 0;
    private totalGasSaved: number = 0;

    // Settlement executes within 5 minutes of delivery confirmation
    private readonly SETTLEMENT_DELAY_MS = 5 * 60 * 1000;
    // Dispute resolution target: 48 hours
    private readonly DISPUTE_RESOLUTION_WINDOW_MS = 48 * 60 * 60 * 1000;

    constructor(owner: string, arbitrator: string) {
        this.owner = owner;
        this.arbitrator = arbitrator;
    }

    // --- WATT Token Integration ---

    public deposit(address: string, amount: bigint): void {
        const current = this.balances.get(address) ?? 0n;
        this.balances.set(address, current + amount);
    }

    private debit(address: string, amount: bigint): void {
        const balance = this.balances.get(address) ?? 0n;
        if (balance < amount) throw new Error('EnergyEscrow: insufficient WATT balance');
        this.balances.set(address, balance - amount);
    }

    private credit(address: string, amount: bigint): void {
        const current = this.balances.get(address) ?? 0n;
        this.balances.set(address, current + amount);
    }

    public balanceOf(address: string): bigint {
        return this.balances.get(address) ?? 0n;
    }

    // --- Escrow Creation ---

    public createEscrow(
        seller: string,
        amount: bigint,
        energyAmount: number,
        expirySeconds: number,
        iotSensorId: string,
        caller: string
    ): string {
        if (amount <= 0n) throw new Error('EnergyEscrow: amount must be positive');
        if (energyAmount <= 0) throw new Error('EnergyEscrow: energy amount must be positive');

        this.debit(caller, amount);

        const id = EscrowLib.generateEscrowId(caller, seller, amount, this.nonce++);
        const escrow: EscrowDeposit = {
            id,
            buyer: caller,
            seller,
            participants: [
                { address: caller, share: 0 },
                { address: seller, share: 100 },
            ],
            amount,
            energyAmount,
            status: EscrowStatus.ACTIVE,
            createdAt: Date.now(),
            expiresAt: Date.now() + expirySeconds * 1000,
            iotSensorId,
        };

        this.escrows.set(id, escrow);
        return id;
    }

    public createMultiPartyEscrow(
        seller: string,
        participants: EscrowParticipant[],
        amount: bigint,
        energyAmount: number,
        expirySeconds: number,
        caller: string
    ): string {
        EscrowLib.validateParticipantShares(participants);
        if (amount <= 0n) throw new Error('EnergyEscrow: amount must be positive');

        this.debit(caller, amount);

        const id = EscrowLib.generateEscrowId(caller, seller, amount, this.nonce++);
        const escrow: EscrowDeposit = {
            id,
            buyer: caller,
            seller,
            participants,
            amount,
            energyAmount,
            status: EscrowStatus.ACTIVE,
            createdAt: Date.now(),
            expiresAt: Date.now() + expirySeconds * 1000,
        };

        this.escrows.set(id, escrow);
        return id;
    }

    // --- Delivery & Settlement ---

    public confirmDelivery(escrowId: string, deliveryProof: string, caller: string): void {
        const escrow = this.requireEscrow(escrowId);
        if (escrow.status !== EscrowStatus.ACTIVE) throw new Error('EnergyEscrow: not active');
        if (EscrowLib.isExpired(escrow)) throw new Error('EnergyEscrow: escrow expired');
        // IoT sensor or buyer confirms delivery
        if (caller !== escrow.buyer && caller !== escrow.iotSensorId) {
            throw new Error('EnergyEscrow: only buyer or IoT sensor can confirm delivery');
        }

        escrow.status = EscrowStatus.DELIVERED;
        escrow.deliveryConfirmedAt = Date.now();
        escrow.deliveryProof = deliveryProof;
        this.escrows.set(escrowId, escrow);
    }

    public settle(escrowId: string, caller: string): void {
        const escrow = this.requireEscrow(escrowId);
        if (!EscrowLib.canSettle(escrow)) throw new Error('EnergyEscrow: delivery not confirmed');

        // Enforce settlement within 5 minutes of delivery confirmation
        const elapsed = Date.now() - (escrow.deliveryConfirmedAt ?? 0);
        if (elapsed > this.SETTLEMENT_DELAY_MS && caller !== this.owner) {
            throw new Error('EnergyEscrow: settlement window exceeded, owner must settle');
        }

        // Distribute to participants
        for (const participant of escrow.participants) {
            if (participant.share > 0) {
                const payout = EscrowLib.calculateSettlementAmount(escrow.amount, participant.share);
                this.credit(participant.address, payout);
            }
        }

        escrow.status = EscrowStatus.SETTLED;
        escrow.settledAt = Date.now();
        this.escrows.set(escrowId, escrow);
        this.settledCount++;
        this.totalGasSaved += EscrowLib.estimateGasSavings(1);
    }

    public refund(escrowId: string, caller: string): void {
        const escrow = this.requireEscrow(escrowId);
        if (!EscrowLib.canRefund(escrow)) throw new Error('EnergyEscrow: cannot refund');
        if (caller !== escrow.buyer && caller !== this.owner) {
            throw new Error('EnergyEscrow: only buyer or owner can refund');
        }

        this.credit(escrow.buyer, escrow.amount);
        escrow.status = EscrowStatus.REFUNDED;
        this.escrows.set(escrowId, escrow);
    }

    // --- Dispute Resolution ---

    public initiateDispute(escrowId: string, reason: string, caller: string): void {
        const escrow = this.requireEscrow(escrowId);
        if (escrow.status !== EscrowStatus.ACTIVE && escrow.status !== EscrowStatus.DELIVERED) {
            throw new Error('EnergyEscrow: cannot dispute in current state');
        }
        if (caller !== escrow.buyer && caller !== escrow.seller) {
            throw new Error('EnergyEscrow: only buyer or seller can dispute');
        }

        const dispute: Dispute = {
            escrowId,
            initiator: caller,
            reason,
            createdAt: Date.now(),
            resolution: DisputeResolution.PENDING,
            arbitrator: this.arbitrator,
        };

        escrow.status = EscrowStatus.DISPUTED;
        this.escrows.set(escrowId, escrow);
        this.disputes.set(escrowId, dispute);
    }

    public resolveDispute(escrowId: string, resolution: DisputeResolution, caller: string): void {
        if (caller !== this.arbitrator && caller !== this.owner) {
            throw new Error('EnergyEscrow: only arbitrator can resolve disputes');
        }

        const escrow = this.requireEscrow(escrowId);
        if (escrow.status !== EscrowStatus.DISPUTED) throw new Error('EnergyEscrow: not disputed');

        const dispute = this.disputes.get(escrowId);
        if (!dispute) throw new Error('EnergyEscrow: dispute not found');

        if (resolution === DisputeResolution.BUYER_WINS) {
            this.credit(escrow.buyer, escrow.amount);
        } else if (resolution === DisputeResolution.SELLER_WINS) {
            this.credit(escrow.seller, escrow.amount);
        } else if (resolution === DisputeResolution.SPLIT) {
            const half = escrow.amount / 2n;
            this.credit(escrow.buyer, half);
            this.credit(escrow.seller, escrow.amount - half);
        }

        dispute.resolution = resolution;
        dispute.resolvedAt = Date.now();
        escrow.status = EscrowStatus.SETTLED;
        escrow.settledAt = Date.now();

        this.disputes.set(escrowId, dispute);
        this.escrows.set(escrowId, escrow);
        this.settledCount++;
    }

    // --- Queries ---

    public getEscrow(escrowId: string): EscrowDeposit {
        return this.requireEscrow(escrowId);
    }

    public getDispute(escrowId: string): Dispute | undefined {
        return this.disputes.get(escrowId);
    }

    public getGasOptimizationStats() {
        return {
            totalEscrows: this.escrows.size,
            settledCount: this.settledCount,
            gasSaved: this.totalGasSaved,
        };
    }

    private requireEscrow(escrowId: string): EscrowDeposit {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) throw new Error(`EnergyEscrow: escrow ${escrowId} not found`);
        return escrow;
    }
}
