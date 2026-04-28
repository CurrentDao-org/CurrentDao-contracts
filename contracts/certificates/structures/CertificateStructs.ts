export enum CertificateStatus {
    Active = 'Active',
    Transferred = 'Transferred',
    Retired = 'Retired',
    Expired = 'Expired',
    Revoked = 'Revoked'
}

export enum EnergySource {
    Solar = 'Solar',
    Wind = 'Wind',
    Hydro = 'Hydro',
    Geothermal = 'Geothermal',
    Biomass = 'Biomass'
}

export interface EnergyCertificate {
    id: string;
    owner: string;
    producer: string;
    energySource: EnergySource;
    energyAmountMWh: number;
    productionStart: number;
    productionEnd: number;
    jurisdictionCode: string;
    status: CertificateStatus;
    metadataURI: string;
    issuedAt: number;
    retiredAt: number;
}

export interface CertificateTransfer {
    id: string;
    certificateId: string;
    from: string;
    to: string;
    transferredAt: number;
}

export interface CertificateOrder {
    id: string;
    seller: string;
    certificateId: string;
    pricePerMWh: number;
    active: boolean;
    createdAt: number;
}

export interface ProductionRecord {
    id: string;
    producer: string;
    energySource: EnergySource;
    energyAmountMWh: number;
    recordedAt: number;
    verified: boolean;
}

export interface AuditEntry {
    certificateId: string;
    action: string;
    actor: string;
    timestamp: number;
}
