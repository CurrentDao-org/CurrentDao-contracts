"use strict";
/**
 * @title PauseStructure
 * @dev Data structures for emergency pause system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_CONSTANTS = exports.TIME_CONSTANTS = exports.GAS_CONSTANTS = exports.DEFAULT_EMERGENCY_CONFIG = exports.GovernanceAction = exports.PauseLevel = void 0;
/**
 * @dev Pause levels with different scopes and impacts
 */
var PauseLevel;
(function (PauseLevel) {
    PauseLevel[PauseLevel["NONE"] = 0] = "NONE";
    PauseLevel[PauseLevel["SELECTIVE"] = 1] = "SELECTIVE";
    PauseLevel[PauseLevel["PARTIAL"] = 2] = "PARTIAL";
    PauseLevel[PauseLevel["FULL"] = 3] = "FULL"; // Pause all platform operations
})(PauseLevel || (exports.PauseLevel = PauseLevel = {}));
/**
 * @dev Governance actions
 */
var GovernanceAction;
(function (GovernanceAction) {
    GovernanceAction[GovernanceAction["ADD_MEMBER"] = 0] = "ADD_MEMBER";
    GovernanceAction[GovernanceAction["REMOVE_MEMBER"] = 1] = "REMOVE_MEMBER";
    GovernanceAction[GovernanceAction["UPDATE_CONFIG"] = 2] = "UPDATE_CONFIG";
    GovernanceAction[GovernanceAction["EMERGENCY_PAUSE"] = 3] = "EMERGENCY_PAUSE";
    GovernanceAction[GovernanceAction["EMERGENCY_RESUME"] = 4] = "EMERGENCY_RESUME";
    GovernanceAction[GovernanceAction["TRIGGER_AUTO_RESUME"] = 5] = "TRIGGER_AUTO_RESUME";
})(GovernanceAction || (exports.GovernanceAction = GovernanceAction = {}));
/**
 * @dev Default emergency configuration
 */
exports.DEFAULT_EMERGENCY_CONFIG = {
    requiredSignatures: 3,
    maxPauseDuration: 86400, // 24 hours
    autoResumeEnabled: true,
    notificationThreshold: 5,
    gasOptimizationLevel: 2,
    governanceMembers: [],
    criticalContracts: [],
    pauseLevels: {
        [PauseLevel.NONE]: {
            requiredSignatures: 0,
            maxDuration: 0,
            autoResumeEnabled: false
        },
        [PauseLevel.SELECTIVE]: {
            requiredSignatures: 2,
            maxDuration: 3600, // 1 hour
            autoResumeEnabled: true
        },
        [PauseLevel.PARTIAL]: {
            requiredSignatures: 3,
            maxDuration: 7200, // 2 hours
            autoResumeEnabled: true
        },
        [PauseLevel.FULL]: {
            requiredSignatures: 5,
            maxDuration: 86400, // 24 hours
            autoResumeEnabled: true
        }
    }
};
/**
 * @dev Gas optimization constants
 */
exports.GAS_CONSTANTS = {
    BASE_PAUSE_COST: 50000,
    BASE_RESUME_COST: 45000,
    SIGNATURE_VERIFICATION_COST: 3000,
    CONTRACT_UPDATE_COST: 10000,
    NOTIFICATION_COST: 15000,
    STORAGE_WRITE_COST: 5000,
    EVENT_EMIT_COST: 3000
};
/**
 * @dev Time constants
 */
exports.TIME_CONSTANTS = {
    SECOND: 1,
    MINUTE: 60,
    HOUR: 3600,
    DAY: 86400,
    WEEK: 604800
};
/**
 * @dev Validation constants
 */
exports.VALIDATION_CONSTANTS = {
    MAX_REASON_LENGTH: 500,
    MAX_SIGNATURES: 10,
    MIN_SIGNATURES: 1,
    MAX_GOVERNANCE_MEMBERS: 20,
    MIN_GOVERNANCE_MEMBERS: 3
};
//# sourceMappingURL=PauseStructure.js.map