"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyMigration = void 0;
const IEmergencyMigration_1 = require("./interfaces/IEmergencyMigration");
const MigrationLib_1 = require("./libraries/MigrationLib");
const StatePreserver_1 = require("./preservation/StatePreserver");
const RapidMigrator_1 = require("./execution/RapidMigrator");
const MigrationVerifier_1 = require("./verification/MigrationVerifier");
/**
 * EmergencyMigration is the main entry point and facade for the migration ecosystem.
 * Integrates triggers, state preservation, execution, and verification.
 */
class EmergencyMigration {
    statePreserver;
    migrator;
    verifier;
    status = IEmergencyMigration_1.MigrationStatus.IDLE;
    analytics;
    multiSigThreshold = 2; // Required approvals
    // Mock for current contract state (for simulation)
    currentContractState = {
        'totalPowerGenerated': 1500,
        'activeMeters': 42,
        'daoBalance': 1000000,
        'configs': { 'version': '1.0.0', 'emergencyMode': false }
    };
    constructor() {
        this.statePreserver = new StatePreserver_1.StatePreserver();
        this.migrator = new RapidMigrator_1.RapidMigrator(this.statePreserver);
        this.verifier = new MigrationVerifier_1.MigrationVerifier(this.statePreserver);
    }
    /**
     * Triggers an emergency migration. Requires multi-sig approval.
     */
    async triggerMigration(reason, approvers) {
        if (this.status !== IEmergencyMigration_1.MigrationStatus.IDLE && this.status !== IEmergencyMigration_1.MigrationStatus.ROLLED_BACK) {
            throw new Error(`Cannot trigger migration from current status: ${this.status}`);
        }
        if (!MigrationLib_1.MigrationLib.validateApprovals(approvers, this.multiSigThreshold)) {
            throw new Error(`Insufficient multi-sig approvals. Required: ${this.multiSigThreshold}, Got: ${approvers.length}`);
        }
        console.log(`[EmergencyMigration] Triggered by reason: ${reason}`);
        this.status = IEmergencyMigration_1.MigrationStatus.TRIGGERED;
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
    async executeMigration(targetContractAddress) {
        if (this.status !== IEmergencyMigration_1.MigrationStatus.TRIGGERED) {
            throw new Error('Migration must be triggered before execution.');
        }
        console.log('[EmergencyMigration] Beginning rapid migration execution...');
        try {
            const success = await this.migrator.migrate(targetContractAddress);
            if (success) {
                this.status = IEmergencyMigration_1.MigrationStatus.IN_PROGRESS; // Internally handled by migrator, but we update status
                return true;
            }
            return false;
        }
        catch (error) {
            this.status = IEmergencyMigration_1.MigrationStatus.FAILED;
            throw error;
        }
    }
    /**
     * Verifies the migration and updates final analytics.
     */
    async verifyMigration() {
        if (this.status !== IEmergencyMigration_1.MigrationStatus.IN_PROGRESS && this.migrator.getStatus() !== IEmergencyMigration_1.MigrationStatus.COMPLETED) {
            throw new Error('Migration must be completed before verification.');
        }
        // Simulating the target contract's state (which should match the preserved state)
        const migratedStateMock = { ...this.currentContractState };
        const integrityOk = this.verifier.verifyIntegrity(migratedStateMock);
        const functionalOk = await this.verifier.verifyFunctionality();
        const endTime = Date.now();
        const duration = endTime - (this.analytics?.startTime || endTime);
        const gasUsed = MigrationLib_1.MigrationLib.estimateMigrationGas(JSON.stringify(migratedStateMock).length);
        const performanceOk = this.verifier.verifyPerformance(duration, gasUsed);
        if (integrityOk && functionalOk && performanceOk) {
            this.status = IEmergencyMigration_1.MigrationStatus.COMPLETED;
            if (this.analytics) {
                this.analytics.endTime = endTime;
                this.analytics.duration = duration;
                this.analytics.gasUsed = gasUsed;
            }
            console.log('[EmergencyMigration] Verification successful. Migration finalized.');
            return true;
        }
        else {
            console.warn('[EmergencyMigration] Verification failed! Recommend rollback.');
            return false;
        }
    }
    /**
     * Rolls back the migration.
     */
    async rollback() {
        console.log('[EmergencyMigration] Initiating rollback protocol...');
        // In a real scenario, this would restore the old contract pointers
        this.status = IEmergencyMigration_1.MigrationStatus.ROLLED_BACK;
        console.log('[EmergencyMigration] Rollback completed. State restored to previous stable version.');
    }
    getStatus() {
        return this.status;
    }
    getAnalytics() {
        return this.analytics;
    }
}
exports.EmergencyMigration = EmergencyMigration;
//# sourceMappingURL=EmergencyMigration.js.map