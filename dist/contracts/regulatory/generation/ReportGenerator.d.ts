import { RequirementTracker } from "../requirements/RequirementTracker";
import { ComplianceReport } from "../interfaces/IRegulatoryReporting";
export declare class ReportGenerator {
    private tracker;
    constructor(tracker: RequirementTracker);
    generate(period: string, complianceData: any): ComplianceReport;
}
//# sourceMappingURL=ReportGenerator.d.ts.map