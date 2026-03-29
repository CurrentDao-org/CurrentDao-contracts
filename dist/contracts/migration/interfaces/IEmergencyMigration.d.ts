/**
 * Enumeration of migration statuses to track the lifecycle of an emergency migration.
 */
export declare enum MigrationStatus {
    IDLE = "IDLE",
    TRIGGERED = "TRIGGERED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    ROLLED_BACK = "ROLLED_BACK",
    FAILED = "FAILED"
}
/**
 * Metadata for tracking migration performance and audit trails.
 */
export interface IMigrationAnalytics {
    startTime: number;
    endTime?: number;
    duration?: number;
    gasUsed?: number;
    triggerReason: string;
    approvedBy: string[];
}
/**
 * Core interface for the Emergency Migration system in the CurrentDao ecosystem.
 */
export interface IEmergencyMigration {
    /**
     * Triggers an emergency migration. Requires multi-sig approval.
     * @param reason The reason for the emergency migration.
     * @param approvers List of addresses that approved the migration.
     */
    triggerMigration(reason: string, approvers: string[]): Promise<void>;
    /**
     * Executes the rapid migration process.
     * @param targetContractAddress The address of the new contract instance.
     */
    executeMigration(targetContractAddress: string): Promise<boolean>;
    /**
     * Verifies the integrity and functionality of the migrated state.
     */
    verifyMigration(): Promise<boolean>;
    /**
     * Rolls back the migration to the previous stable state if possible.
     */
    rollback(): Promise<void>;
    /**
     * Returns the current status of the migration.
     */
    getStatus(): MigrationStatus;
    /**
     * Returns analytics for the migration.
     */
    getAnalytics(): IMigrationAnalytics | undefined;
}
//# sourceMappingURL=IEmergencyMigration.d.ts.map