"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatePreserver = void 0;
const MigrationLib_1 = require("../libraries/MigrationLib");
/**
 * StatePreserver handles capturing, storing, and restoring the contract state.
 * Ensuring 100% data integrity during emergency migration.
 */
class StatePreserver {
    capturedState = null;
    stateChecksum = null;
    /**
     * Captures the current state of a contract provided as a key-value object.
     * @param state The state object to preserve.
     * @returns True if state was successfully captured and validated.
     */
    captureState(state) {
        // Deep copy the state to prevent accidental mutations
        this.capturedState = JSON.parse(JSON.stringify(state));
        this.stateChecksum = MigrationLib_1.MigrationLib.generateChecksum(this.capturedState);
        console.log(`[StatePreserver] State captured. Checksum: ${this.stateChecksum}`);
        return true;
    }
    /**
     * Restores the captured state to a new contract instance.
     * @returns The restored state object.
     * @throws Error if no state was captured or if checksum fails.
     */
    restoreState() {
        if (!this.capturedState) {
            throw new Error('No state captured to restore.');
        }
        const currentChecksum = MigrationLib_1.MigrationLib.generateChecksum(this.capturedState);
        if (currentChecksum !== this.stateChecksum) {
            throw new Error('State integrity compromised! Checksum mismatch.');
        }
        console.log('[StatePreserver] State restored successfully.');
        return JSON.parse(JSON.stringify(this.capturedState));
    }
    /**
     * Verifies the integrity of a state object against the captured checksum.
     * @param state The state object to verify.
     * @returns True if integrity is maintained.
     */
    verifyIntegrity(state) {
        const verifyChecksum = MigrationLib_1.MigrationLib.generateChecksum(state);
        return verifyChecksum === this.stateChecksum;
    }
    /**
     * Returns the checksum of the captured state.
     */
    getChecksum() {
        return this.stateChecksum;
    }
    /**
     * Clears the preserved state.
     */
    clear() {
        this.capturedState = null;
        this.stateChecksum = null;
    }
}
exports.StatePreserver = StatePreserver;
//# sourceMappingURL=StatePreserver.js.map