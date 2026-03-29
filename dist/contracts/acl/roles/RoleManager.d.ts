import { RoleAssignment, RoleCreationPayload, RoleDefinition, UpdateRolePayload } from '../interfaces/IAccessControlList';
/**
 * @title RoleManager
 * @dev Maintains role definitions, inheritance, and subject assignments
 */
export declare class RoleManager {
    private readonly roles;
    private readonly assignments;
    createRole(payload: RoleCreationPayload, actor: string, isSystemRole: boolean, governanceManaged: boolean): RoleDefinition;
    updateRole(payload: UpdateRolePayload): RoleDefinition;
    assignRole(subject: string, roleId: string, actor: string, reason?: string, expiresAt?: number): RoleAssignment;
    revokeRole(subject: string, roleId: string): RoleAssignment | undefined;
    addPermissionToRole(roleId: string, permissionId: string): RoleDefinition;
    removePermissionFromRole(roleId: string, permissionId: string): RoleDefinition;
    getRole(roleId: string): RoleDefinition | undefined;
    getRoles(): RoleDefinition[];
    getAssignedRoles(subject: string): RoleAssignment[];
    getEffectiveRoleIds(subject: string): string[];
    getInheritanceChain(roleId: string): string[];
    getRoleStore(): Map<string, RoleDefinition>;
}
//# sourceMappingURL=RoleManager.d.ts.map