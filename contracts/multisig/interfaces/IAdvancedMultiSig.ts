import {
    AdvancedTransaction,
    BatchPlan,
    EmergencyActionType,
    EmergencyOverrideRequest,
    HierarchicalThresholdRule,
    WorkflowDefinition
} from '../structures/WorkflowStructure';
import { MultiSigAnalytics, SignerAnalytics } from '../structures/SignatureStructure';

export interface IAdvancedMultiSig {
    submitTransaction(to: string, value: number, data: string, sender: string, workflowId?: string): string;
    submitBatch(
        transactions: Array<{ to: string; value: number; data: string }>,
        sender: string,
        workflowId?: string
    ): string;
    confirmTransaction(transactionId: string, sender: string, stageId?: string): void;
    revokeSignature(transactionId: string, sender: string, stageId?: string): void;
    executeTransaction(transactionId: string, sender: string): void;
    executeBatch(batchId: string, sender: string): string[];

    registerWorkflow(workflow: WorkflowDefinition, sender: string): void;
    setHierarchicalRules(rules: HierarchicalThresholdRule[], sender: string): void;

    registerIntegration(contractId: string, handler: (tx: AdvancedTransaction) => void, sender: string): void;
    getRegisteredIntegrations(): string[];

    requestEmergencyOverride(
        transactionId: string,
        action: EmergencyActionType,
        reason: string,
        sender: string
    ): string;
    approveEmergencyOverride(requestId: string, sender: string): void;
    executeEmergencyOverride(requestId: string, sender: string): void;
    getEmergencyOverrideRequest(requestId: string): EmergencyOverrideRequest;

    getTransaction(transactionId: string): AdvancedTransaction;
    getBatchPlan(batchId: string): BatchPlan;
    getOwners(): string[];
    getSystemAnalytics(): MultiSigAnalytics;
    getSignerAnalytics(signer: string): SignerAnalytics;
    getRequiredSignaturesForAmount(amount: number): number;
}
