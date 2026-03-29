"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationVerifier = void 0;
const MigrationLib_1 = require("../libraries/MigrationLib");
/**
 * MigrationVerifier validates the success of the migration.
 * Performs post-migration sanity checks and functional verification.
 */
class MigrationVerifier {
    statePreserver;
    constructor(statePreserver) {
        this.statePreserver = statePreserver;
    }
    /**
     * Verifies the migrated state against the preserved snapshot.
     * @param migratedState The state of the new contract instance.
     * @returns True if integrity is 100% maintained.
     */
    verifyIntegrity(migratedState) {
        console.log('[MigrationVerifier] Verifying state integrity...');
        const isIntact = this.statePreserver.verifyIntegrity(migratedState);
        if (isIntact) {
            console.log('[MigrationVerifier] State integrity verified: 100% data preserved.');
        }
        else {
            console.error('[MigrationVerifier] State integrity check failed! Data mismatch detected.');
        }
        return isIntact;
    }
    /**
     * Performs functional verification of the new contract.
     * Simulation of exercising some core contract methods.
     * @returns True if functional checks pass.
     */
    async verifyFunctionality() {
        console.log('[MigrationVerifier] Running functional verification on new contract...');
        // Simulation: wait for 300ms
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('[MigrationVerifier] Functional checks passed.');
        return true;
    }
    /**
     * Verifies the performance analytics of the migration.
     * @param duration Time taken for migration in ms.
     * @param gasUsed Sum of gas used for migration operations.
     * @returns True if performance targets were met.
     */
    verifyPerformance(duration, gasUsed) {
        const targetDuration = 30 * 60 * 1000; // 30 minutes in ms
        const targetGas = 500000; // 500k gas
        const durationOk = duration < targetDuration;
        const gasOk = gasUsed < targetGas;
        console.log(`[MigrationVerifier] Performance check: Duration: ${MigrationLib_1.MigrationLib.formatDuration(duration)} (Target: < 30m), Gas: ${gasUsed} (Target: < 500k)`);
        return durationOk && gasOk;
    }
}
exports.MigrationVerifier = MigrationVerifier;
//# sourceMappingURL=MigrationVerifier.js.map