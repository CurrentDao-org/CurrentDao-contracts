import { StatePreserver } from '../preservation/StatePreserver';
/**
 * MigrationVerifier validates the success of the migration.
 * Performs post-migration sanity checks and functional verification.
 */
export declare class MigrationVerifier {
    private statePreserver;
    constructor(statePreserver: StatePreserver);
    /**
     * Verifies the migrated state against the preserved snapshot.
     * @param migratedState The state of the new contract instance.
     * @returns True if integrity is 100% maintained.
     */
    verifyIntegrity(migratedState: Record<string, any>): boolean;
    /**
     * Performs functional verification of the new contract.
     * Simulation of exercising some core contract methods.
     * @returns True if functional checks pass.
     */
    verifyFunctionality(): Promise<boolean>;
    /**
     * Verifies the performance analytics of the migration.
     * @param duration Time taken for migration in ms.
     * @param gasUsed Sum of gas used for migration operations.
     * @returns True if performance targets were met.
     */
    verifyPerformance(duration: number, gasUsed: number): boolean;
}
//# sourceMappingURL=MigrationVerifier.d.ts.map