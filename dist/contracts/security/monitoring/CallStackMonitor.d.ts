export declare class CallStackMonitor {
    private depth;
    private stackTrace;
    /**
     * @dev Increases call depth and records call information.
     */
    push(call: string): void;
    /**
     * @dev Decreases call depth.
     */
    pop(): void;
    /**
     * @dev Returns current execution depth.
     */
    getDepth(): number;
    /**
     * @dev Returns the full stack trace of current execution.
     */
    getStackTrace(): string[];
    /**
     * @dev Resets the monitor state.
     */
    reset(): void;
}
//# sourceMappingURL=CallStackMonitor.d.ts.map