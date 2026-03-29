import { MigrationStatus } from './interfaces/IEmergencyMigration';
import type { IEmergencyMigration, IMigrationAnalytics } from './interfaces/IEmergencyMigration';
/**
 * EmergencyMigration is the main entry point and facade for the migration ecosystem.
 * Integrates triggers, state preservation, execution, and verification.
 */
export declare class EmergencyMigration implements IEmergencyMigration {
    private statePreserver;
    private migrator;
    private verifier;
    private status;
    private analytics;
    private multiSigThreshold;
    private currentContractState;
    constructor();
    /**
     * Triggers an emergency migration. Requires multi-sig approval.
     */
    triggerMigration(reason: string, approvers: string[]): Promise<void>;
    /**
     * Executes the rapid migration process.
     */
    executeMigration(targetContractAddress: string): Promise<boolean>;
    /**
     * Verifies the migration and updates final analytics.
     */
    verifyMigration(): Promise<boolean>;
    /**
     * Rolls back the migration.
     */
    rollback(): Promise<void>;
    getStatus(): MigrationStatus;
    getAnalytics(): IMigrationAnalytics | undefined;
}
//# sourceMappingURL=EmergencyMigration.d.ts.map