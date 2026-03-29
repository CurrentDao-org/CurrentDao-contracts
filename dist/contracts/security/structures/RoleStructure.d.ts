/**
 * @title RoleStructure
 * @dev Defines hierarchical roles and permissions for the access control system
 * @dev Implements role inheritance and priority-based access
 */
import { Role, AuditEntry } from "../interfaces/IAccessControl";
export declare class RoleStructure {
    private static readonly ROLE_HIERARCHY;
    private static readonly ROLE_PRIORITIES;
    private static readonly ROLE_PERMISSIONS;
    private timePermissions;
    private auditTrail;
    /**
     * @dev Gets the priority of a role (lower number = higher priority)
     */
    static getRolePriority(role: Role): number;
    /**
     * @dev Checks if a role inherits from another role
     */
    static inheritsRole(childRole: Role, parentRole: Role): boolean;
    /**
     * @dev Gets all permissions for a role including inherited permissions
     */
    static getRolePermissions(role: Role): Set<string>;
    /**
     * @dev Checks if a role has a specific permission (including inheritance)
     */
    static roleHasPermission(role: Role, permission: string): boolean;
    /**
     * @dev Sets a time-based permission for a role
     */
    setTimeBasedPermission(role: Role, permission: string, startTime: number, endTime: number): void;
    /**
     * @dev Removes time-based permission for a role
     */
    removeTimeBasedPermission(role: Role, permission: string): void;
    /**
     * @dev Checks if a time-based permission is still valid
     */
    isTimeBasedPermissionValid(role: Role, permission: string, currentTime: number): boolean;
    /**
     * @dev Gets time remaining for a time-based permission
     */
    getTimeRemaining(role: Role, permission: string, currentTime: number): number;
    /**
     * @dev Adds an audit entry
     */
    addAuditEntry(entry: AuditEntry): void;
    /**
     * @dev Gets audit trail for a specific account and role
     */
    getAuditTrail(account?: string, role?: Role): AuditEntry[];
    /**
     * @dev Gets the complete role hierarchy path from a role to the top
     */
    static getRoleHierarchyPath(role: Role): Role[];
    /**
     * @dev Compares two roles by priority
     * @return -1 if role1 has higher priority, 1 if role2 has higher priority, 0 if equal
     */
    static compareRoles(role1: Role, role2: Role): number;
    /**
     * @dev Gets the highest role among multiple roles
     */
    static getHighestRole(roles: Role[]): Role | null;
    /**
     * @dev Validates role hierarchy consistency
     */
    static validateHierarchy(): boolean;
    /**
     * @dev Helper method to detect circular dependencies in role hierarchy
     */
    private static hasCircularDependency;
    /**
     * @dev Gets all roles that inherit from a given role
     */
    static getInheritingRoles(parentRole: Role): Role[];
}
//# sourceMappingURL=RoleStructure.d.ts.map