import { AccessDecision, AccessRequest, AuditAction, AuditLogEntry, PermissionDefinition, RoleDefinition } from '../interfaces/IAccessControlList';
/**
 * @title ACLLib
 * @dev Shared helpers for access control normalization, matching, inheritance, and gas estimation
 */
export declare class ACLLib {
    static now(): number;
    static buildPermissionKey(contractId: string, functionName: string): string;
    static normalizeId(value: string): string;
    static ensureRoleExists(role: RoleDefinition | undefined): RoleDefinition;
    static ensurePermissionExists(permission: PermissionDefinition | undefined): PermissionDefinition;
    static createAuditEntry(action: AuditAction, actor: string, success: boolean, reason: string, metadata?: Record<string, string | number | boolean>, overrides?: Partial<AuditLogEntry>): AuditLogEntry;
    static permissionMatches(permission: PermissionDefinition, request: AccessRequest): boolean;
    static estimateAccessCheckGas(params: {
        roleCount: number;
        inheritedRoleCount: number;
        directGrantCount: number;
        locked: boolean;
        matchedPermissionCount: number;
    }): number;
    static buildDeniedDecision(reason: string, gasEstimate: number): AccessDecision;
    static buildDecision(allowed: boolean, reason: string, matchedPermissions: string[], inheritedViaRoles: string[], gasEstimate: number): AccessDecision;
    static collectRoleLineage(roleId: string, roles: Map<string, RoleDefinition>, visited?: Set<string>): string[];
    static mergePermissions(roleIds: string[], roles: Map<string, RoleDefinition>): string[];
    static assertGasTarget(gasEstimate: number, maxGas: number): void;
}
//# sourceMappingURL=ACLLib.d.ts.map