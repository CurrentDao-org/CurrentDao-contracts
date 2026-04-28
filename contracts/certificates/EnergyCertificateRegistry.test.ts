import { EnergyCertificateRegistry } from './EnergyCertificateRegistry';
import { CertificateStatus, EnergySource } from './structures/CertificateStructs';

describe('EnergyCertificateRegistry', () => {
    let registry: EnergyCertificateRegistry;
    const owner = 'owner-address';
    const producer = 'producer-address';
    const buyer = 'buyer-address';
    const verifier = 'verifier-address';

    beforeEach(() => {
        registry = new EnergyCertificateRegistry(owner);
        registry.registerProducer(producer, owner);
        registry.addVerifier(verifier, owner);
    });

    describe('Certificate issuance', () => {
        it('issues a certificate for an authorized producer', () => {
            const id = registry.issueCertificate(
                producer, EnergySource.Solar, 100,
                Date.now() - 1000, Date.now(), 'US', 'ipfs://meta'
            );
            const cert = registry.getCertificate(id);
            expect(cert.status).toBe(CertificateStatus.Active);
            expect(cert.energyAmountMWh).toBe(100);
            expect(cert.energySource).toBe(EnergySource.Solar);
        });

        it('rejects issuance from unauthorized producer', () => {
            expect(() =>
                registry.issueCertificate('unknown', EnergySource.Wind, 50, 0, 1, 'EU', '')
            ).toThrow('unauthorized producer');
        });

        it('rejects invalid energy amount', () => {
            expect(() =>
                registry.issueCertificate(producer, EnergySource.Wind, 0, 0, 1, 'EU', '')
            ).toThrow('invalid energy amount');
        });
    });

    describe('Certificate transfer', () => {
        it('transfers a certificate to a new owner', () => {
            const id = registry.issueCertificate(producer, EnergySource.Wind, 200, 0, 1, 'EU', '');
            registry.transferCertificate(id, buyer, producer);
            const cert = registry.getCertificate(id);
            expect(cert.owner).toBe(buyer);
            expect(cert.status).toBe(CertificateStatus.Transferred);
        });

        it('rejects transfer from non-owner', () => {
            const id = registry.issueCertificate(producer, EnergySource.Wind, 200, 0, 1, 'EU', '');
            expect(() => registry.transferCertificate(id, buyer, 'stranger')).toThrow('not the owner');
        });
    });

    describe('Certificate retirement', () => {
        it('retires a certificate', () => {
            const id = registry.issueCertificate(producer, EnergySource.Hydro, 50, 0, 1, 'UK', '');
            registry.retireCertificate(id, producer);
            expect(registry.getCertificate(id).status).toBe(CertificateStatus.Retired);
        });

        it('cannot retire an already retired certificate', () => {
            const id = registry.issueCertificate(producer, EnergySource.Hydro, 50, 0, 1, 'UK', '');
            registry.retireCertificate(id, producer);
            expect(() => registry.retireCertificate(id, producer)).toThrow('not retirable');
        });
    });

    describe('Batch operations', () => {
        it('batch issues multiple certificates', () => {
            const ids = registry.batchIssueCertificates(
                producer,
                [EnergySource.Solar, EnergySource.Wind],
                [100, 200],
                [0, 0],
                [1, 1],
                ['US', 'EU'],
                ['', '']
            );
            expect(ids).toHaveLength(2);
            ids.forEach(id => expect(registry.getCertificate(id).status).toBe(CertificateStatus.Active));
        });

        it('batch retires multiple certificates', () => {
            const ids = registry.batchIssueCertificates(
                producer,
                [EnergySource.Solar, EnergySource.Wind],
                [100, 200],
                [0, 0],
                [1, 1],
                ['US', 'EU'],
                ['', '']
            );
            registry.batchRetireCertificates(ids, producer);
            ids.forEach(id => expect(registry.getCertificate(id).status).toBe(CertificateStatus.Retired));
        });
    });

    describe('Trading marketplace', () => {
        it('lists and buys a certificate', () => {
            const certId = registry.issueCertificate(producer, EnergySource.Solar, 100, 0, 1, 'US', '');
            const orderId = registry.listCertificate(certId, 50, producer);
            registry.buyCertificate(orderId, buyer);
            expect(registry.getCertificate(certId).owner).toBe(buyer);
            expect(registry.getOrder(orderId).active).toBe(false);
        });

        it('cancels a listing', () => {
            const certId = registry.issueCertificate(producer, EnergySource.Solar, 100, 0, 1, 'US', '');
            const orderId = registry.listCertificate(certId, 50, producer);
            registry.cancelListing(orderId, producer);
            expect(registry.getOrder(orderId).active).toBe(false);
        });
    });

    describe('Production records', () => {
        it('records and verifies production', () => {
            const recordId = registry.recordProduction(producer, EnergySource.Solar, 500);
            registry.verifyProductionRecord(recordId, verifier);
            expect(registry.getProductionRecord(recordId).verified).toBe(true);
        });
    });

    describe('Audit trail', () => {
        it('maintains a complete audit trail', () => {
            const id = registry.issueCertificate(producer, EnergySource.Solar, 100, 0, 1, 'US', '');
            registry.transferCertificate(id, buyer, producer);
            registry.retireCertificate(id, buyer);
            const trail = registry.getAuditTrail(id);
            expect(trail.length).toBeGreaterThanOrEqual(3);
            expect(trail.some(e => e.includes('ISSUED'))).toBe(true);
            expect(trail.some(e => e.includes('TRANSFERRED'))).toBe(true);
            expect(trail.some(e => e.includes('RETIRED'))).toBe(true);
        });
    });

    describe('Queries', () => {
        it('returns certificates by owner', () => {
            registry.issueCertificate(producer, EnergySource.Solar, 100, 0, 1, 'US', '');
            registry.issueCertificate(producer, EnergySource.Wind, 200, 0, 1, 'EU', '');
            expect(registry.getCertificatesByOwner(producer)).toHaveLength(2);
        });

        it('tracks total certificates', () => {
            registry.issueCertificate(producer, EnergySource.Solar, 100, 0, 1, 'US', '');
            expect(registry.totalCertificates()).toBe(1);
        });
    });
});
