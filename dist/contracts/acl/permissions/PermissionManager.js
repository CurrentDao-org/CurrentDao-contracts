"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionManager = void 0;
const IAccessControlList_1 = require("../interfaces/IAccessControlList");
const ACLLib_1 = require("../libraries/ACLLib");
/**
 * @title PermissionManager
 * @dev Stores permission definitions, per-subject overrides, and function-level permission registration
 */
class PermissionManager {
    permissions = new Map();
    directGrants = new Map();
    createPermission(payload, actor) {
        const permissionId = ACLLib_1.ACLLib.normalizeId(payload.id);
        if (this.permissions.has(permissionId)) {
            throw new Error(IAccessControlList_1.ACL_ERROR.PERMISSION_ALREADY_EXISTS);
        }
        const permission = {
            id: permissionId,
            contractId: payload.contractId,
            functionName: payload.functionName,
            description: payload.description,
            effect: payload.effect || IAccessControlList_1.AccessEffect.ALLOW,
            isWildcard: payload.functionName === '*' || payload.contractId === '*',
            riskLevel: payload.riskLevel || 'MEDIUM',
            gasEstimate: this.estimatePermissionGas(payload.functionName, payload.contractId),
            createdBy: actor,
            createdAt: ACLLib_1.ACLLib.now()
        };
        this.permissions.set(permissionId, permission);
        return { ...permission };
    }
    registerFunctionPermissions(contractId, functions, actor) {
        const created = [];
        for (const functionName of functions) {
            const permissionId = ACLLib_1.ACLLib.normalizeId(`EXECUTE_${contractId}_${functionName}`);
            if (this.permissions.has(permissionId)) {
                created.push({ ...ACLLib_1.ACLLib.ensurePermissionExists(this.permissions.get(permissionId)) });
                continue;
            }
            created.push(this.createPermission({
                id: permissionId,
                contractId,
                functionName,
                description: `Execute ${contractId}.${functionName}`,
                effect: IAccessControlList_1.AccessEffect.ALLOW,
                riskLevel: 'MEDIUM'
            }, actor));
        }
        return created;
    }
    grantDirectPermission(subject, permissionId, actor, effect, reason, expiresAt) {
        const normalizedPermissionId = ACLLib_1.ACLLib.normalizeId(permissionId);
        ACLLib_1.ACLLib.ensurePermissionExists(this.permissions.get(normalizedPermissionId));
        const subjectGrants = this.directGrants.get(subject) || new Map();
        const grant = {
            subject,
            permissionId: normalizedPermissionId,
            effect,
            grantedBy: actor,
            grantedAt: ACLLib_1.ACLLib.now(),
            ...(reason ? { reason } : {}),
            ...(expiresAt !== undefined ? { expiresAt } : {})
        };
        subjectGrants.set(permissionId, grant);
        this.directGrants.set(subject, subjectGrants);
        return { ...grant };
    }
    revokeDirectPermission(subject, permissionId) {
        const normalizedPermissionId = ACLLib_1.ACLLib.normalizeId(permissionId);
        const subjectGrants = this.directGrants.get(subject);
        const grant = subjectGrants?.get(normalizedPermissionId);
        if (!subjectGrants || !grant) {
            return undefined;
        }
        subjectGrants.delete(normalizedPermissionId);
        if (subjectGrants.size === 0) {
            this.directGrants.delete(subject);
        }
        return { ...grant };
    }
    getPermission(permissionId) {
        const permission = this.permissions.get(ACLLib_1.ACLLib.normalizeId(permissionId));
        return permission ? { ...permission } : undefined;
    }
    getPermissions() {
        return [...this.permissions.values()].map((permission) => ({ ...permission }));
    }
    getDirectGrants(subject) {
        const now = ACLLib_1.ACLLib.now();
        const grants = this.directGrants.get(subject);
        if (!grants) {
            return [];
        }
        return [...grants.values()]
            .filter((grant) => grant.expiresAt === undefined || grant.expiresAt > now)
            .map((grant) => ({ ...grant }));
    }
    matchPermissions(permissionIds, contractId, functionName) {
        const matched = [];
        for (const permissionId of permissionIds) {
            const permission = this.permissions.get(permissionId);
            if (!permission) {
                continue;
            }
            if (permission.contractId !== '*' && permission.contractId !== contractId) {
                continue;
            }
            if (permission.functionName !== '*' && permission.functionName !== functionName) {
                continue;
            }
            matched.push({ ...permission });
        }
        return matched;
    }
    getPermissionStore() {
        return this.permissions;
    }
    estimatePermissionGas(functionName, contractId) {
        const base = 2500;
        const wildcardPenalty = functionName === '*' || contractId === '*' ? 200 : 0;
        return base + functionName.length * 35 + contractId.length * 20 + wildcardPenalty;
    }
}
exports.PermissionManager = PermissionManager;
//# sourceMappingURL=PermissionManager.js.map