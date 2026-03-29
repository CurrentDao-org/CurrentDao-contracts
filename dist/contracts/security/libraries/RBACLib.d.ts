/**
 * @title RBACLib
 * @dev Library for core permission checking logic and RBAC utilities
 * @dev Provides gas-optimized functions for role and permission validation
 */
import { RoleData, TimePermission, PermissionCheck } from "../interfaces/IAccessControl";
export declare class RBACLib {
    private static permissionCache;
    private static readonly CACHE_DURATION;
    /**
     * @dev Checks if an account has a specific role
     * @param roleData Role data mapping
     * @param role Role to check
     * @param account Account to check
     * @return True if account has the role
     */
    static hasRole(roleData: Map<string, RoleData>, role: string, account: string): boolean;
    /**
     * @dev Checks if an account has a specific permission (including inheritance)
     * @param roleData Role data mapping
     * @param role Role to check
     * @param permission Permission to check
     * @param account Account to check
     * @return PermissionCheck object with detailed information
     */
    static hasPermission(roleData: Map<string, RoleData>, role: string, permission: string, account: string): PermissionCheck;
    /**
     * @dev Gets all roles that inherit from a given role
     * @param roleData Role data mapping
     * @param role Parent role
     * @return Array of child role names
     */
    static getInheritedRoles(roleData: Map<string, RoleData>, role: string): string[];
    /**
     * @dev Gets the complete role hierarchy for a role
     * @param roleData Role data mapping
     * @param role Role to get hierarchy for
     * @return Array of role names in hierarchy order (highest to lowest)
     */
    static getRoleHierarchy(roleData: Map<string, RoleData>, role: string): string[];
    /**
     * @dev Validates role hierarchy for consistency
     * @param roleData Role data mapping
     * @return True if hierarchy is valid
     */
    static validateHierarchy(roleData: Map<string, RoleData>): boolean;
    /**
     * @dev Helper method to detect circular dependencies
     * @param roleData Role data mapping
     * @param role Role to check
     * @param visited Set of visited roles
     * @return True if circular dependency detected
     */
    private static hasCircularDependency;
    /**
     * @dev Optimized batch role checking
     * @param roleData Role data mapping
     * @param role Role to check
     * @param accounts Array of accounts to check
     * @return Array of booleans indicating role membership
     */
    static batchHasRole(roleData: Map<string, RoleData>, role: string, accounts: string[]): boolean[];
    /**
     * @dev Optimized batch permission checking
     * @param roleData Role data mapping
     * @param role Role to check
     * @param permissions Array of permissions to check
     * @param account Account to check
     * @return Array of PermissionCheck objects
     */
    static batchHasPermission(roleData: Map<string, RoleData>, role: string, permissions: string[], account: string): PermissionCheck[];
    /**
     * @dev Gets the highest priority role for an account
     * @param roleData Role data mapping
     * @param account Account to check
     * @return Highest priority role name or null if no roles
     */
    static getHighestPriorityRole(roleData: Map<string, RoleData>, account: string): string | null;
    /**
     * @dev Checks if a role change is allowed based on hierarchy
     * @param roleData Role data mapping
     * @param fromRole Current role
     * @param toRole Target role
     * @param actor Account making the change
     * @return True if change is allowed
     */
    static canChangeRole(roleData: Map<string, RoleData>, fromRole: string, toRole: string, actor: string): boolean;
    /**
     * @dev Clears the permission cache
     */
    static clearCache(): void;
    /**
     * @dev Gets cache statistics
     * @return Cache size and hit rate information
     */
    static getCacheStats(): {
        size: number;
        maxSize: number;
    };
    /**
     * @dev Validates time-based permission parameters
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return True if parameters are valid
     */
    static validateTimeParameters(startTime: number, endTime: number): boolean;
    /**
     * @dev Creates a time permission object
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return TimePermission object
     */
    static createTimePermission(startTime: number, endTime: number): TimePermission;
    /**
     * @dev Checks if a permission requires multi-signature
     * @param permission Permission to check
     * @param multiSigRequirements Multi-sig requirement mapping
     * @return Number of required signatures
     */
    static getMultiSigRequirement(permission: string, multiSigRequirements: Map<string, number>): number;
    /**
     * @dev Validates multi-signature transaction
     * @param transaction Transaction to validate
     * @param requiredSignatures Required number of signatures
     * @return True if transaction is valid
     */
    static validateMultiSigTransaction(transaction: any, // MultiSigTransaction type
    requiredSignatures: number): boolean;
    /**
     * @dev Gas optimization: pack multiple boolean checks into a single integer
     * @param checks Array of boolean values
     * @return Packed integer representation
     */
    static packBooleans(checks: boolean[]): number;
    /**
     * @dev Gas optimization: unpack boolean checks from integer
     * @param packed Packed integer
     * @param count Number of booleans to unpack
     * @return Array of boolean values
     */
    static unpackBooleans(packed: number, count: number): boolean[];
}
//# sourceMappingURL=RBACLib.d.ts.map