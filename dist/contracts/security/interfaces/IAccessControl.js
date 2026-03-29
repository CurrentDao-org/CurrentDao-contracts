"use strict";
/**
 * @title IAccessControl
 * @dev Interface for the comprehensive Role-Based Access Control system
 * @dev Supports hierarchical roles, time-based permissions, and multi-signature requirements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_VIEW_OWN_DATA = exports.PERMISSION_VIEW = exports.PERMISSION_MULTISIG_ADMIN = exports.PERMISSION_SET_PERMISSION = exports.PERMISSION_REVOKE_ROLE = exports.PERMISSION_GRANT_ROLE = exports.PERMISSION_EMERGENCY = exports.PERMISSION_PAUSE = exports.PERMISSION_TRANSFER = exports.PERMISSION_BURN = exports.PERMISSION_MINT = exports.PERMISSION_ADMIN = exports.VIEWER_ROLE = exports.USER_ROLE = exports.OPERATOR_ROLE = exports.DEFAULT_ADMIN_ROLE = exports.PermissionCheck = exports.AuditEntry = exports.MultiSigTransaction = exports.TimePermission = exports.RoleData = exports.Role = void 0;
// Enums
var Role;
(function (Role) {
    Role[Role["ADMIN"] = 0] = "ADMIN";
    Role[Role["OPERATOR"] = 1] = "OPERATOR";
    Role[Role["USER"] = 2] = "USER";
    Role[Role["VIEWER"] = 3] = "VIEWER";
})(Role || (exports.Role = Role = {}));
// Structs and Classes
class RoleData {
    role;
    parentRole;
    priority;
    memberCount;
    members = new Map();
    permissions = new Map();
    timePermissions = new Map();
    constructor(role, parentRole, priority) {
        this.role = role;
        this.parentRole = parentRole;
        this.priority = priority;
        this.memberCount = 0;
    }
}
exports.RoleData = RoleData;
class TimePermission {
    hasTimeLimit;
    startTime;
    endTime;
    constructor(hasTimeLimit = false, startTime = 0, endTime = 0) {
        this.hasTimeLimit = hasTimeLimit;
        this.startTime = startTime;
        this.endTime = endTime;
    }
}
exports.TimePermission = TimePermission;
class MultiSigTransaction {
    permission;
    data;
    signers;
    requiredSignatures;
    confirmationCount;
    executed;
    timestamp;
    constructor(permission, data, signers, requiredSignatures) {
        this.permission = permission;
        this.data = data;
        this.signers = signers;
        this.requiredSignatures = requiredSignatures;
        this.confirmationCount = 0;
        this.executed = false;
        this.timestamp = Date.now();
    }
}
exports.MultiSigTransaction = MultiSigTransaction;
class AuditEntry {
    account;
    role;
    permission;
    granted;
    timestamp;
    actor;
    action;
    constructor(account, role, permission, granted, actor, action) {
        this.account = account;
        this.role = role;
        this.permission = permission;
        this.granted = granted;
        this.timestamp = Date.now();
        this.actor = actor;
        this.action = action;
    }
}
exports.AuditEntry = AuditEntry;
class PermissionCheck {
    hasPermission;
    timeLeft;
    requiresMultiSig;
    requiredSignatures;
    constructor(hasPermission, timeLeft = 0, requiresMultiSig = false, requiredSignatures = 0) {
        this.hasPermission = hasPermission;
        this.timeLeft = timeLeft;
        this.requiresMultiSig = requiresMultiSig;
        this.requiredSignatures = requiredSignatures;
    }
}
exports.PermissionCheck = PermissionCheck;
// Constants
exports.DEFAULT_ADMIN_ROLE = "DEFAULT_ADMIN_ROLE";
exports.OPERATOR_ROLE = "OPERATOR_ROLE";
exports.USER_ROLE = "USER_ROLE";
exports.VIEWER_ROLE = "VIEWER_ROLE";
exports.PERMISSION_ADMIN = "PERMISSION_ADMIN";
exports.PERMISSION_MINT = "PERMISSION_MINT";
exports.PERMISSION_BURN = "PERMISSION_BURN";
exports.PERMISSION_TRANSFER = "PERMISSION_TRANSFER";
exports.PERMISSION_PAUSE = "PERMISSION_PAUSE";
exports.PERMISSION_EMERGENCY = "PERMISSION_EMERGENCY";
exports.PERMISSION_GRANT_ROLE = "PERMISSION_GRANT_ROLE";
exports.PERMISSION_REVOKE_ROLE = "PERMISSION_REVOKE_ROLE";
exports.PERMISSION_SET_PERMISSION = "PERMISSION_SET_PERMISSION";
exports.PERMISSION_MULTISIG_ADMIN = "PERMISSION_MULTISIG_ADMIN";
exports.PERMISSION_VIEW = "PERMISSION_VIEW";
exports.PERMISSION_VIEW_OWN_DATA = "PERMISSION_VIEW_OWN_DATA";
//# sourceMappingURL=IAccessControl.js.map