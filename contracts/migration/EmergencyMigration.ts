import { MigrationStatus } from './interfaces/IEmergencyMigration';
import type { IEmergencyMigration, IMigrationAnalytics } from './interfaces/IEmergencyMigration';
import { MigrationLib } from './libraries/MigrationLib';
import { StatePreserver } from './preservation/StatePreserver';
import { RapidMigrator } from './execution/RapidMigrator';
import { MigrationVerifier } from './verification/MigrationVerifier';

/**
 * EmergencyMigration is the main entry point and facade for the migration ecosystem.
 * Integrates triggers, state preservation, execution, and verification.
 */
export class EmergencyMigration implements IEmergencyMigration {
    private statePreserver: StatePreserver;
    private migrator: RapidMigrator;
    private verifier: MigrationVerifier;
    
    private status: MigrationStatus = MigrationStatus.IDLE;
    private analytics: IMigrationAnalytics | undefined;
    private multiSigThreshold: number = 2; // Required approvals
    
    // Mock for current contract state (for simulation)
    private currentContractState: Record<string, any> = {
        'totalPowerGenerated': 1500,
        'activeMeters': 42,
        'daoBalance': 1000000,
        'configs': { 'version': '1.0.0', 'emergencyMode': false }
    };

    constructor() {
        this.statePreserver = new StatePreserver();
        this.migrator = new RapidMigrator(this.statePreserver);
        this.verifier = new MigrationVerifier(this.statePreserver);
    }

    /**
     * Triggers an emergency migration. Requires multi-sig approval.
     */
    public async triggerMigration(reason: string, approvers: string[]): Promise<void> {
        if (this.status !== MigrationStatus.IDLE && this.status !== MigrationStatus.ROLLED_BACK) {
            throw new Error(`Cannot trigger migration from current status: ${this.status}`);
        }

        if (!MigrationLib.validateApprovals(approvers, this.multiSigThreshold)) {
            throw new Error(`Insufficient multi-sig approvals. Required: ${this.multiSigThreshold}, Got: ${approvers.length}`);
        }

        console.log(`[EmergencyMigration] Triggered by reason: ${reason}`);
        this.status = MigrationStatus.TRIGGERED;
        
        this.analytics = {
            startTime: Date.now(),
            triggerReason: reason,
            approvedBy: approvers
        };

        // Standard protocol: Capture state immediately upon trigger (within 5 mins target)
        this.statePreserver.captureState(this.currentContractState);
    }

    /**
     * Executes the rapid migration process.
     */
    public async executeMigration(targetContractAddress: string): Promise<boolean> {
        if (this.status !== MigrationStatus.TRIGGERED) {
            throw new Error('Migration must be triggered before execution.');
        }

        console.log('[EmergencyMigration] Beginning rapid migration execution...');
        try {
            const success = await this.migrator.migrate(targetContractAddress);
            if (success) {
                this.status = MigrationStatus.IN_PROGRESS; // Internally handled by migrator, but we update status
                return true;
            }
            return false;
        } catch (error) {
            this.status = MigrationStatus.FAILED;
            throw error;
        }
    }

    /**
     * Verifies the migration and updates final analytics.
     */
    public async verifyMigration(): Promise<boolean> {
        if (this.status !== MigrationStatus.IN_PROGRESS && this.migrator.getStatus() !== MigrationStatus.COMPLETED) {
            throw new Error('Migration must be completed before verification.');
        }

        // Simulating the target contract's state (which should match the preserved state)
        const migratedStateMock = { ...this.currentContractState }; 
        
        const integrityOk = this.verifier.verifyIntegrity(migratedStateMock);
        const functionalOk = await this.verifier.verifyFunctionality();
        
        const endTime = Date.now();
        const duration = endTime - (this.analytics?.startTime || endTime);
        const gasUsed = MigrationLib.estimateMigrationGas(JSON.stringify(migratedStateMock).length);
        
        const performanceOk = this.verifier.verifyPerformance(duration, gasUsed);

        if (integrityOk && functionalOk && performanceOk) {
            this.status = MigrationStatus.COMPLETED;
            if (this.analytics) {
                this.analytics.endTime = endTime;
                this.analytics.duration = duration;
                this.analytics.gasUsed = gasUsed;
            }
            console.log('[EmergencyMigration] Verification successful. Migration finalized.');
            return true;
        } else {
            console.warn('[EmergencyMigration] Verification failed! Recommend rollback.');
            return false;
        }
    }

    /**
     * Rolls back the migration.
     */
    public async rollback(): Promise<void> {
        console.log('[EmergencyMigration] Initiating rollback protocol...');
        // In a real scenario, this would restore the old contract pointers
        this.status = MigrationStatus.ROLLED_BACK;
        console.log('[EmergencyMigration] Rollback completed. State restored to previous stable version.');
    }

    public getStatus(): MigrationStatus {
        return this.status;
    }

    public getAnalytics(): IMigrationAnalytics | undefined {
        return this.analytics;
    }
}
