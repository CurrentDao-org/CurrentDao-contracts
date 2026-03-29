/**
 * StatePreserver handles capturing, storing, and restoring the contract state.
 * Ensuring 100% data integrity during emergency migration.
 */
export declare class StatePreserver {
    private capturedState;
    private stateChecksum;
    /**
     * Captures the current state of a contract provided as a key-value object.
     * @param state The state object to preserve.
     * @returns True if state was successfully captured and validated.
     */
    captureState(state: Record<string, any>): boolean;
    /**
     * Restores the captured state to a new contract instance.
     * @returns The restored state object.
     * @throws Error if no state was captured or if checksum fails.
     */
    restoreState(): Record<string, any>;
    /**
     * Verifies the integrity of a state object against the captured checksum.
     * @param state The state object to verify.
     * @returns True if integrity is maintained.
     */
    verifyIntegrity(state: Record<string, any>): boolean;
    /**
     * Returns the checksum of the captured state.
     */
    getChecksum(): string | null;
    /**
     * Clears the preserved state.
     */
    clear(): void;
}
//# sourceMappingURL=StatePreserver.d.ts.map