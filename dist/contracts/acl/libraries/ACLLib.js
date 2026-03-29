"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACLLib = void 0;
const IAccessControlList_1 = require("../interfaces/IAccessControlList");
/**
 * @title ACLLib
 * @dev Shared helpers for access control normalization, matching, inheritance, and gas estimation
 */
class ACLLib {
    static now() {
        return Math.floor(Date.now() / 1000);
    }
    static buildPermissionKey(contractId, functionName) {
        return `${contractId}::${functionName}`;
    }
    static normalizeId(value) {
        return value.trim().toUpperCase().replace(/[^A-Z0-9_*:]/g, '_');
    }
    static ensureRoleExists(role) {
        if (!role) {
            throw new Error(IAccessControlList_1.ACL_ERROR.ROLE_NOT_FOUND);
        }
        return role;
    }
    static ensurePermissionExists(permission) {
        if (!permission) {
            throw new Error(IAccessControlList_1.ACL_ERROR.PERMISSION_NOT_FOUND);
        }
        return permission;
    }
    static createAuditEntry(action, actor, success, reason, metadata = {}, overrides = {}) {
        return {
            id: `${action}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
            action,
            actor,
            success,
            reason,
            metadata,
            timestamp: this.now(),
            ...overrides
        };
    }
    static permissionMatches(permission, request) {
        if (permission.contractId !== '*' && permission.contractId !== request.contractId) {
            return false;
        }
        return permission.functionName === '*' || permission.functionName === request.functionName;
    }
    static estimateAccessCheckGas(params) {
        const base = 11200;
        const roleCost = params.roleCount * 850;
        const inheritedCost = params.inheritedRoleCount * 620;
        const directCost = params.directGrantCount * 350;
        const matchCost = params.matchedPermissionCount * 475;
        const emergencyCost = params.locked ? 900 : 0;
        return base + roleCost + inheritedCost + directCost + matchCost + emergencyCost;
    }
    static buildDeniedDecision(reason, gasEstimate) {
        return {
            allowed: false,
            reason,
            matchedPermissions: [],
            inheritedViaRoles: [],
            gasEstimate
        };
    }
    static buildDecision(allowed, reason, matchedPermissions, inheritedViaRoles, gasEstimate) {
        return {
            allowed,
            reason,
            matchedPermissions: [...new Set(matchedPermissions)],
            inheritedViaRoles: [...new Set(inheritedViaRoles)],
            gasEstimate
        };
    }
    static collectRoleLineage(roleId, roles, visited = new Set()) {
        if (visited.has(roleId)) {
            return [];
        }
        const role = roles.get(roleId);
        if (!role) {
            return [];
        }
        visited.add(roleId);
        const lineage = [roleId];
        for (const parentId of role.parentRoleIds) {
            lineage.push(...this.collectRoleLineage(parentId, roles, visited));
        }
        return lineage;
    }
    static mergePermissions(roleIds, roles) {
        const permissions = new Set();
        for (const roleId of roleIds) {
            const lineage = this.collectRoleLineage(roleId, roles);
            for (const lineageRoleId of lineage) {
                const role = roles.get(lineageRoleId);
                if (!role) {
                    continue;
                }
                role.permissionIds.forEach((permissionId) => permissions.add(permissionId));
            }
        }
        return [...permissions];
    }
    static assertGasTarget(gasEstimate, maxGas) {
        if (gasEstimate > maxGas) {
            throw new Error(`${IAccessControlList_1.ACL_ERROR.GAS_TARGET_EXCEEDED}:${gasEstimate}`);
        }
    }
}
exports.ACLLib = ACLLib;
//# sourceMappingURL=ACLLib.js.map