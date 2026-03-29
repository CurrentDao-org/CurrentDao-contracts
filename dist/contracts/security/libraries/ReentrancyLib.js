"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReentrancyLib = void 0;
const IReentrancyGuard_1 = require("../interfaces/IReentrancyGuard");
class ReentrancyLib {
    static GUARD_KEY = "REENTRANCY_GUARD_SLOT";
    static LOGS_KEY = "REENTRANCY_LOGS_SLOT";
    /**
     * @dev Validates the reentrancy state.
     */
    static validateState(locked) {
        if (locked) {
            throw new Error("REENTRANCY_ATTEMPT_DETECTED: Contract is already entered");
        }
    }
    /**
     * @dev Generates a unique hash for the call stack.
     */
    static generateCallHash(caller, target, selector) {
        return `${caller}:${target}:${selector}`;
    }
    /**
     * @dev Logs a reentrancy attempt.
     */
    static formatLog(event) {
        return `[REENTRANCY_LOG] [${new Date(event.timestamp).toISOString()}] 
            Type: ${IReentrancyGuard_1.ReentrancyType[event.type]} 
            Caller: ${event.caller} 
            Target: ${event.target} 
            Depth: ${event.depth} 
            Stack: ${event.stackTrace.join(" -> ")}`;
    }
    /**
     * @dev Performs deep stack inspection for potential reentrancy.
     */
    static inspectStack(stack) {
        if (stack.length === 0)
            return IReentrancyGuard_1.ReentrancyType.NONE;
        const currentCall = stack[stack.length - 1];
        const previousCalls = stack.slice(0, stack.length - 1);
        if (previousCalls.includes(currentCall)) {
            return IReentrancyGuard_1.ReentrancyType.SAME_FUNCTION;
        }
        const currentContract = currentCall.split(":")[0];
        const previousContracts = previousCalls.map(call => call.split(":")[0]);
        if (previousContracts.includes(currentContract)) {
            return IReentrancyGuard_1.ReentrancyType.CROSS_FUNCTION;
        }
        return IReentrancyGuard_1.ReentrancyType.NONE;
    }
}
exports.ReentrancyLib = ReentrancyLib;
//# sourceMappingURL=ReentrancyLib.js.map