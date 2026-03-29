import { IReentrancyGuard, GuardConfig } from "./interfaces/IReentrancyGuard";
export declare class ReentrancyGuard implements IReentrancyGuard {
    private config;
    private detector;
    private stateProtection;
    private callStackMonitor;
    private paused;
    constructor(config?: Partial<GuardConfig>);
    /**
     * @dev Returns true if the guard is locked.
     */
    locked(): boolean;
    /**
     * @dev Modifier-like function to protect execution.
     * Usage: guard.nonReentrant(() => { ... logic ... }, "caller", "target", "selector");
     */
    protect<T>(fn: () => Promise<T> | T, caller: string, target: string, selector: string): Promise<T>;
    /**
     * @dev Compat with requested interface.
     */
    nonReentrant(): void;
    /**
     * @dev Resets the guard.
     */
    resetGuard(): void;
    /**
     * @dev Reconfigures the guard.
     */
    configure(config: GuardConfig): void;
    /**
     * @dev Emergency controls.
     */
    emergencyPause(): void;
    emergencyUnpause(): void;
    /**
     * @dev Access to monitoring data.
     */
    getMonitorData(): {
        depth: number;
        stackTrace: string[];
        logs: import("./interfaces/IReentrancyGuard").ReentrancyEvent[];
    };
}
//# sourceMappingURL=ReentrancyGuard.d.ts.map