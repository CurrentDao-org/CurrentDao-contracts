"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReentrancyDetector = void 0;
const IReentrancyGuard_1 = require("../interfaces/IReentrancyGuard");
const ReentrancyLib_1 = require("../libraries/ReentrancyLib");
class ReentrancyDetector {
    config;
    callStack = [];
    logs = [];
    constructor(config) {
        this.config = config;
    }
    /**
     * @dev Tracks a new call in the stack and checks for reentrancy.
     */
    enterCall(caller, target, selector) {
        const callHash = ReentrancyLib_1.ReentrancyLib.generateCallHash(caller, target, selector);
        this.callStack.push(callHash);
        const reentrancyType = ReentrancyLib_1.ReentrancyLib.inspectStack(this.callStack);
        if (reentrancyType !== IReentrancyGuard_1.ReentrancyType.NONE) {
            this.handleDetection(reentrancyType, caller, target);
        }
        if (this.callStack.length > this.config.maxDepth) {
            throw new Error(`MAX_CALL_DEPTH_EXCEEDED: Depth limit is ${this.config.maxDepth}`);
        }
        return reentrancyType;
    }
    /**
     * @dev Removes a call from the stack.
     */
    exitCall() {
        this.callStack.pop();
    }
    /**
     * @dev Handles a detected reentrancy attempt.
     */
    handleDetection(type, caller, target) {
        const event = {
            type,
            timestamp: Date.now(),
            caller,
            target,
            depth: this.callStack.length,
            stackTrace: [...this.callStack]
        };
        if (this.config.loggingEnabled) {
            this.logs.push(event);
            console.log(ReentrancyLib_1.ReentrancyLib.formatLog(event));
        }
        if (this.config.blockOnAttack) {
            throw new Error(`REENTRANCY_ATTACK_PREVENTED: Detected type ${IReentrancyGuard_1.ReentrancyType[type]}`);
        }
    }
    getLogs() {
        return this.logs;
    }
    clearLogs() {
        this.logs = [];
    }
}
exports.ReentrancyDetector = ReentrancyDetector;
//# sourceMappingURL=ReentrancyDetector.js.map