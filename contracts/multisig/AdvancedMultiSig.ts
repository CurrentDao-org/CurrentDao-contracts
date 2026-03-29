import { IAdvancedMultiSig } from './interfaces/IAdvancedMultiSig';
import { MultiSigLib } from './libraries/MultiSigLib';
import {
    AdvancedMultiSigConfig,
    AdvancedTransaction,
    BatchPlan,
    EmergencyActionType,
    EmergencyOverrideRequest,
    HierarchicalThresholdRule,
    TransactionStatus,
    WorkflowDefinition,
    WorkflowMode,
    WorkflowStage
} from './structures/WorkflowStructure';
import {
    MultiSigAnalytics,
    SignatureRecord,
    SignerAnalytics,
    SignatureStatus
} from './structures/SignatureStructure';

interface InternalSignerStats {
    signedCount: number;
    revokedCount: number;
    totalDelayMs: number;
    lastSignedAt: number;
    lastRevokedAt?: number;
}

export class AdvancedMultiSig implements IAdvancedMultiSig {
    private owners: Set<string>;
    private transactions: Map<string, AdvancedTransaction> = new Map();
    private batches: Map<string, BatchPlan> = new Map();
    private workflows: Map<string, WorkflowDefinition> = new Map();
    private integrations: Map<string, (tx: AdvancedTransaction) => void> = new Map();
    private emergencyRequests: Map<string, EmergencyOverrideRequest> = new Map();
    private signatureLedger: Map<string, SignatureRecord[]> = new Map();
    private signerStats: Map<string, InternalSignerStats> = new Map();

    private hierarchicalRules: HierarchicalThresholdRule[] = [];

    private transactionNonce = 0;
    private batchNonce = 0;
    private emergencyNonce = 0;

    private totalSignatures = 0;
    private totalRevocations = 0;
    private totalConfirmationDelayMs = 0;
    private totalBatchGasSavings = 0;

    private config: AdvancedMultiSigConfig;

    constructor(
        initialOwners: string[],
        initialRules?: HierarchicalThresholdRule[],
        config?: Partial<AdvancedMultiSigConfig>
    ) {
        const sanitizedOwners = Array.from(new Set(initialOwners));
        if (sanitizedOwners.length < 2) {
            throw new Error('AdvancedMultiSig: at least two owners required');
        }

        this.owners = new Set(sanitizedOwners);
        this.config = {
            transactionExpiryMs: 7 * 24 * 60 * 60 * 1000,
            signatureTimelockMs: 5 * 60 * 1000,
            emergencySuperMajorityPct: 75,
            defaultWorkflowMode: WorkflowMode.PARALLEL,
            ...config
        };

        this.owners.forEach((owner) => {
            this.signerStats.set(owner, {
                signedCount: 0,
                revokedCount: 0,
                totalDelayMs: 0,
                lastSignedAt: 0
            });
        });

        const rules = initialRules && initialRules.length > 0
            ? initialRules
            : this.buildDefaultRules();
        this.setInternalHierarchicalRules(rules);
    }

    public submitTransaction(
        to: string,
        value: number,
        data: string,
        sender: string,
        workflowId?: string
    ): string {
        return this.createTransaction(to, value, data, sender, workflowId);
    }

    public submitBatch(
        transactions: Array<{ to: string; value: number; data: string }>,
        sender: string,
        workflowId?: string
    ): string {
        this.onlyOwner(sender);
        if (transactions.length === 0) {
            throw new Error('AdvancedMultiSig: empty batch not allowed');
        }

        const batchId = `MS_BATCH_${Date.now()}_${this.batchNonce++}`;
        const transactionIds = transactions.map((tx) =>
            this.createTransaction(tx.to, tx.value, tx.data, sender, workflowId, batchId)
        );

        const estimatedGasPerTx = transactionIds.map((transactionId) => {
            const tx = this.requireTransaction(transactionId);
            return MultiSigLib.estimateTransactionGas(tx.data, tx.stages.length, tx.requiredSignatures);
        });
        const optimization = MultiSigLib.optimizeBatchGas(estimatedGasPerTx);

        const batch: BatchPlan = {
            id: batchId,
            submittedBy: sender,
            transactionIds,
            createdAt: Date.now(),
            estimatedStandaloneGas: optimization.originalGas,
            estimatedBatchGas: optimization.optimizedGas,
            gasSavings: optimization.gasSavings,
            gasSavingsPct: optimization.gasSavingsPct,
            executed: false
        };

        this.totalBatchGasSavings += optimization.gasSavings;
        this.batches.set(batchId, batch);

        return batchId;
    }

