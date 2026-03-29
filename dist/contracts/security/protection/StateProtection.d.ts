export declare class StateProtection {
    private isLocked;
    private stateSnapshot;
    /**
     * @dev Acquires a lock for state protection.
     */
    lock(): void;
    /**
     * @dev Releases the lock.
     */
    unlock(): void;
    /**
     * @dev Creates a snapshot of critical state variables.
     */
    snapshot(key: string, value: any): void;
    /**
     * @dev Restores state from snapshot in case of attack detection.
     */
    rollback(key: string): any;
    /**
     * @dev Returns true if the state is currently protected (locked).
     */
    isProtected(): boolean;
}
//# sourceMappingURL=StateProtection.d.ts.map