"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACLib = void 0;
/**
 * @title RBACLib
 * @dev Library for core permission checking logic and RBAC utilities
 * @dev Provides gas-optimized functions for role and permission validation
 */
const IAccessControl_1 = require("../interfaces/IAccessControl");
class RBACLib {
    // Cache for permission checks to optimize gas
    static permissionCache = new Map();
    static CACHE_DURATION = 30000; // 30 seconds
    /**
     * @dev Checks if an account has a specific role
     * @param roleData Role data mapping
     * @param role Role to check
     * @param account Account to check
     * @return True if account has the role
     */
    static hasRole(roleData, role, account) {
        const roleInfo = roleData.get(role);
        if (!roleInfo)
            return false;
        return roleInfo.members.get(account) || false;
    }
    /**
     * @dev Checks if an account has a specific permission (including inheritance)
     * @param roleData Role data mapping
     * @param role Role to check
     * @param permission Permission to check
     * @param account Account to check
     * @return PermissionCheck object with detailed information
     */
    static hasPermission(roleData, role, permission, account) {
        // First check if account has the role
        if (!this.hasRole(roleData, role, account)) {
            return new IAccessControl_1.PermissionCheck(false, 0, false, 0);
        }
        // Check cache first
        const cacheKey = `${role}_${permission}_${account}`;
        const cached = this.permissionCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return new IAccessControl_1.PermissionCheck(cached.result, 0, false, 0);
        }
        // Get role info
        const roleInfo = roleData.get(role);
        if (!roleInfo) {
            return new IAccessControl_1.PermissionCheck(false, 0, false, 0);
        }
        // Check direct permission
        let hasPermission = roleInfo.permissions.get(permission) || false;
        let timeLeft = 0;
        // Check time-based permission if it exists
        const timePerm = roleInfo.timePermissions.get(permission);
        if (timePerm && timePerm.hasTimeLimit) {
            const currentTime = Date.now();
            if (currentTime < timePerm.startTime) {
                hasPermission = false;
                timeLeft = timePerm.startTime - currentTime;
            }
            else if (currentTime > timePerm.endTime) {
                hasPermission = false;
                timeLeft = 0;
            }
            else {
                timeLeft = timePerm.endTime - currentTime;
            }
        }
        // Check inherited permissions if no direct permission
        if (!hasPermission) {
            const inheritedRoles = this.getInheritedRoles(roleData, role);
            for (const inheritedRole of inheritedRoles) {
                const inheritedRoleInfo = roleData.get(inheritedRole);
                if (inheritedRoleInfo) {
                    const inheritedPermission = inheritedRoleInfo.permissions.get(permission) || false;
                    if (inheritedPermission) {
                        hasPermission = true;
                        break;
                    }
                }
            }
        }
        // Cache the result
        this.permissionCache.set(cacheKey, { result: hasPermission, timestamp: Date.now() });
        return new IAccessControl_1.PermissionCheck(hasPermission, timeLeft, false, 0);
    }
    /**
     * @dev Gets all roles that inherit from a given role
     * @param roleData Role data mapping
     * @param role Parent role
     * @return Array of child role names
     */
    static getInheritedRoles(roleData, role) {
        const inherited = [];
        for (const [roleName, roleInfo] of roleData.entries()) {
            if (roleInfo.parentRole === role) {
                inherited.push(roleName);
                // Recursively get children of this role
                inherited.push(...this.getInheritedRoles(roleData, roleName));
            }
        }
        return inherited;
    }
    /**
     * @dev Gets the complete role hierarchy for a role
     * @param roleData Role data mapping
     * @param role Role to get hierarchy for
     * @return Array of role names in hierarchy order (highest to lowest)
     */
    static getRoleHierarchy(roleData, role) {
        const hierarchy = [role];
        let currentRole = role;
        while (true) {
            const roleInfo = roleData.get(currentRole);
            if (!roleInfo || !roleInfo.parentRole)
                break;
            hierarchy.push(roleInfo.parentRole);
            currentRole = roleInfo.parentRole;
        }
        return hierarchy;
    }
    /**
     * @dev Validates role hierarchy for consistency
     * @param roleData Role data mapping
     * @return True if hierarchy is valid
     */
    static validateHierarchy(roleData) {
        const visited = new Set();
        for (const [roleName, roleInfo] of roleData.entries()) {
            if (this.hasCircularDependency(roleData, roleName, visited)) {
                return false;
            }
            visited.clear();
        }
        return true;
    }
    /**
     * @dev Helper method to detect circular dependencies
     * @param roleData Role data mapping
     * @param role Role to check
     * @param visited Set of visited roles
     * @return True if circular dependency detected
     */
    static hasCircularDependency(roleData, role, visited) {
        if (visited.has(role)) {
            return true; // Circular dependency detected
        }
        visited.add(role);
        const roleInfo = roleData.get(role);
        if (roleInfo && roleInfo.parentRole) {
            return this.hasCircularDependency(roleData, roleInfo.parentRole, new Set(visited));
        }
        return false;
    }
    /**
     * @dev Optimized batch role checking
     * @param roleData Role data mapping
     * @param role Role to check
     * @param accounts Array of accounts to check
     * @return Array of booleans indicating role membership
     */
    static batchHasRole(roleData, role, accounts) {
        const roleInfo = roleData.get(role);
        if (!roleInfo) {
            return new Array(accounts.length).fill(false);
        }
        return accounts.map(account => roleInfo.members.get(account) || false);
    }
    /**
     * @dev Optimized batch permission checking
     * @param roleData Role data mapping
     * @param role Role to check
     * @param permissions Array of permissions to check
     * @param account Account to check
     * @return Array of PermissionCheck objects
     */
    static batchHasPermission(roleData, role, permissions, account) {
        return permissions.map(permission => this.hasPermission(roleData, role, permission, account));
    }
    /**
     * @dev Gets the highest priority role for an account
     * @param roleData Role data mapping
     * @param account Account to check
     * @return Highest priority role name or null if no roles
     */
    static getHighestPriorityRole(roleData, account) {
        let highestRole = null;
        let highestPriority = Infinity;
        for (const [roleName, roleInfo] of roleData.entries()) {
            if (roleInfo.members.get(account) && roleInfo.priority < highestPriority) {
                highestRole = roleName;
                highestPriority = roleInfo.priority;
            }
        }
        return highestRole;
    }
    /**
     * @dev Checks if a role change is allowed based on hierarchy
     * @param roleData Role data mapping
     * @param fromRole Current role
     * @param toRole Target role
     * @param actor Account making the change
     * @return True if change is allowed
     */
    static canChangeRole(roleData, fromRole, toRole, actor) {
        // Get actor's highest role
        const actorRole = this.getHighestPriorityRole(roleData, actor);
        if (!actorRole)
            return false;
        const actorRoleInfo = roleData.get(actorRole);
        const fromRoleInfo = roleData.get(fromRole);
        const toRoleInfo = roleData.get(toRole);
        if (!actorRoleInfo || !fromRoleInfo || !toRoleInfo)
            return false;
        // Actor must have higher or equal priority than both roles
        return actorRoleInfo.priority <= fromRoleInfo.priority &&
            actorRoleInfo.priority <= toRoleInfo.priority;
    }
    /**
     * @dev Clears the permission cache
     */
    static clearCache() {
        this.permissionCache.clear();
    }
    /**
     * @dev Gets cache statistics
     * @return Cache size and hit rate information
     */
    static getCacheStats() {
        return {
            size: this.permissionCache.size,
            maxSize: 1000 // Configurable max cache size
        };
    }
    /**
     * @dev Validates time-based permission parameters
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return True if parameters are valid
     */
    static validateTimeParameters(startTime, endTime) {
        const now = Date.now();
        return startTime >= now && endTime > startTime;
    }
    /**
     * @dev Creates a time permission object
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return TimePermission object
     */
    static createTimePermission(startTime, endTime) {
        if (!this.validateTimeParameters(startTime, endTime)) {
            throw new Error("Invalid time parameters");
        }
        return new IAccessControl_1.TimePermission(true, startTime, endTime);
    }
    /**
     * @dev Checks if a permission requires multi-signature
     * @param permission Permission to check
     * @param multiSigRequirements Multi-sig requirement mapping
     * @return Number of required signatures
     */
    static getMultiSigRequirement(permission, multiSigRequirements) {
        return multiSigRequirements.get(permission) || 0;
    }
    /**
     * @dev Validates multi-signature transaction
     * @param transaction Transaction to validate
     * @param requiredSignatures Required number of signatures
     * @return True if transaction is valid
     */
    static validateMultiSigTransaction(transaction, // MultiSigTransaction type
    requiredSignatures) {
        return transaction.confirmationCount >= requiredSignatures && !transaction.executed;
    }
    /**
     * @dev Gas optimization: pack multiple boolean checks into a single integer
     * @param checks Array of boolean values
     * @return Packed integer representation
     */
    static packBooleans(checks) {
        let packed = 0;
        for (let i = 0; i < Math.min(checks.length, 32); i++) {
            if (checks[i]) {
                packed |= (1 << i);
            }
        }
        return packed;
    }
    /**
     * @dev Gas optimization: unpack boolean checks from integer
     * @param packed Packed integer
     * @param count Number of booleans to unpack
     * @return Array of boolean values
     */
    static unpackBooleans(packed, count) {
        const checks = [];
        for (let i = 0; i < Math.min(count, 32); i++) {
            checks.push((packed & (1 << i)) !== 0);
        }
        return checks;
    }
}
exports.RBACLib = RBACLib;
//# sourceMappingURL=RBACLib.js.map