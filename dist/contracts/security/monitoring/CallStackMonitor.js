"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallStackMonitor = void 0;
class CallStackMonitor {
    depth = 0;
    stackTrace = [];
    /**
     * @dev Increases call depth and records call information.
     */
    push(call) {
        this.depth++;
        this.stackTrace.push(call);
    }
    /**
     * @dev Decreases call depth.
     */
    pop() {
        if (this.depth > 0) {
            this.depth--;
            this.stackTrace.pop();
        }
    }
    /**
     * @dev Returns current execution depth.
     */
    getDepth() {
        return this.depth;
    }
    /**
     * @dev Returns the full stack trace of current execution.
     */
    getStackTrace() {
        return [...this.stackTrace];
    }
    /**
     * @dev Resets the monitor state.
     */
    reset() {
        this.depth = 0;
        this.stackTrace = [];
    }
}
exports.CallStackMonitor = CallStackMonitor;
//# sourceMappingURL=CallStackMonitor.js.map