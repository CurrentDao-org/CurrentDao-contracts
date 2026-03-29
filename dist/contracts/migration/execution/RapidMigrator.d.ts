import { MigrationStatus } from '../interfaces/IEmergencyMigration';
import { StatePreserver } from '../preservation/StatePreserver';
/**
 * RapidMigrator orchestrates the migration execution, ensuring minimal disruption.
 * Manages the transition from old to new contract instance.
 */
export declare class RapidMigrator {
    private statePreserver;
    private status;
    private targetContractAddress;
    constructor(statePreserver: StatePreserver);
    /**
     * Executes the rapid migration process.
     * @param targetContractAddress The address of the new contract instance.
     * @returns True if migration completed successfully.
     */
    migrate(targetContractAddress: string): Promise<boolean>;
    private pauseOldContract;
    private initializeNewContract;
    private updateDaoPointers;
    private unpauseNewContract;
    getStatus(): MigrationStatus;
}
//# sourceMappingURL=RapidMigrator.d.ts.map