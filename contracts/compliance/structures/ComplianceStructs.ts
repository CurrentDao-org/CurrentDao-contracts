export enum ComplianceStatus {
    Compliant = 'Compliant',
    NonCompliant = 'NonCompliant',
    Pending = 'Pending',
    Exempt = 'Exempt'
}

export enum JurisdictionType {
    National = 'National',
    Regional = 'Regional',
    International = 'International'
}

export enum AlertSeverity {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical'
}

export interface Jurisdiction {
    code: string;           // e.g. 'US', 'EU', 'UK'
    name: string;
    type: JurisdictionType;
    active: boolean;
    ruleCount: number;
    lastUpdated: number;
}

export interface ComplianceRule {
    id: string;
    jurisdictionCode: string;
    description: string;
    ruleData: string;       // Encoded rule parameters
    active: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface ComplianceCheck {
    id: string;
    transactionId: string;
    address: string;
    jurisdictionCode: string;
    status: ComplianceStatus;
    failedRules: string[];
    checkedAt: number;
}

export interface RegulatoryReport {
    id: string;
    jurisdictionCode: string;
    reportType: string;
    periodStart: number;
    periodEnd: number;
    data: string;           // Encoded report payload
    generatedAt: number;
    submittedAt: number;
}

export interface ComplianceAlert {
    id: string;
    address: string;
    jurisdictionCode: string;
    severity: AlertSeverity;
    message: string;
    resolved: boolean;
    createdAt: number;
}

export interface AuditEntry {
    id: string;
    actor: string;
    action: string;
    details: string;
    timestamp: number;
}
