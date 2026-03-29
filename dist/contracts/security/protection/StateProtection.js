"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateProtection = void 0;
const ReentrancyLib_1 = require("../libraries/ReentrancyLib");
class StateProtection {
    isLocked = false;
    stateSnapshot = new Map();
    /**
     * @dev Acquires a lock for state protection.
     */
    lock() {
        ReentrancyLib_1.ReentrancyLib.validateState(this.isLocked);
        this.isLocked = true;
    }
    /**
     * @dev Releases the lock.
     */
    unlock() {
        this.isLocked = false;
    }
    /**
     * @dev Creates a snapshot of critical state variables.
     */
    snapshot(key, value) {
        this.stateSnapshot.set(key, JSON.parse(JSON.stringify(value)));
    }
    /**
     * @dev Restores state from snapshot in case of attack detection.
     */
    rollback(key) {
        return this.stateSnapshot.get(key);
    }
    /**
     * @dev Returns true if the state is currently protected (locked).
     */
    isProtected() {
        return this.isLocked;
    }
}
exports.StateProtection = StateProtection;
//# sourceMappingURL=StateProtection.js.map