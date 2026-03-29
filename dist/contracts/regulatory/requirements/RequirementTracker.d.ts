import { Requirement, RegulatoryBody, Jurisdiction } from "../interfaces/IRegulatoryReporting";
export declare class RequirementTracker {
    private requirements;
    addRequirement(requirement: Requirement): void;
    updateRequirement(requirementId: string, updates: Partial<Requirement>): void;
    removeRequirement(requirementId: string): void;
    getRequirementsByBodyAndJurisdiction(body: RegulatoryBody, jurisdiction: Jurisdiction): Requirement[];
    getAllRequirements(): Requirement[];
}
//# sourceMappingURL=RequirementTracker.d.ts.map