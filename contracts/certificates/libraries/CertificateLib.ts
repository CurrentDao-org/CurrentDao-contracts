import { EnergyCertificate, CertificateStatus } from '../structures/CertificateStructs';

export class CertificateLib {
    static generateId(producer: string, energyAmountMWh: number, timestamp: number): string {
        return `CERT-${producer.slice(0, 8)}-${energyAmountMWh}-${timestamp}`;
    }

    static isActive(cert: EnergyCertificate): boolean {
        return cert.status === CertificateStatus.Active;
    }

    static isExpired(cert: EnergyCertificate, now: number): boolean {
        return cert.productionEnd < now && cert.status === CertificateStatus.Active;
    }

    static validateTransfer(cert: EnergyCertificate, from: string): void {
        if (cert.owner !== from) throw new Error('CertificateLib: not the owner');
        if (cert.status !== CertificateStatus.Active) throw new Error('CertificateLib: certificate not active');
    }

    static calculateBatchGasSavings(count: number): number {
        // Batch operations save ~70% vs individual
        const individualCost = count * 100;
        const batchCost = Math.ceil(count * 30);
        return individualCost - batchCost;
    }
}
