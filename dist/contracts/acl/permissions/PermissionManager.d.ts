import { AccessEffect, DirectPermissionGrant, PermissionDefinition, PermissionPayload } from '../interfaces/IAccessControlList';
/**
 * @title PermissionManager
 * @dev Stores permission definitions, per-subject overrides, and function-level permission registration
 */
export declare class PermissionManager {
    private readonly permissions;
    private readonly directGrants;
    createPermission(payload: PermissionPayload, actor: string): PermissionDefinition;
    registerFunctionPermissions(contractId: string, functions: string[], actor: string): PermissionDefinition[];
    grantDirectPermission(subject: string, permissionId: string, actor: string, effect: AccessEffect, reason?: string, expiresAt?: number): DirectPermissionGrant;
    revokeDirectPermission(subject: string, permissionId: string): DirectPermissionGrant | undefined;
    getPermission(permissionId: string): PermissionDefinition | undefined;
    getPermissions(): PermissionDefinition[];
    getDirectGrants(subject: string): DirectPermissionGrant[];
    matchPermissions(permissionIds: string[], contractId: string, functionName: string): PermissionDefinition[];
    getPermissionStore(): Map<string, PermissionDefinition>;
    private estimatePermissionGas;
}
//# sourceMappingURL=PermissionManager.d.ts.map