    public confirmTransaction(transactionId: string, sender: string, stageId?: string): void {
        this.onlyOwner(sender);

        const tx = this.requireActiveTransaction(transactionId);
        if (!tx.eligibleSigners.includes(sender)) {
            throw new Error('AdvancedMultiSig: signer not eligible for this tier');
        }

        const stage = this.resolveApprovalStage(tx, sender, stageId);
        const now = Date.now();
        const stageReadyAt = tx.stageReadyAt[stage.id] || 0;
        if (stageReadyAt === 0) {
            throw new Error('AdvancedMultiSig: stage is not yet active');
        }
        if (now < stageReadyAt + stage.timelockMs) {
            throw new Error('AdvancedMultiSig: stage timelock active');
        }

        const approvals = tx.stageApprovals[stage.id] || [];
        if (approvals.includes(sender)) {
            throw new Error('AdvancedMultiSig: signer already confirmed this stage');
        }

        approvals.push(sender);
        tx.stageApprovals[stage.id] = approvals;
        if (approvals.length >= stage.minApprovals && tx.stageCompletedAt[stage.id] === 0) {
            tx.stageCompletedAt[stage.id] = now;
            if (tx.workflowMode === WorkflowMode.SEQUENTIAL) {
                const stageIndex = tx.stages.findIndex((candidate) => candidate.id === stage.id);
                const nextStage = tx.stages[stageIndex + 1];
                if (nextStage && tx.stageReadyAt[nextStage.id] === 0) {
                    tx.stageReadyAt[nextStage.id] = now;
                }
            }
        }

        this.recordSignature(tx, sender, stage.id, now);
        this.updateDerivedTransactionState(tx, now);

        this.transactions.set(tx.id, tx);
    }

    public revokeSignature(transactionId: string, sender: string, stageId?: string): void {
        this.onlyOwner(sender);

        const tx = this.requireActiveTransaction(transactionId);
        const stage = this.resolveRevocationStage(tx, sender, stageId);
        const stageIndex = tx.stages.findIndex((candidate) => candidate.id === stage.id);

        tx.stageApprovals[stage.id] = tx.stageApprovals[stage.id].filter((approver) => approver !== sender);
        if (tx.stageApprovals[stage.id].length < stage.minApprovals) {
            tx.stageCompletedAt[stage.id] = 0;
            if (tx.workflowMode === WorkflowMode.SEQUENTIAL) {
                this.resetDownstreamStages(tx, stageIndex + 1);
            }
        }

        this.recordRevocation(tx, sender, stage.id, Date.now());
        this.updateDerivedTransactionState(tx, Date.now());

        this.transactions.set(tx.id, tx);
    }

    public executeTransaction(transactionId: string, sender: string): void {
        this.onlyOwner(sender);

        const tx = this.requireActiveTransaction(transactionId);
        const now = Date.now();

        if (now < tx.executeAfter) {
            throw new Error('AdvancedMultiSig: execution timelock active');
        }

        this.updateDerivedTransactionState(tx, now);
        if (tx.status !== TransactionStatus.READY) {
            throw new Error('AdvancedMultiSig: transaction not ready for execution');
        }

        const integrationHandler = this.integrations.get(tx.to);
        if (integrationHandler) {
            integrationHandler(this.cloneTransaction(tx));
        }

        tx.status = TransactionStatus.EXECUTED;
        tx.executedAt = now;
        tx.lastUpdatedAt = now;

        this.transactions.set(tx.id, tx);
    }

