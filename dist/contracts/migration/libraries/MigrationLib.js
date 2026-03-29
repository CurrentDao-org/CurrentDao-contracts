"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationLib = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
/**
 * Utility library for emergency migration tasks, focusing on checksums and gas/performance tracking.
 */
class MigrationLib {
    /**
     * Generates a unique checksum for a given file or metadata object.
     * @param data The data to be hashed.
     * @returns SHA-256 hash.
     */
    static generateChecksum(data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        return node_crypto_1.default.createHash('sha256').update(str).digest('hex');
    }
    /**
     * Estimates gas equivalence for a migration operation.
     * In this TS-based ecosystem, we simulate gas cost based on data volume.
     * @param dataSize Size of the state in bytes.
     * @returns Estimated gas equivalent.
     */
    static estimateMigrationGas(dataSize) {
        const baseGas = 50000;
        const gasPerByte = 10;
        return baseGas + (dataSize * gasPerByte);
    }
    /**
     * Validates that a migration trigger has sufficient multi-sig approvals.
     * @param approvers List of addresses that approved the migration.
     * @param required Threshold for approval.
     * @returns True if valid.
     */
    static validateApprovals(approvers, required) {
        return approvers.length >= required;
    }
    /**
     * Formats duration in a human-readable format.
     * @param ms Duration in milliseconds.
     * @returns Formatted string.
     */
    static formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    }
}
exports.MigrationLib = MigrationLib;
//# sourceMappingURL=MigrationLib.js.map