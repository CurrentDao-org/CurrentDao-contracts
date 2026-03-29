"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREDEFINED_ROLE_IDS = exports.DEFAULT_ACL_CONFIG = exports.ACL_ERROR = exports.GovernanceVoteChoice = exports.AuditAction = exports.GovernanceProposalType = exports.EmergencyActionType = exports.AccessEffect = void 0;
var AccessEffect;
(function (AccessEffect) {
    AccessEffect["ALLOW"] = "ALLOW";
    AccessEffect["DENY"] = "DENY";
})(AccessEffect || (exports.AccessEffect = AccessEffect = {}));
var EmergencyActionType;
(function (EmergencyActionType) {
    EmergencyActionType["ENABLE_GLOBAL_LOCKDOWN"] = "ENABLE_GLOBAL_LOCKDOWN";
    EmergencyActionType["DISABLE_GLOBAL_LOCKDOWN"] = "DISABLE_GLOBAL_LOCKDOWN";
    EmergencyActionType["LOCK_FUNCTION"] = "LOCK_FUNCTION";
    EmergencyActionType["UNLOCK_FUNCTION"] = "UNLOCK_FUNCTION";
    EmergencyActionType["EMERGENCY_GRANT_ROLE"] = "EMERGENCY_GRANT_ROLE";
    EmergencyActionType["EMERGENCY_REVOKE_ROLE"] = "EMERGENCY_REVOKE_ROLE";
})(EmergencyActionType || (exports.EmergencyActionType = EmergencyActionType = {}));
var GovernanceProposalType;
(function (GovernanceProposalType) {
    GovernanceProposalType["CREATE_ROLE"] = "CREATE_ROLE";
    GovernanceProposalType["UPDATE_ROLE"] = "UPDATE_ROLE";
    GovernanceProposalType["GRANT_ROLE"] = "GRANT_ROLE";
    GovernanceProposalType["REVOKE_ROLE"] = "REVOKE_ROLE";
    GovernanceProposalType["CREATE_PERMISSION"] = "CREATE_PERMISSION";
    GovernanceProposalType["ASSIGN_PERMISSION"] = "ASSIGN_PERMISSION";
    GovernanceProposalType["UPDATE_CONFIG"] = "UPDATE_CONFIG";
    GovernanceProposalType["EMERGENCY_ACTION"] = "EMERGENCY_ACTION";
})(GovernanceProposalType || (exports.GovernanceProposalType = GovernanceProposalType = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["ACCESS_CHECK"] = "ACCESS_CHECK";
    AuditAction["ROLE_CREATED"] = "ROLE_CREATED";
    AuditAction["ROLE_ASSIGNED"] = "ROLE_ASSIGNED";
    AuditAction["ROLE_REVOKED"] = "ROLE_REVOKED";
    AuditAction["PERMISSION_CREATED"] = "PERMISSION_CREATED";
    AuditAction["PERMISSION_ASSIGNED"] = "PERMISSION_ASSIGNED";
    AuditAction["DIRECT_PERMISSION_GRANTED"] = "DIRECT_PERMISSION_GRANTED";
    AuditAction["DIRECT_PERMISSION_DENIED"] = "DIRECT_PERMISSION_DENIED";
    AuditAction["GOVERNANCE_PROPOSAL_CREATED"] = "GOVERNANCE_PROPOSAL_CREATED";
    AuditAction["GOVERNANCE_VOTE_CAST"] = "GOVERNANCE_VOTE_CAST";
    AuditAction["GOVERNANCE_PROPOSAL_EXECUTED"] = "GOVERNANCE_PROPOSAL_EXECUTED";
    AuditAction["EMERGENCY_ACTION_EXECUTED"] = "EMERGENCY_ACTION_EXECUTED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var GovernanceVoteChoice;
(function (GovernanceVoteChoice) {
    GovernanceVoteChoice["FOR"] = "FOR";
    GovernanceVoteChoice["AGAINST"] = "AGAINST";
    GovernanceVoteChoice["ABSTAIN"] = "ABSTAIN";
})(GovernanceVoteChoice || (exports.GovernanceVoteChoice = GovernanceVoteChoice = {}));
exports.ACL_ERROR = {
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    PERMISSION_NOT_FOUND: 'PERMISSION_NOT_FOUND',
    ROLE_ALREADY_EXISTS: 'ROLE_ALREADY_EXISTS',
    PERMISSION_ALREADY_EXISTS: 'PERMISSION_ALREADY_EXISTS',
    INVALID_GOVERNANCE_MEMBER: 'INVALID_GOVERNANCE_MEMBER',
    PROPOSAL_NOT_FOUND: 'PROPOSAL_NOT_FOUND',
    PROPOSAL_NOT_APPROVED: 'PROPOSAL_NOT_APPROVED',
    PROPOSAL_NOT_EXECUTABLE: 'PROPOSAL_NOT_EXECUTABLE',
    ACCESS_DENIED: 'ACCESS_DENIED',
    EMERGENCY_LOCKDOWN: 'EMERGENCY_LOCKDOWN',
    FUNCTION_LOCKED: 'FUNCTION_LOCKED',
    GAS_TARGET_EXCEEDED: 'GAS_TARGET_EXCEEDED'
};
exports.DEFAULT_ACL_CONFIG = {
    governanceThreshold: 3,
    communityQuorum: 2,
    maxAccessCheckGas: 30000,
    defaultRoleAdmin: 'SUPER_ADMIN',
    emergencyCouncil: [],
    governanceMembers: []
};
exports.PREDEFINED_ROLE_IDS = [
    'SUPER_ADMIN',
    'DAO_EXECUTIVE',
    'DAO_GOVERNOR',
    'TREASURY_MANAGER',
    'TREASURY_OPERATOR',
    'COMPLIANCE_ADMIN',
    'COMPLIANCE_OFFICER',
    'RISK_MANAGER',
    'SECURITY_ADMIN',
    'SECURITY_ANALYST',
    'EMERGENCY_RESPONDER',
    'AUDITOR',
    'ORACLE_MANAGER',
    'ORACLE_OPERATOR',
    'REGISTRY_ADMIN',
    'LIQUIDITY_MANAGER',
    'LIQUIDITY_OPERATOR',
    'STAKING_MANAGER',
    'STAKING_OPERATOR',
    'FEE_MANAGER',
    'FEE_OPERATOR',
    'REPORTING_MANAGER',
    'SUPPORT_AGENT',
    'READ_ONLY_OBSERVER'
];
//# sourceMappingURL=IAccessControlList.js.map