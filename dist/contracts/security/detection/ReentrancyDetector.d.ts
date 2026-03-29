import { ReentrancyType, ReentrancyEvent, GuardConfig } from "../interfaces/IReentrancyGuard";
export declare class ReentrancyDetector {
    private config;
    private callStack;
    private logs;
    constructor(config: GuardConfig);
    /**
     * @dev Tracks a new call in the stack and checks for reentrancy.
     */
    enterCall(caller: string, target: string, selector: string): ReentrancyType;
    /**
     * @dev Removes a call from the stack.
     */
    exitCall(): void;
    /**
     * @dev Handles a detected reentrancy attempt.
     */
    private handleDetection;
    getLogs(): ReentrancyEvent[];
    clearLogs(): void;
}
//# sourceMappingURL=ReentrancyDetector.d.ts.map