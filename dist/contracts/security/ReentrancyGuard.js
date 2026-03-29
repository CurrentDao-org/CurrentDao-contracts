"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReentrancyGuard = void 0;
const ReentrancyDetector_1 = require("./detection/ReentrancyDetector");
const StateProtection_1 = require("./protection/StateProtection");
const CallStackMonitor_1 = require("./monitoring/CallStackMonitor");
class ReentrancyGuard {
    config;
    detector;
    stateProtection;
    callStackMonitor;
    paused = false;
    constructor(config) {
        this.config = {
            maxDepth: config?.maxDepth || 10,
            detectionThreshold: config?.detectionThreshold || 1,
            loggingEnabled: config?.loggingEnabled ?? true,
            blockOnAttack: config?.blockOnAttack ?? true,
        };
        this.detector = new ReentrancyDetector_1.ReentrancyDetector(this.config);
        this.stateProtection = new StateProtection_1.StateProtection();
        this.callStackMonitor = new CallStackMonitor_1.CallStackMonitor();
    }
    /**
     * @dev Returns true if the guard is locked.
     */
    locked() {
        return this.stateProtection.isProtected();
    }
    /**
     * @dev Modifier-like function to protect execution.
     * Usage: guard.nonReentrant(() => { ... logic ... }, "caller", "target", "selector");
     */
    async protect(fn, caller, target, selector) {
        if (this.paused) {
            throw new Error("REENTRANCY_GUARD_PAUSED: Emergency control active");
        }
        this.stateProtection.lock();
        this.callStackMonitor.push(`${caller}:${target}:${selector}`);
        this.detector.enterCall(caller, target, selector);
        try {
            const result = await fn();
            return result;
        }
        finally {
            this.detector.exitCall();
            this.callStackMonitor.pop();
            this.stateProtection.unlock();
        }
    }
    /**
     * @dev Compat with requested interface.
     */
    nonReentrant() {
        if (this.locked()) {
            throw new Error("REENTRANCY_ATTEMPT_DETECTED");
        }
    }
    /**
     * @dev Resets the guard.
     */
    resetGuard() {
        this.stateProtection.unlock();
        this.callStackMonitor.reset();
        this.detector.clearLogs();
    }
    /**
     * @dev Reconfigures the guard.
     */
    configure(config) {
        this.config = config;
        this.detector = new ReentrancyDetector_1.ReentrancyDetector(config);
    }
    /**
     * @dev Emergency controls.
     */
    emergencyPause() {
        this.paused = true;
    }
    emergencyUnpause() {
        this.paused = false;
    }
    /**
     * @dev Access to monitoring data.
     */
    getMonitorData() {
        return {
            depth: this.callStackMonitor.getDepth(),
            stackTrace: this.callStackMonitor.getStackTrace(),
            logs: this.detector.getLogs()
        };
    }
}
exports.ReentrancyGuard = ReentrancyGuard;
//# sourceMappingURL=ReentrancyGuard.js.map