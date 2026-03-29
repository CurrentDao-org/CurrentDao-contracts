export enum WorkflowMode {
    SEQUENTIAL = 'sequential',
    PARALLEL = 'parallel'
}

export enum TransactionStatus {
    PENDING = 'pending',
    READY = 'ready',
    EXECUTED = 'executed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired'
}

export interface WorkflowStage {
    id: string;
    name: string;
    approvers: string[];
    minApprovals: number;
    timelockMs: number;
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    mode: WorkflowMode;
    stages: WorkflowStage[];
}

export interface HierarchicalThresholdRule {
    id: string;
    minAmount: number;
    maxAmount: number;
    requiredSignatures: number;
    eligibleSigners: string[];
    minExecutionDelayMs: number;
}

export interface AdvancedTransaction {
    id: string;
    to: string;
    value: number;
    data: string;
    submittedBy: string;
    createdAt: number;
    executeAfter: number;
    expiresAt: number;
    status: TransactionStatus;
    workflowId: string;
    workflowMode: WorkflowMode;
    requiredSignatures: number;
    eligibleSigners: string[];
    stages: WorkflowStage[];
    stageApprovals: Record<string, string[]>;
    stageReadyAt: Record<string, number>;
    stageCompletedAt: Record<string, number>;
    currentStageIndex: number;
    confirmationCount: number;
    batchId?: string;
    lastUpdatedAt: number;
    executedAt?: number;
    cancelledReason?: string;
}

export interface BatchPlan {
    id: string;
    submittedBy: string;
    transactionIds: string[];
    createdAt: number;
    estimatedStandaloneGas: number;
    estimatedBatchGas: number;
    gasSavings: number;
    gasSavingsPct: number;
    executed: boolean;
}

export enum EmergencyActionType {
    EXECUTE_TRANSACTION = 'execute_transaction',
    CANCEL_TRANSACTION = 'cancel_transaction'
}

export interface EmergencyOverrideRequest {
    id: string;
    transactionId: string;
    action: EmergencyActionType;
    reason: string;
    requestedBy: string;
    createdAt: number;
    approvals: string[];
    executed: boolean;
}

export interface AdvancedMultiSigConfig {
    transactionExpiryMs: number;
    signatureTimelockMs: number;
    emergencySuperMajorityPct: number;
    defaultWorkflowMode: WorkflowMode;
}
