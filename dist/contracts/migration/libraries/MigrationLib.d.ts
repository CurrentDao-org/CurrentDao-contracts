/**
 * Utility library for emergency migration tasks, focusing on checksums and gas/performance tracking.
 */
export declare class MigrationLib {
    /**
     * Generates a unique checksum for a given file or metadata object.
     * @param data The data to be hashed.
     * @returns SHA-256 hash.
     */
    static generateChecksum(data: any): string;
    /**
     * Estimates gas equivalence for a migration operation.
     * In this TS-based ecosystem, we simulate gas cost based on data volume.
     * @param dataSize Size of the state in bytes.
     * @returns Estimated gas equivalent.
     */
    static estimateMigrationGas(dataSize: number): number;
    /**
     * Validates that a migration trigger has sufficient multi-sig approvals.
     * @param approvers List of addresses that approved the migration.
     * @param required Threshold for approval.
     * @returns True if valid.
     */
    static validateApprovals(approvers: string[], required: number): boolean;
    /**
     * Formats duration in a human-readable format.
     * @param ms Duration in milliseconds.
     * @returns Formatted string.
     */
    static formatDuration(ms: number): string;
}
//# sourceMappingURL=MigrationLib.d.ts.map