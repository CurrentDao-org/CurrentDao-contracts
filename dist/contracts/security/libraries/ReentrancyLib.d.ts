import { ReentrancyType, ReentrancyEvent } from "../interfaces/IReentrancyGuard";
export declare class ReentrancyLib {
    private static readonly GUARD_KEY;
    private static readonly LOGS_KEY;
    /**
     * @dev Validates the reentrancy state.
     */
    static validateState(locked: boolean): void;
    /**
     * @dev Generates a unique hash for the call stack.
     */
    static generateCallHash(caller: string, target: string, selector: string): string;
    /**
     * @dev Logs a reentrancy attempt.
     */
    static formatLog(event: ReentrancyEvent): string;
    /**
     * @dev Performs deep stack inspection for potential reentrancy.
     */
    static inspectStack(stack: string[]): ReentrancyType;
}
//# sourceMappingURL=ReentrancyLib.d.ts.map