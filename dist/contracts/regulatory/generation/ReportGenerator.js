"use strict";
// SPDX-License-Identifier: MIT
// Generates compliance reports from collected data
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
class ReportGenerator {
    tracker;
    constructor(tracker) {
        this.tracker = tracker;
    }
    generate(period, complianceData) {
        // Aggregate requirements for all bodies/jurisdictions
        const requirements = this.tracker.getAllRequirements();
        const report = {
            id: `${period}-${Date.now()}`,
            period,
            generatedAt: new Date().toISOString(),
            requirements,
            data: complianceData,
            formatted: "",
            submitted: false,
        };
        return report;
    }
}
exports.ReportGenerator = ReportGenerator;
//# sourceMappingURL=ReportGenerator.js.map