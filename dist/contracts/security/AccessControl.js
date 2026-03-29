"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessControl = void 0;
/**
 * @title AccessControl
 * @dev Comprehensive Role-Based Access Control system with hierarchical roles, time-based permissions, and multi-signature requirements
 * @dev Implements gas-optimized permission checking and emergency controls
 */
const IAccessControl_1 = require("./interfaces/IAccessControl");
const RBACLib_1 = require("./libraries/RBACLib");
class AccessControl {
    // Storage
    roles = new Map();
    accountRoles = new Map(); // account -> set of roles
    multiSigRequirements = new Map();
    multiSigTransactions = new Map();
    auditTrail = [];
    paused = false;
    nextTransactionId = 1;
    // Events (for integration with event systems)
    onRoleGranted;
    onRoleRevoked;
    onRoleCreated;
    onPermissionSet;
    onTimePermissionSet;
    onMultiSigRequirementSet;
    onEmergencyPauseActivated;
    onEmergencyPauseDeactivated;
    onPermissionAuditLog;
    constructor() {
        this.initializeDefaultRoles();
    }
    /**
     * @dev Initialize default role hierarchy
     */
    initializeDefaultRoles() {
        // Create default roles with hierarchy
        this.createRole(IAccessControl_1.DEFAULT_ADMIN_ROLE, "", 0);
        this.createRole(IAccessControl_1.OPERATOR_ROLE, IAccessControl_1.DEFAULT_ADMIN_ROLE, 1);
        this.createRole(IAccessControl_1.USER_ROLE, IAccessControl_1.OPERATOR_ROLE, 2);
        this.createRole(IAccessControl_1.VIEWER_ROLE, IAccessControl_1.USER_ROLE, 3);
        // Set default permissions
        this.setPermission(IAccessControl_1.DEFAULT_ADMIN_ROLE, IAccessControl_1.PERMISSION_ADMIN, true);
        this.setPermission(IAccessControl_1.DEFAULT_ADMIN_ROLE, IAccessControl_1.PERMISSION_EMERGENCY, true);
    }
    // Role Management Functions
    async createRole(role, parentRole, priority) {
        if (this.roles.has(role)) {
            throw new Error(`Role ${role} already exists`);
        }
        if (parentRole && !this.roles.has(parentRole)) {
            throw new Error(`Parent role ${parentRole} does not exist`);
        }
        const roleData = new IAccessControl_1.RoleData(role, parentRole, priority);
        this.roles.set(role, roleData);
        // Validate hierarchy
        if (!RBACLib_1.RBACLib.validateHierarchy(this.roles)) {
            this.roles.delete(role);
            throw new Error("Invalid role hierarchy: circular dependency detected");
        }
        this.logAudit("", role, "", false, "CREATE_ROLE");
        this.onRoleCreated?.({ role, parentRole, priority });
    }
    async grantRole(role, account) {
        if (!this.roles.has(role)) {
            throw new Error(`Role ${role} does not exist`);
        }
        const roleData = this.roles.get(role);
        if (roleData.members.get(account)) {
            throw new Error(`Account ${account} already has role ${role}`);
        }
        roleData.members.set(account, true);
        roleData.memberCount++;
        // Update account roles mapping
        if (!this.accountRoles.has(account)) {
            this.accountRoles.set(account, new Set());
        }
        this.accountRoles.get(account).add(role);
        this.logAudit(account, role, "", true, "GRANT_ROLE");
        this.onRoleGranted?.({ account, role, granter: "system" });
    }
    async revokeRole(role, account) {
        if (!this.roles.has(role)) {
            throw new Error(`Role ${role} does not exist`);
        }
        const roleData = this.roles.get(role);
        if (!roleData.members.get(account)) {
            throw new Error(`Account ${account} does not have role ${role}`);
        }
        roleData.members.set(account, false);
        roleData.memberCount--;
        // Update account roles mapping
        const accountRoleSet = this.accountRoles.get(account);
        if (accountRoleSet) {
            accountRoleSet.delete(role);
            if (accountRoleSet.size === 0) {
                this.accountRoles.delete(account);
            }
        }
        this.logAudit(account, role, "", false, "REVOKE_ROLE");
        this.onRoleRevoked?.({ account, role, revoker: "system" });
    }
    async hasRole(role, account) {
        return RBACLib_1.RBACLib.hasRole(this.roles, role, account);
    }
    async getRoleMembers(role) {
        const roleData = this.roles.get(role);
        if (!roleData) {
            return [];
        }
        const members = [];
        for (const [account, hasRole] of roleData.members.entries()) {
            if (hasRole) {
                members.push(account);
            }
        }
        return members;
    }
    // Permission Management Functions
    async setPermission(role, permission, granted) {
        if (!this.roles.has(role)) {
            throw new Error(`Role ${role} does not exist`);
        }
        const roleData = this.roles.get(role);
        roleData.permissions.set(permission, granted);
        this.logAudit("", role, permission, granted, "SET_PERMISSION");
        this.onPermissionSet?.({ role, permission, granted });
    }
    async setTimeBasedPermission(role, permission, startTime, endTime) {
        if (!this.roles.has(role)) {
            throw new Error(`Role ${role} does not exist`);
        }
        const timePermission = RBACLib_1.RBACLib.createTimePermission(startTime, endTime);
        const roleData = this.roles.get(role);
        roleData.timePermissions.set(permission, timePermission);
        this.logAudit("", role, permission, true, "SET_TIME_PERMISSION");
        this.onTimePermissionSet?.({ role, permission, startTime, endTime });
    }
    async hasPermission(role, permission, account) {
        const check = await this.hasPermissionWithTime(role, permission, account);
        return check.hasPermission;
    }
    async hasPermissionWithTime(role, permission, account) {
        const check = RBACLib_1.RBACLib.hasPermission(this.roles, role, permission, account);
        return { hasPermission: check.hasPermission, timeLeft: check.timeLeft };
    }
    // Hierarchical Functions
    async getRoleHierarchy(role) {
        return RBACLib_1.RBACLib.getRoleHierarchy(this.roles, role);
    }
    async inheritsPermission(role, permission) {
        const roleData = this.roles.get(role);
        if (!roleData)
            return false;
        // Check direct permission
        if (roleData.permissions.get(permission))
            return true;
        // Check inherited permissions
        const inheritedRoles = RBACLib_1.RBACLib.getInheritedRoles(this.roles, role);
        for (const inheritedRole of inheritedRoles) {
            const inheritedRoleData = this.roles.get(inheritedRole);
            if (inheritedRoleData && inheritedRoleData.permissions.get(permission)) {
                return true;
            }
        }
        return false;
    }
    // Multi-signature Functions
    async setMultiSigRequirement(permission, requiredSignatures) {
        if (requiredSignatures < 1) {
            throw new Error("Required signatures must be at least 1");
        }
        this.multiSigRequirements.set(permission, requiredSignatures);
        this.onMultiSigRequirementSet?.({ permission, requiredSignatures });
    }
    async submitMultiSigTransaction(permission, data, signers) {
        const requiredSignatures = this.multiSigRequirements.get(permission) || 0;
        if (requiredSignatures === 0) {
            throw new Error(`No multi-sig requirement set for permission ${permission}`);
        }
        const transaction = new IAccessControl_1.MultiSigTransaction(permission, data, signers, requiredSignatures);
        const transactionId = this.nextTransactionId++;
        this.multiSigTransactions.set(transactionId, transaction);
        // Auto-confirm if submitter is one of the signers
        for (const signer of signers) {
            await this.confirmMultiSigTransaction(transactionId, signer);
            break; // Only confirm once per submitter
        }
        return transactionId;
    }
    async confirmMultiSigTransaction(transactionId, signer) {
        const transaction = this.multiSigTransactions.get(transactionId);
        if (!transaction) {
            throw new Error(`Transaction ${transactionId} does not exist`);
        }
        if (transaction.executed) {
            throw new Error(`Transaction ${transactionId} already executed`);
        }
        if (!transaction.signers.includes(signer)) {
            throw new Error(`Signer ${signer} is not authorized for this transaction`);
        }
        // Check if already confirmed
        const alreadyConfirmed = transaction.signers.slice(0, transaction.confirmationCount).includes(signer);
        if (alreadyConfirmed) {
            throw new Error(`Signer ${signer} already confirmed this transaction`);
        }
        // Move signer to confirmed position
        const signerIndex = transaction.signers.indexOf(signer);
        [transaction.signers[signerIndex], transaction.signers[transaction.confirmationCount]] =
            [transaction.signers[transaction.confirmationCount], transaction.signers[signerIndex]];
        transaction.confirmationCount++;
    }
    async executeMultiSigTransaction(transactionId) {
        const transaction = this.multiSigTransactions.get(transactionId);
        if (!transaction) {
            throw new Error(`Transaction ${transactionId} does not exist`);
        }
        if (!RBACLib_1.RBACLib.validateMultiSigTransaction(transaction, transaction.requiredSignatures)) {
            throw new Error(`Transaction ${transactionId} does not have enough confirmations`);
        }
        transaction.executed = true;
        // In a real implementation, this would execute the transaction data
    }
    // Emergency Controls
    async emergencyPause() {
        if (this.paused) {
            throw new Error("System is already paused");
        }
        this.paused = true;
        this.onEmergencyPauseActivated?.({ activator: "system" });
    }
    async emergencyUnpause() {
        if (!this.paused) {
            throw new Error("System is not paused");
        }
        this.paused = false;
        this.onEmergencyPauseDeactivated?.({ deactivator: "system" });
    }
    async isPaused() {
        return this.paused;
    }
    // Audit Functions
    async getPermissionAuditTrail(account, role) {
        return this.auditTrail.filter(entry => entry.account === account && entry.role === role);
    }
    async getRoleAuditTrail(role) {
        return this.auditTrail.filter(entry => entry.role === role);
    }
    // Gas Optimization Functions
    async batchGrantRole(role, accounts) {
        if (!this.roles.has(role)) {
            throw new Error(`Role ${role} does not exist`);
        }
        const roleData = this.roles.get(role);
        for (const account of accounts) {
            if (!roleData.members.get(account)) {
                roleData.members.set(account, true);
                roleData.memberCount++;
                if (!this.accountRoles.has(account)) {
                    this.accountRoles.set(account, new Set());
                }
                this.accountRoles.get(account).add(role);
                this.logAudit(account, role, "", true, "BATCH_GRANT_ROLE");
            }
        }
    }
    async batchRevokeRole(role, accounts) {
        if (!this.roles.has(role)) {
            throw new Error(`Role ${role} does not exist`);
        }
        const roleData = this.roles.get(role);
        for (const account of accounts) {
            if (roleData.members.get(account)) {
                roleData.members.set(account, false);
                roleData.memberCount--;
                const accountRoleSet = this.accountRoles.get(account);
                if (accountRoleSet) {
                    accountRoleSet.delete(role);
                    if (accountRoleSet.size === 0) {
                        this.accountRoles.delete(account);
                    }
                }
                this.logAudit(account, role, "", false, "BATCH_REVOKE_ROLE");
            }
        }
    }
    async batchSetPermissions(role, permissions, granted) {
        if (!this.roles.has(role)) {
            throw new Error(`Role ${role} does not exist`);
        }
        if (permissions.length !== granted.length) {
            throw new Error("Permissions and granted arrays must have the same length");
        }
        const roleData = this.roles.get(role);
        for (let i = 0; i < permissions.length; i++) {
            roleData.permissions.set(permissions[i], granted[i]);
            this.logAudit("", role, permissions[i], granted[i], "BATCH_SET_PERMISSION");
        }
    }
    // Internal Functions
    logAudit(account, role, permission, granted, action) {
        const entry = new IAccessControl_1.AuditEntry(account, role, permission, granted, "system", action);
        this.auditTrail.push(entry);
        this.onPermissionAuditLog?.({
            account,
            role,
            permission,
            granted,
            timestamp: entry.timestamp
        });
    }
    // Utility Functions
    getAccountRoles(account) {
        const roleSet = this.accountRoles.get(account);
        return roleSet ? Array.from(roleSet) : [];
    }
    getAllRoles() {
        return Array.from(this.roles.keys());
    }
    getRoleData(role) {
        return this.roles.get(role);
    }
    getMultiSigTransaction(transactionId) {
        return this.multiSigTransactions.get(transactionId);
    }
    getAuditTrail() {
        return [...this.auditTrail];
    }
    clearCache() {
        RBACLib_1.RBACLib.clearCache();
    }
    getCacheStats() {
        return RBACLib_1.RBACLib.getCacheStats();
    }
}
exports.AccessControl = AccessControl;
//# sourceMappingURL=AccessControl.js.map