    public executeBatch(batchId: string, sender: string): string[] {
        this.onlyOwner(sender);

        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error('AdvancedMultiSig: batch not found');
        }
        if (batch.executed) {
            throw new Error('AdvancedMultiSig: batch already executed');
        }

        const now = Date.now();
        const nonExecutable: string[] = [];

        batch.transactionIds.forEach((transactionId) => {
            const tx = this.requireActiveTransaction(transactionId);
            this.updateDerivedTransactionState(tx, now);
            if (tx.status !== TransactionStatus.READY || now < tx.executeAfter) {
                nonExecutable.push(transactionId);
            }
        });

        if (nonExecutable.length > 0) {
            throw new Error(
                `AdvancedMultiSig: batch contains non-executable transactions: ${nonExecutable.join(',')}`
            );
        }

        batch.transactionIds.forEach((transactionId) => this.executeTransaction(transactionId, sender));
        batch.executed = true;
        this.batches.set(batchId, batch);

        return [...batch.transactionIds];
    }

    public registerWorkflow(workflow: WorkflowDefinition, sender: string): void {
        this.onlyOwner(sender);
        this.validateWorkflowDefinition(workflow);
        this.workflows.set(workflow.id, this.cloneWorkflowDefinition(workflow));
    }

    public setHierarchicalRules(rules: HierarchicalThresholdRule[], sender: string): void {
        this.onlyOwner(sender);
        this.setInternalHierarchicalRules(rules);
    }

    public registerIntegration(contractId: string, handler: (tx: AdvancedTransaction) => void, sender: string): void {
        this.onlyOwner(sender);
        if (!contractId) {
            throw new Error('AdvancedMultiSig: integration id is required');
        }
        this.integrations.set(contractId, handler);
    }

    public getRegisteredIntegrations(): string[] {
        return Array.from(this.integrations.keys());
    }

    public requestEmergencyOverride(
        transactionId: string,
        action: EmergencyActionType,
        reason: string,
        sender: string
    ): string {
        this.onlyOwner(sender);
        const tx = this.requireTransaction(transactionId);

        if (tx.status === TransactionStatus.EXECUTED) {
            throw new Error('AdvancedMultiSig: cannot override executed transaction');
        }

        const requestId = `EM_OVERRIDE_${Date.now()}_${this.emergencyNonce++}`;
        const request: EmergencyOverrideRequest = {
            id: requestId,
            transactionId,
            action,
            reason,
            requestedBy: sender,
            createdAt: Date.now(),
            approvals: [sender],
            executed: false
        };

        this.emergencyRequests.set(requestId, request);
        return requestId;
    }

    public approveEmergencyOverride(requestId: string, sender: string): void {
        this.onlyOwner(sender);

        const request = this.emergencyRequests.get(requestId);
        if (!request) {
            throw new Error('AdvancedMultiSig: emergency request not found');
        }
        if (request.executed) {
            throw new Error('AdvancedMultiSig: emergency request already executed');
        }
        if (request.approvals.includes(sender)) {
            throw new Error('AdvancedMultiSig: emergency approval already recorded');
        }

        request.approvals.push(sender);
        this.emergencyRequests.set(requestId, request);
    }

    public executeEmergencyOverride(requestId: string, sender: string): void {
        this.onlyOwner(sender);

        const request = this.emergencyRequests.get(requestId);
        if (!request) {
            throw new Error('AdvancedMultiSig: emergency request not found');
        }
        if (request.executed) {
            throw new Error('AdvancedMultiSig: emergency request already executed');
        }

        const requiredApprovals = MultiSigLib.calculateSuperMajority(
            this.owners.size,
            this.config.emergencySuperMajorityPct
        );
        if (request.approvals.length < requiredApprovals) {
            throw new Error('AdvancedMultiSig: emergency override requires super-majority approvals');
        }

        const tx = this.requireTransaction(request.transactionId);
        const now = Date.now();

        if (request.action === EmergencyActionType.EXECUTE_TRANSACTION) {
            if (tx.status === TransactionStatus.EXECUTED) {
                throw new Error('AdvancedMultiSig: transaction already executed');
            }

            const integrationHandler = this.integrations.get(tx.to);
            if (integrationHandler) {
                integrationHandler(this.cloneTransaction(tx));
            }

            tx.status = TransactionStatus.EXECUTED;
            tx.executedAt = now;
            tx.lastUpdatedAt = now;
        } else {
            if (tx.status === TransactionStatus.EXECUTED) {
                throw new Error('AdvancedMultiSig: cannot cancel executed transaction');
            }
            tx.status = TransactionStatus.CANCELLED;
            tx.cancelledReason = request.reason;
            tx.lastUpdatedAt = now;
        }

        request.executed = true;
        this.transactions.set(tx.id, tx);
        this.emergencyRequests.set(requestId, request);
    }

    public getEmergencyOverrideRequest(requestId: string): EmergencyOverrideRequest {
        const request = this.emergencyRequests.get(requestId);
        if (!request) {
            throw new Error('AdvancedMultiSig: emergency request not found');
        }
        return {
            ...request,
            approvals: [...request.approvals]
        };
    }

    public getTransaction(transactionId: string): AdvancedTransaction {
        const tx = this.requireTransaction(transactionId);
        return this.cloneTransaction(tx);
    }

    public getBatchPlan(batchId: string): BatchPlan {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error('AdvancedMultiSig: batch not found');
        }
        return {
            ...batch,
            transactionIds: [...batch.transactionIds]
        };
    }

    public getOwners(): string[] {
        return Array.from(this.owners);
    }

    public getSystemAnalytics(): MultiSigAnalytics {
        let readyTransactions = 0;
        let executedTransactions = 0;
        let cancelledTransactions = 0;
        let expiredTransactions = 0;

        this.transactions.forEach((tx) => {
            if (tx.status === TransactionStatus.READY) readyTransactions++;
            else if (tx.status === TransactionStatus.EXECUTED) executedTransactions++;
            else if (tx.status === TransactionStatus.CANCELLED) cancelledTransactions++;
            else if (tx.status === TransactionStatus.EXPIRED) expiredTransactions++;
        });

        const signerAnalytics = Array.from(this.signerStats.entries())
            .map(([signer, stats]) => this.statsToAnalytics(signer, stats))
            .sort((a, b) => a.signer.localeCompare(b.signer));

        return {
            totalTransactions: this.transactions.size,
            readyTransactions,
            executedTransactions,
            cancelledTransactions,
            expiredTransactions,
            totalSignatures: this.totalSignatures,
            totalRevocations: this.totalRevocations,
            averageConfirmationDelayMs: this.totalSignatures > 0
                ? this.totalConfirmationDelayMs / this.totalSignatures
                : 0,
            totalBatchGasSavings: this.totalBatchGasSavings,
            signerAnalytics
        };
    }

    public getSignerAnalytics(signer: string): SignerAnalytics {
        const stats = this.signerStats.get(signer);
        if (!stats) {
            return {
                signer,
                signedCount: 0,
                revokedCount: 0,
                averageDelayMs: 0,
                lastSignedAt: 0
            };
        }
        return this.statsToAnalytics(signer, stats);
    }

    public getRequiredSignaturesForAmount(amount: number): number {
        return this.getRuleForAmount(amount).requiredSignatures;
    }

    private createTransaction(
        to: string,
        value: number,
        data: string,
        sender: string,
        workflowId?: string,
        batchId?: string
    ): string {
        this.onlyOwner(sender);

        if (!to) {
            throw new Error('AdvancedMultiSig: target is required');
        }
        if (value < 0) {
            throw new Error('AdvancedMultiSig: value must be non-negative');
        }

        const rule = this.getRuleForAmount(value);
        const workflow = this.resolveWorkflowForRule(rule, workflowId);
        const now = Date.now();

        const stageApprovals: Record<string, string[]> = {};
        const stageReadyAt: Record<string, number> = {};
        const stageCompletedAt: Record<string, number> = {};
        const isSequential = workflow.mode === WorkflowMode.SEQUENTIAL;
        workflow.stages.forEach((stage) => {
            stageApprovals[stage.id] = [];
            stageReadyAt[stage.id] = isSequential
                ? (stage.id === workflow.stages[0].id ? now : 0)
                : now;
            stageCompletedAt[stage.id] = 0;
        });

        const maxStageTimelock = workflow.stages.reduce(
            (max, stage) => Math.max(max, stage.timelockMs),
            0
        );
        const executionDelay = Math.max(
            this.config.signatureTimelockMs,
            rule.minExecutionDelayMs,
            maxStageTimelock
        );

        const txId = MultiSigLib.hash(to, value, data, this.transactionNonce++);

        const tx: AdvancedTransaction = {
            id: txId,
            to,
            value,
            data,
            submittedBy: sender,
            createdAt: now,
            executeAfter: now + executionDelay,
            expiresAt: now + this.config.transactionExpiryMs,
            status: TransactionStatus.PENDING,
            workflowId: workflow.id,
            workflowMode: workflow.mode,
            requiredSignatures: rule.requiredSignatures,
            eligibleSigners: [...rule.eligibleSigners],
            stages: workflow.stages.map((stage) => ({
                ...stage,
                approvers: [...stage.approvers]
            })),
            stageApprovals,
            stageReadyAt,
            stageCompletedAt,
            currentStageIndex: 0,
            confirmationCount: 0,
            batchId,
            lastUpdatedAt: now
        };

        this.transactions.set(txId, tx);
        this.signatureLedger.set(txId, []);

        return txId;
    }

    private resolveWorkflowForRule(
        rule: HierarchicalThresholdRule,
        workflowId?: string
    ): WorkflowDefinition {
        if (!workflowId) {
            return {
                id: `wf_default_${rule.id}`,
                name: 'Default tier workflow',
                mode: this.config.defaultWorkflowMode,
                stages: [
                    {
                        id: 'tier_stage',
                        name: 'Tier Approval',
                        approvers: [...rule.eligibleSigners],
                        minApprovals: rule.requiredSignatures,
                        timelockMs: this.config.signatureTimelockMs
                    }
                ]
            };
        }

        const existing = this.workflows.get(workflowId);
        if (!existing) {
            throw new Error('AdvancedMultiSig: workflow not found');
        }

        const workflow = this.cloneWorkflowDefinition(existing);
        workflow.stages.forEach((stage) => {
            if (stage.approvers.some((approver) => !rule.eligibleSigners.includes(approver))) {
                throw new Error('AdvancedMultiSig: workflow approvers must be eligible under selected tier');
            }
        });

        const uniqueApprovers = new Set(workflow.stages.flatMap((stage) => stage.approvers));
        if (uniqueApprovers.size < rule.requiredSignatures) {
            throw new Error('AdvancedMultiSig: workflow does not provide enough unique approvers for tier');
        }

        return workflow;
    }

    private resolveApprovalStage(tx: AdvancedTransaction, sender: string, stageId?: string): WorkflowStage {
        if (tx.workflowMode === WorkflowMode.SEQUENTIAL) {
            const nextStageIndex = this.getSequentialProgress(tx);
            if (nextStageIndex >= tx.stages.length) {
                throw new Error('AdvancedMultiSig: workflow already fully approved');
            }

            const stage = tx.stages[nextStageIndex];
            if ((tx.stageReadyAt[stage.id] || 0) === 0) {
                throw new Error('AdvancedMultiSig: next sequential stage is not active');
            }
            if (stageId && stage.id !== stageId) {
                throw new Error('AdvancedMultiSig: invalid stage for sequential workflow');
            }
            if (!stage.approvers.includes(sender)) {
                throw new Error('AdvancedMultiSig: signer not allowed in current sequential stage');
            }
            return stage;
        }

        if (stageId) {
            const explicitStage = tx.stages.find((stage) => stage.id === stageId);
            if (!explicitStage) {
                throw new Error('AdvancedMultiSig: stage not found');
            }
            if (!explicitStage.approvers.includes(sender)) {
                throw new Error('AdvancedMultiSig: signer not allowed in selected stage');
            }
            return explicitStage;
        }

        const inferredStage = tx.stages.find((stage) => {
            const approvals = tx.stageApprovals[stage.id] || [];
            return stage.approvers.includes(sender) && !approvals.includes(sender);
        });

        if (!inferredStage) {
            throw new Error('AdvancedMultiSig: no available stage for signer confirmation');
        }

        return inferredStage;
    }

    private resolveRevocationStage(tx: AdvancedTransaction, sender: string, stageId?: string): WorkflowStage {
        if (stageId) {
            const stage = tx.stages.find((candidate) => candidate.id === stageId);
            if (!stage) {
                throw new Error('AdvancedMultiSig: stage not found');
            }
            if (!(tx.stageApprovals[stage.id] || []).includes(sender)) {
                throw new Error('AdvancedMultiSig: signer has no active signature in selected stage');
            }
            return stage;
        }

        const stage = tx.stages.find((candidate) => (tx.stageApprovals[candidate.id] || []).includes(sender));
        if (!stage) {
            throw new Error('AdvancedMultiSig: signer has no active signature to revoke');
        }

        return stage;
    }

    private updateDerivedTransactionState(tx: AdvancedTransaction, now: number): void {
        if (tx.status === TransactionStatus.EXECUTED || tx.status === TransactionStatus.CANCELLED) {
            return;
        }

        if (now > tx.expiresAt) {
            tx.status = TransactionStatus.EXPIRED;
            tx.lastUpdatedAt = now;
            return;
        }

        tx.currentStageIndex = this.getSequentialProgress(tx);
        tx.confirmationCount = this.getUniqueApproverCount(tx);

        const workflowSatisfied = this.isWorkflowSatisfied(tx);
        const thresholdSatisfied = tx.confirmationCount >= tx.requiredSignatures;

        tx.status = workflowSatisfied && thresholdSatisfied
            ? TransactionStatus.READY
            : TransactionStatus.PENDING;

        tx.lastUpdatedAt = now;
    }

    private getSequentialProgress(tx: AdvancedTransaction): number {
        if (tx.workflowMode !== WorkflowMode.SEQUENTIAL) {
            return 0;
        }

        let currentIndex = 0;
        while (currentIndex < tx.stages.length) {
            const stage = tx.stages[currentIndex];
            if (tx.stageCompletedAt[stage.id] > 0) {
                currentIndex++;
                continue;
            }
            break;
        }
        return currentIndex;
    }

    private isWorkflowSatisfied(tx: AdvancedTransaction): boolean {
        if (tx.workflowMode === WorkflowMode.SEQUENTIAL) {
            return this.getSequentialProgress(tx) === tx.stages.length;
        }

        return tx.stages.every((stage) => (tx.stageApprovals[stage.id] || []).length >= stage.minApprovals);
    }

    private getUniqueApproverCount(tx: AdvancedTransaction): number {
        const uniqueApprovers = new Set<string>();
        tx.stages.forEach((stage) => {
            (tx.stageApprovals[stage.id] || []).forEach((approver) => uniqueApprovers.add(approver));
        });
        return uniqueApprovers.size;
    }

    private recordSignature(tx: AdvancedTransaction, signer: string, stageId: string, signedAt: number): void {
        const ledger = this.signatureLedger.get(tx.id) || [];
        ledger.push({
            signer,
            transactionId: tx.id,
            stageId,
            signedAt,
            status: SignatureStatus.ACTIVE
        });
        this.signatureLedger.set(tx.id, ledger);

        const stats = this.getOrCreateSignerStats(signer);
        const delay = signedAt - tx.createdAt;
        stats.signedCount += 1;
        stats.totalDelayMs += delay;
        stats.lastSignedAt = signedAt;

        this.totalSignatures += 1;
        this.totalConfirmationDelayMs += delay;
    }

    private recordRevocation(tx: AdvancedTransaction, signer: string, stageId: string, revokedAt: number): void {
        const ledger = this.signatureLedger.get(tx.id) || [];
        ledger.push({
            signer,
            transactionId: tx.id,
            stageId,
            signedAt: revokedAt,
            status: SignatureStatus.REVOKED,
            revokedAt
        });
        this.signatureLedger.set(tx.id, ledger);

        const stats = this.getOrCreateSignerStats(signer);
        stats.revokedCount += 1;
        stats.lastRevokedAt = revokedAt;

        this.totalRevocations += 1;
    }

    private statsToAnalytics(signer: string, stats: InternalSignerStats): SignerAnalytics {
        return {
            signer,
            signedCount: stats.signedCount,
            revokedCount: stats.revokedCount,
            averageDelayMs: stats.signedCount > 0 ? stats.totalDelayMs / stats.signedCount : 0,
            lastSignedAt: stats.lastSignedAt,
            lastRevokedAt: stats.lastRevokedAt
        };
    }

    private getOrCreateSignerStats(signer: string): InternalSignerStats {
        const existing = this.signerStats.get(signer);
        if (existing) {
            return existing;
        }
        throw new Error('AdvancedMultiSig: signer stats unavailable');
    }

    private requireTransaction(transactionId: string): AdvancedTransaction {
        const tx = this.transactions.get(transactionId);
        if (!tx) {
            throw new Error('AdvancedMultiSig: transaction not found');
        }
        return tx;
    }

    private requireActiveTransaction(transactionId: string): AdvancedTransaction {
        const tx = this.requireTransaction(transactionId);

        if (tx.status === TransactionStatus.EXECUTED) {
            throw new Error('AdvancedMultiSig: transaction already executed');
        }
        if (tx.status === TransactionStatus.CANCELLED) {
            throw new Error('AdvancedMultiSig: transaction already cancelled');
        }

        this.updateDerivedTransactionState(tx, Date.now());
        if (tx.status === TransactionStatus.EXPIRED) {
            this.transactions.set(tx.id, tx);
            throw new Error('AdvancedMultiSig: transaction expired');
        }

        return tx;
    }

    private onlyOwner(sender: string): void {
        if (!this.owners.has(sender)) {
            throw new Error('AdvancedMultiSig: caller is not an owner');
        }
    }

    private getRuleForAmount(amount: number): HierarchicalThresholdRule {
        const rule = this.hierarchicalRules.find(
            (candidate) => amount >= candidate.minAmount && amount <= candidate.maxAmount
        );
        if (!rule) {
            throw new Error('AdvancedMultiSig: no hierarchical rule configured for amount');
        }
        return rule;
    }

    private validateWorkflowDefinition(workflow: WorkflowDefinition): void {
        if (!workflow.id) {
            throw new Error('AdvancedMultiSig: workflow id is required');
        }
        if (workflow.stages.length === 0) {
            throw new Error('AdvancedMultiSig: workflow requires at least one stage');
        }

        const stageIds = new Set<string>();
        workflow.stages.forEach((stage) => {
            if (stageIds.has(stage.id)) {
                throw new Error('AdvancedMultiSig: duplicate workflow stage id');
            }
            stageIds.add(stage.id);

            if (stage.minApprovals < 1 || stage.minApprovals > stage.approvers.length) {
                throw new Error('AdvancedMultiSig: invalid stage approval threshold');
            }
            if (stage.timelockMs < 0) {
                throw new Error('AdvancedMultiSig: stage timelock cannot be negative');
            }
            stage.approvers.forEach((approver) => {
                if (!this.owners.has(approver)) {
                    throw new Error('AdvancedMultiSig: workflow approver must be an owner');
                }
            });
        });
    }

    private setInternalHierarchicalRules(rules: HierarchicalThresholdRule[]): void {
        if (rules.length === 0) {
            throw new Error('AdvancedMultiSig: at least one hierarchical rule is required');
        }

        const normalized = rules
            .map((rule) => ({
                ...rule,
                eligibleSigners: Array.from(new Set(rule.eligibleSigners))
            }))
            .sort((a, b) => a.minAmount - b.minAmount);

        normalized.forEach((rule, index) => {
            this.validateHierarchicalRule(rule);
            if (index > 0) {
                const previous = normalized[index - 1];
                if (rule.minAmount <= previous.maxAmount) {
                    throw new Error('AdvancedMultiSig: hierarchical rules overlap');
                }
            }
        });

        this.hierarchicalRules = normalized;
    }

    private validateHierarchicalRule(rule: HierarchicalThresholdRule): void {
        if (!rule.id) {
            throw new Error('AdvancedMultiSig: hierarchical rule id is required');
        }
        if (rule.minAmount < 0 || rule.maxAmount < 0 || rule.minAmount > rule.maxAmount) {
            throw new Error('AdvancedMultiSig: invalid hierarchical amount range');
        }
        if (rule.requiredSignatures < 1) {
            throw new Error('AdvancedMultiSig: hierarchical rule must require at least one signature');
        }
        if (rule.minExecutionDelayMs < 0) {
            throw new Error('AdvancedMultiSig: hierarchical delay cannot be negative');
        }
        if (rule.eligibleSigners.length < rule.requiredSignatures) {
            throw new Error('AdvancedMultiSig: insufficient eligible signers for required signatures');
        }

        rule.eligibleSigners.forEach((signer) => {
            if (!this.owners.has(signer)) {
                throw new Error('AdvancedMultiSig: eligible signer must be an owner');
            }
        });
    }

    private cloneTransaction(tx: AdvancedTransaction): AdvancedTransaction {
        const stageApprovals = Object.entries(tx.stageApprovals).reduce<Record<string, string[]>>(
            (acc, [stageId, approvals]) => {
                acc[stageId] = [...approvals];
                return acc;
            },
            {}
        );
        const stageReadyAt = Object.entries(tx.stageReadyAt).reduce<Record<string, number>>(
            (acc, [stageId, readyAt]) => {
                acc[stageId] = readyAt;
                return acc;
            },
            {}
        );
        const stageCompletedAt = Object.entries(tx.stageCompletedAt).reduce<Record<string, number>>(
            (acc, [stageId, completedAt]) => {
                acc[stageId] = completedAt;
                return acc;
            },
            {}
        );

        return {
            ...tx,
            eligibleSigners: [...tx.eligibleSigners],
            stages: tx.stages.map((stage) => ({
                ...stage,
                approvers: [...stage.approvers]
            })),
            stageApprovals,
            stageReadyAt,
            stageCompletedAt
        };
    }

    private resetDownstreamStages(tx: AdvancedTransaction, fromIndex: number): void {
        for (let i = fromIndex; i < tx.stages.length; i++) {
            const stage = tx.stages[i];
            tx.stageApprovals[stage.id] = [];
            tx.stageCompletedAt[stage.id] = 0;
            tx.stageReadyAt[stage.id] = 0;
        }
    }

    private cloneWorkflowDefinition(workflow: WorkflowDefinition): WorkflowDefinition {
        return {
            ...workflow,
            stages: workflow.stages.map((stage) => ({
                ...stage,
                approvers: [...stage.approvers]
            }))
        };
    }

    private buildDefaultRules(): HierarchicalThresholdRule[] {
        const ownerList = Array.from(this.owners);
        const lowTierSigners = ownerList.slice(0, Math.min(3, ownerList.length));
        const highTierSigners = ownerList.slice(0, Math.min(5, ownerList.length));

        const lowTierRequired = Math.max(1, Math.min(2, lowTierSigners.length));
        const highTierRequired = Math.max(lowTierRequired, Math.min(3, highTierSigners.length));

        return [
            {
                id: 'tier_low',
                minAmount: 0,
                maxAmount: 10000,
                requiredSignatures: lowTierRequired,
                eligibleSigners: lowTierSigners,
                minExecutionDelayMs: this.config.signatureTimelockMs
            },
            {
                id: 'tier_high',
                minAmount: 10001,
                maxAmount: Number.MAX_SAFE_INTEGER,
                requiredSignatures: highTierRequired,
                eligibleSigners: highTierSigners,
                minExecutionDelayMs: this.config.signatureTimelockMs
            }
        ];
    }
}
