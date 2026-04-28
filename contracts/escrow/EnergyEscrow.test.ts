import { EnergyEscrow } from './EnergyEscrow';
import { EscrowStatus, DisputeResolution } from './structures/EscrowStructs';

describe('EnergyEscrow', () => {
    let escrow: EnergyEscrow;
    const owner = 'owner';
    const arbitrator = 'arbitrator';
    const buyer = 'buyer';
    const seller = 'seller';

    beforeEach(() => {
        escrow = new EnergyEscrow(owner, arbitrator);
        escrow.deposit(buyer, 1000n);
    });

    describe('createEscrow', () => {
        it('creates an escrow and debits buyer', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            expect(id).toBeDefined();
            expect(escrow.balanceOf(buyer)).toBe(500n);
            expect(escrow.getEscrow(id).status).toBe(EscrowStatus.ACTIVE);
        });

        it('rejects zero amount', () => {
            expect(() => escrow.createEscrow(seller, 0n, 100, 3600, 'sensor1', buyer)).toThrow();
        });

        it('rejects insufficient balance', () => {
            expect(() => escrow.createEscrow(seller, 2000n, 100, 3600, 'sensor1', buyer)).toThrow();
        });
    });

    describe('createMultiPartyEscrow', () => {
        it('creates multi-party escrow with valid shares', () => {
            const participants = [
                { address: seller, share: 80 },
                { address: 'third', share: 20 },
            ];
            const id = escrow.createMultiPartyEscrow(seller, participants, 500n, 100, 3600, buyer);
            expect(escrow.getEscrow(id).participants).toHaveLength(2);
        });

        it('rejects shares not summing to 100', () => {
            const participants = [{ address: seller, share: 50 }];
            expect(() =>
                escrow.createMultiPartyEscrow(seller, participants, 500n, 100, 3600, buyer)
            ).toThrow();
        });

        it('rejects more than 10 participants', () => {
            const participants = Array.from({ length: 11 }, (_, i) => ({
                address: `addr${i}`,
                share: i === 0 ? 10 : 9,
            }));
            expect(() =>
                escrow.createMultiPartyEscrow(seller, participants, 500n, 100, 3600, buyer)
            ).toThrow();
        });
    });

    describe('confirmDelivery', () => {
        it('buyer can confirm delivery', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            escrow.confirmDelivery(id, 'proof123', buyer);
            expect(escrow.getEscrow(id).status).toBe(EscrowStatus.DELIVERED);
        });

        it('IoT sensor can confirm delivery', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            escrow.confirmDelivery(id, 'proof123', 'sensor1');
            expect(escrow.getEscrow(id).status).toBe(EscrowStatus.DELIVERED);
        });

        it('rejects unauthorized confirmation', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            expect(() => escrow.confirmDelivery(id, 'proof', seller)).toThrow();
        });
    });

    describe('settle', () => {
        it('settles and credits seller', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            escrow.confirmDelivery(id, 'proof', buyer);
            escrow.settle(id, buyer);
            expect(escrow.getEscrow(id).status).toBe(EscrowStatus.SETTLED);
            expect(escrow.balanceOf(seller)).toBe(500n);
        });

        it('rejects settle without delivery confirmation', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            expect(() => escrow.settle(id, buyer)).toThrow();
        });
    });

    describe('dispute resolution', () => {
        it('buyer can initiate dispute', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            escrow.initiateDispute(id, 'energy not delivered', buyer);
            expect(escrow.getEscrow(id).status).toBe(EscrowStatus.DISPUTED);
        });

        it('arbitrator resolves dispute in buyer favor', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            escrow.initiateDispute(id, 'reason', buyer);
            escrow.resolveDispute(id, DisputeResolution.BUYER_WINS, arbitrator);
            expect(escrow.balanceOf(buyer)).toBe(1000n); // got refund
            expect(escrow.getDispute(id)?.resolution).toBe(DisputeResolution.BUYER_WINS);
        });

        it('arbitrator resolves dispute with split', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            escrow.initiateDispute(id, 'reason', buyer);
            escrow.resolveDispute(id, DisputeResolution.SPLIT, arbitrator);
            expect(escrow.balanceOf(buyer)).toBe(750n); // 500 remaining + 250 refund
            expect(escrow.balanceOf(seller)).toBe(250n);
        });
    });

    describe('gas optimization', () => {
        it('tracks settled count and gas savings', () => {
            const id = escrow.createEscrow(seller, 500n, 100, 3600, 'sensor1', buyer);
            escrow.confirmDelivery(id, 'proof', buyer);
            escrow.settle(id, buyer);
            const stats = escrow.getGasOptimizationStats();
            expect(stats.settledCount).toBe(1);
            expect(stats.gasSaved).toBeGreaterThan(0);
        });
    });
});
