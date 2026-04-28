export enum ReportType {
    ENERGY_PRODUCTION = 'ENERGY_PRODUCTION',
    EMISSIONS = 'EMISSIONS',
    GRID_STABILITY = 'GRID_STABILITY',
    FINANCIAL = 'FINANCIAL',
    COMPLIANCE = 'COMPLIANCE',
    ENVIRONMENTAL = 'ENVIRONMENTAL',
}

export enum ReportStatus {
    DRAFT = 'DRAFT',
    VALIDATED = 'VALIDATED',
    SUBMITTED = 'SUBMITTED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
}

export enum ReportingFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    ANNUAL = 'ANNUAL',
}

export interface ComplianceData {
    entityId: string;
    period: string; // e.g. "2026-Q1"
    energyProduced: number; // kWh
    energyConsumed: number; // kWh
    co2Emissions: number; // tonnes
    renewablePercentage: number; // 0-100
    gridUptime: number; // percentage
    metadata: Record<string, string>;
}

export interface RegulatoryReport {
    id: string;
    type: ReportType;
    entityId: string;
    period: string;
    data: ComplianceData;
    status: ReportStatus;
    createdAt: number;
    validatedAt?: number;
    submittedAt?: number;
    regulatorId: string;
    validationScore: number; // 0-100, target 99.9
    submissionDeadline: number;
    archiveHash: string; // content hash for 7+ year archive
}

export interface RegulatorySchedule {
    entityId: string;
    reportType: ReportType;
    frequency: ReportingFrequency;
    regulatorId: string;
    nextDue: number;
    lastSubmitted?: number;
}

export interface ComplianceInsight {
    entityId: string;
    period: string;
    complianceScore: number; // 0-100
    recommendations: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    generatedAt: number;
}
