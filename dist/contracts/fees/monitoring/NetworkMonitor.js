"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkMonitor = void 0;
class NetworkMonitor {
    congestionLevel = 0;
    lastUpdate = Date.now();
    updateCongestion(level) {
        this.congestionLevel = Math.max(0, Math.min(1, level));
        this.lastUpdate = Date.now();
    }
    getCongestion() {
        return this.congestionLevel;
    }
    isUpdateStale() {
        // Update must happen every 30 seconds
        return (Date.now() - this.lastUpdate) > 30000;
    }
}
exports.NetworkMonitor = NetworkMonitor;
//# sourceMappingURL=NetworkMonitor.js.map