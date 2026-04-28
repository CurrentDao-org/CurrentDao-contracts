import { EscrowDeposit, Dispute, DisputeResolution } from '../structures/EscrowStructs';

export interface IEnergyEscrow {
    createEscrow(
        seller: string,
        amount: bigint,
        energyAmount: number,
        expirySeconds: number,
        iotSensorId: string,
        caller: string
    ): string;

    createMultiPartyEscrow(
        seller: string,
        participants: Array<{ address: string; share: number }>,
        amount: bigint,
        energyAmount: number,
        expirySeconds: number,
        caller: string
    ): string;

    confirmDelivery(escrowId: string, deliveryProof: string, caller: string): void;

    settle(escrowId: string, caller: string): void;

    refund(escrowId: string, caller: string): void;

    initiateDispute(escrowId: string, reason: string, caller: string): void;

    resolveDispute(escrowId: string, resolution: DisputeResolution, caller: string): void;

    getEscrow(escrowId: string): EscrowDeposit;

    getDispute(escrowId: string): Dispute | undefined;

    getGasOptimizationStats(): { totalEscrows: number; settledCount: number; gasSaved: number };
}
