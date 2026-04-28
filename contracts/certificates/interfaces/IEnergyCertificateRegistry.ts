import { EnergyCertificate, CertificateOrder, ProductionRecord, EnergySource } from '../structures/CertificateStructs';

export interface IEnergyCertificateRegistry {
    // Registry management
    registerProducer(producer: string, caller: string): void;
    revokeProducer(producer: string, caller: string): void;

    // Certificate lifecycle
    issueCertificate(
        producer: string,
        energySource: EnergySource,
        energyAmountMWh: number,
        productionStart: number,
        productionEnd: number,
        jurisdictionCode: string,
        metadataURI: string
    ): string;

    transferCertificate(certificateId: string, to: string, caller: string): void;
    retireCertificate(certificateId: string, caller: string): void;
    revokeCertificate(certificateId: string, caller: string): void;

    // Batch operations (gas-optimized)
    batchIssueCertificates(
        producer: string,
        energySources: EnergySource[],
        amounts: number[],
        starts: number[],
        ends: number[],
        jurisdictions: string[],
        metadataURIs: string[]
    ): string[];

    batchRetireCertificates(certificateIds: string[], caller: string): void;

    // Trading marketplace
    listCertificate(certificateId: string, pricePerMWh: number, caller: string): string;
    cancelListing(orderId: string, caller: string): void;
    buyCertificate(orderId: string, buyer: string): void;

    // Production records
    recordProduction(
        producer: string,
        energySource: EnergySource,
        energyAmountMWh: number
    ): string;
    verifyProductionRecord(recordId: string, caller: string): void;

    // Queries
    getCertificate(certificateId: string): EnergyCertificate;
    getOrder(orderId: string): CertificateOrder;
    getProductionRecord(recordId: string): ProductionRecord;
    getCertificatesByOwner(owner: string): string[];
    getAuditTrail(certificateId: string): string[];
    totalCertificates(): number;
}
