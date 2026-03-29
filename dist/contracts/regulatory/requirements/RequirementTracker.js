"use strict";
// SPDX-License-Identifier: MIT
// Tracks regulatory requirements for multiple bodies/jurisdictions
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementTracker = void 0;
class RequirementTracker {
    requirements = new Map();
    addRequirement(requirement) {
        this.requirements.set(requirement.id, requirement);
    }
    updateRequirement(requirementId, updates) {
        const req = this.requirements.get(requirementId);
        if (req) {
            this.requirements.set(requirementId, { ...req, ...updates });
        }
    }
    removeRequirement(requirementId) {
        this.requirements.delete(requirementId);
    }
    getRequirementsByBodyAndJurisdiction(body, jurisdiction) {
        return Array.from(this.requirements.values()).filter((r) => r.regulatoryBody === body && r.jurisdiction === jurisdiction);
    }
    getAllRequirements() {
        return Array.from(this.requirements.values());
    }
}
exports.RequirementTracker = RequirementTracker;
//# sourceMappingURL=RequirementTracker.js.map