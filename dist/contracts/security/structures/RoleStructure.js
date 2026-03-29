"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleStructure = void 0;
/**
 * @title RoleStructure
 * @dev Defines hierarchical roles and permissions for the access control system
 * @dev Implements role inheritance and priority-based access
 */
const IAccessControl_1 = require("../interfaces/IAccessControl");
class RoleStructure {
    // Role hierarchy with inheritance
    static ROLE_HIERARCHY = new Map([
        [IAccessControl_1.Role.ADMIN, [IAccessControl_1.Role.OPERATOR, IAccessControl_1.Role.USER, IAccessControl_1.Role.VIEWER]],
        [IAccessControl_1.Role.OPERATOR, [IAccessControl_1.Role.USER, IAccessControl_1.Role.VIEWER]],
        [IAccessControl_1.Role.USER, [IAccessControl_1.Role.VIEWER]],
        [IAccessControl_1.Role.VIEWER, []]
    ]);
    // Role priorities (lower number = higher priority)
    static ROLE_PRIORITIES = new Map([
        [IAccessControl_1.Role.ADMIN, 0],
        [IAccessControl_1.Role.OPERATOR, 1],
        [IAccessControl_1.Role.USER, 2],
        [IAccessControl_1.Role.VIEWER, 3]
    ]);
    // Permission sets for each role
    static ROLE_PERMISSIONS = new Map([
        [IAccessControl_1.Role.ADMIN, new Set([
                "PERMISSION_ADMIN",
                "PERMISSION_MINT",
                "PERMISSION_BURN",
                "PERMISSION_TRANSFER",
                "PERMISSION_PAUSE",
                "PERMISSION_EMERGENCY",
                "PERMISSION_GRANT_ROLE",
                "PERMISSION_REVOKE_ROLE",
                "PERMISSION_SET_PERMISSION",
                "PERMISSION_MULTISIG_ADMIN"
            ])],
        [IAccessControl_1.Role.OPERATOR, new Set([
                "PERMISSION_MINT",
                "PERMISSION_BURN",
                "PERMISSION_TRANSFER",
                "PERMISSION_PAUSE"
            ])],
        [IAccessControl_1.Role.USER, new Set([
                "PERMISSION_TRANSFER",
                "PERVIEW_OWN_DATA"
            ])],
        [IAccessControl_1.Role.VIEWER, new Set([
                "PERMISSION_VIEW"
            ])]
    ]);
    // Time-based permission storage
    timePermissions = new Map();
    // Audit trail storage
    auditTrail = [];
    /**
     * @dev Gets the priority of a role (lower number = higher priority)
     */
    static getRolePriority(role) {
        return this.ROLE_PRIORITIES.get(role) || 999;
    }
    /**
     * @dev Checks if a role inherits from another role
     */
    static inheritsRole(childRole, parentRole) {
        const inheritedRoles = this.ROLE_HIERARCHY.get(parentRole);
        if (!inheritedRoles)
            return false;
        return inheritedRoles.includes(childRole) ||
            inheritedRoles.some(role => this.inheritsRole(childRole, role));
    }
    /**
     * @dev Gets all permissions for a role including inherited permissions
     */
    static getRolePermissions(role) {
        const permissions = new Set(this.ROLE_PERMISSIONS.get(role) || []);
        // Add permissions from inherited roles
        const inheritedRoles = this.ROLE_HIERARCHY.get(role);
        if (inheritedRoles) {
            for (const inheritedRole of inheritedRoles) {
                const inheritedPerms = this.getRolePermissions(inheritedRole);
                for (const perm of inheritedPerms) {
                    permissions.add(perm);
                }
            }
        }
        return permissions;
    }
    /**
     * @dev Checks if a role has a specific permission (including inheritance)
     */
    static roleHasPermission(role, permission) {
        return this.getRolePermissions(role).has(permission);
    }
    /**
     * @dev Sets a time-based permission for a role
     */
    setTimeBasedPermission(role, permission, startTime, endTime) {
        const key = `${IAccessControl_1.Role[role]}_${permission}`;
        this.timePermissions.set(key, {
            hasTimeLimit: true,
            startTime,
            endTime
        });
    }
    /**
     * @dev Removes time-based permission for a role
     */
    removeTimeBasedPermission(role, permission) {
        const key = `${IAccessControl_1.Role[role]}_${permission}`;
        this.timePermissions.delete(key);
    }
    /**
     * @dev Checks if a time-based permission is still valid
     */
    isTimeBasedPermissionValid(role, permission, currentTime) {
        const key = `${IAccessControl_1.Role[role]}_${permission}`;
        const timePerm = this.timePermissions.get(key);
        if (!timePerm || !timePerm.hasTimeLimit) {
            return true; // No time limit means always valid
        }
        return currentTime >= timePerm.startTime && currentTime <= timePerm.endTime;
    }
    /**
     * @dev Gets time remaining for a time-based permission
     */
    getTimeRemaining(role, permission, currentTime) {
        const key = `${IAccessControl_1.Role[role]}_${permission}`;
        const timePerm = this.timePermissions.get(key);
        if (!timePerm || !timePerm.hasTimeLimit) {
            return 0; // No time limit
        }
        if (currentTime < timePerm.startTime) {
            return timePerm.startTime - currentTime;
        }
        if (currentTime > timePerm.endTime) {
            return 0; // Expired
        }
        return timePerm.endTime - currentTime;
    }
    /**
     * @dev Adds an audit entry
     */
    addAuditEntry(entry) {
        this.auditTrail.push(entry);
    }
    /**
     * @dev Gets audit trail for a specific account and role
     */
    getAuditTrail(account, role) {
        if (!account && !role) {
            return this.auditTrail;
        }
        return this.auditTrail.filter(entry => {
            if (account && entry.account !== account)
                return false;
            if (role && entry.role !== role.toString())
                return false;
            return true;
        });
    }
    /**
     * @dev Gets the complete role hierarchy path from a role to the top
     */
    static getRoleHierarchyPath(role) {
        const path = [role];
        // Find all parent roles that this role inherits from
        for (const [parentRole, childRoles] of this.ROLE_HIERARCHY.entries()) {
            if (childRoles.includes(role)) {
                path.push(parentRole);
                // Recursively get parent's hierarchy
                const parentPath = this.getRoleHierarchyPath(parentRole);
                path.push(...parentPath.filter(r => !path.includes(r)));
            }
        }
        return path;
    }
    /**
     * @dev Compares two roles by priority
     * @return -1 if role1 has higher priority, 1 if role2 has higher priority, 0 if equal
     */
    static compareRoles(role1, role2) {
        const priority1 = this.getRolePriority(role1);
        const priority2 = this.getRolePriority(role2);
        if (priority1 < priority2)
            return -1;
        if (priority1 > priority2)
            return 1;
        return 0;
    }
    /**
     * @dev Gets the highest role among multiple roles
     */
    static getHighestRole(roles) {
        if (roles.length === 0)
            return null;
        return roles.reduce((highest, current) => {
            return this.compareRoles(current, highest) < 0 ? current : highest;
        });
    }
    /**
     * @dev Validates role hierarchy consistency
     */
    static validateHierarchy() {
        // Check for circular dependencies
        for (const role of Object.values(IAccessControl_1.Role)) {
            if (this.hasCircularDependency(role, new Set())) {
                return false;
            }
        }
        // Check for valid priorities
        const priorities = Array.from(this.ROLE_PRIORITIES.values());
        const uniquePriorities = new Set(priorities);
        if (priorities.length !== uniquePriorities.size) {
            return false; // Duplicate priorities
        }
        return true;
    }
    /**
     * @dev Helper method to detect circular dependencies in role hierarchy
     */
    static hasCircularDependency(role, visited) {
        if (visited.has(role)) {
            return true; // Circular dependency detected
        }
        visited.add(role);
        const childRoles = this.ROLE_HIERARCHY.get(role) || [];
        for (const childRole of childRoles) {
            if (this.hasCircularDependency(childRole, new Set(visited))) {
                return true;
            }
        }
        return false;
    }
    /**
     * @dev Gets all roles that inherit from a given role
     */
    static getInheritingRoles(parentRole) {
        const inheriting = [];
        for (const [role, childRoles] of this.ROLE_HIERARCHY.entries()) {
            if (childRoles.includes(parentRole)) {
                inheriting.push(role);
                // Recursively add roles that inherit from this role
                inheriting.push(...this.getInheritingRoles(role));
            }
        }
        return [...new Set(inheriting)]; // Remove duplicates
    }
}
exports.RoleStructure = RoleStructure;
//# sourceMappingURL=RoleStructure.js.map