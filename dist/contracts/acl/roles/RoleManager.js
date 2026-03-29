"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleManager = void 0;
const IAccessControlList_1 = require("../interfaces/IAccessControlList");
const ACLLib_1 = require("../libraries/ACLLib");
/**
 * @title RoleManager
 * @dev Maintains role definitions, inheritance, and subject assignments
 */
class RoleManager {
    roles = new Map();
    assignments = new Map();
    createRole(payload, actor, isSystemRole, governanceManaged) {
        const roleId = ACLLib_1.ACLLib.normalizeId(payload.id);
        if (this.roles.has(roleId)) {
            throw new Error(IAccessControlList_1.ACL_ERROR.ROLE_ALREADY_EXISTS);
        }
        const normalizedParentRoleIds = [...new Set((payload.parentRoleIds || []).map((parentRoleId) => ACLLib_1.ACLLib.normalizeId(parentRoleId)))];
        const normalizedPermissionIds = [...new Set((payload.permissionIds || []).map((permissionId) => ACLLib_1.ACLLib.normalizeId(permissionId)))];
        for (const parentRoleId of normalizedParentRoleIds) {
            if (!this.roles.has(parentRoleId)) {
                throw new Error(`${IAccessControlList_1.ACL_ERROR.ROLE_NOT_FOUND}:${parentRoleId}`);
            }
        }
        const now = ACLLib_1.ACLLib.now();
        const role = {
            id: roleId,
            label: payload.label,
            description: payload.description,
            parentRoleIds: normalizedParentRoleIds,
            permissionIds: normalizedPermissionIds,
            isSystemRole,
            governanceManaged,
            metadata: { ...(payload.metadata || {}) },
            createdBy: actor,
            createdAt: now,
            updatedAt: now
        };
        this.roles.set(roleId, role);
        return {
            ...role,
            parentRoleIds: [...role.parentRoleIds],
            permissionIds: [...role.permissionIds],
            metadata: { ...role.metadata }
        };
    }
    updateRole(payload) {
        const normalizedRoleId = ACLLib_1.ACLLib.normalizeId(payload.roleId);
        const role = ACLLib_1.ACLLib.ensureRoleExists(this.roles.get(normalizedRoleId));
        const updatedParentRoleIds = payload.parentRoleIds
            ? [...new Set(payload.parentRoleIds.map((parentRoleId) => ACLLib_1.ACLLib.normalizeId(parentRoleId)))]
            : [...role.parentRoleIds];
        const updatedPermissionIds = payload.permissionIds
            ? [...new Set(payload.permissionIds.map((permissionId) => ACLLib_1.ACLLib.normalizeId(permissionId)))]
            : [...role.permissionIds];
        const updated = {
            ...role,
            label: payload.label || role.label,
            description: payload.description || role.description,
            parentRoleIds: updatedParentRoleIds,
            permissionIds: updatedPermissionIds,
            metadata: payload.metadata ? { ...payload.metadata } : { ...role.metadata },
            updatedAt: ACLLib_1.ACLLib.now()
        };
        updated.parentRoleIds.forEach((parentRoleId) => ACLLib_1.ACLLib.ensureRoleExists(this.roles.get(parentRoleId)));
        if (updated.parentRoleIds.includes(normalizedRoleId)) {
            throw new Error('ROLE_CANNOT_INHERIT_ITSELF');
        }
        const inheritedRoleIds = ACLLib_1.ACLLib.collectRoleLineage(normalizedRoleId, new Map(this.roles).set(normalizedRoleId, updated));
        const selfReferences = inheritedRoleIds.filter((roleId) => roleId === normalizedRoleId);
        if (selfReferences.length > 1) {
            throw new Error('ROLE_INHERITANCE_CYCLE');
        }
        this.roles.set(updated.id, updated);
        return {
            ...updated,
            parentRoleIds: [...updated.parentRoleIds],
            permissionIds: [...updated.permissionIds],
            metadata: { ...updated.metadata }
        };
    }
    assignRole(subject, roleId, actor, reason, expiresAt) {
        const normalizedRoleId = ACLLib_1.ACLLib.normalizeId(roleId);
        ACLLib_1.ACLLib.ensureRoleExists(this.roles.get(normalizedRoleId));
        const subjectAssignments = this.assignments.get(subject) || new Map();
        const assignment = {
            subject,
            roleId: normalizedRoleId,
            assignedBy: actor,
            assignedAt: ACLLib_1.ACLLib.now(),
            ...(reason ? { reason } : {}),
            ...(expiresAt !== undefined ? { expiresAt } : {})
        };
        subjectAssignments.set(roleId, assignment);
        this.assignments.set(subject, subjectAssignments);
        return { ...assignment };
    }
    revokeRole(subject, roleId) {
        const normalizedRoleId = ACLLib_1.ACLLib.normalizeId(roleId);
        const subjectAssignments = this.assignments.get(subject);
        const existing = subjectAssignments?.get(normalizedRoleId);
        if (!subjectAssignments || !existing) {
            return undefined;
        }
        subjectAssignments.delete(normalizedRoleId);
        if (subjectAssignments.size === 0) {
            this.assignments.delete(subject);
        }
        return { ...existing };
    }
    addPermissionToRole(roleId, permissionId) {
        const normalizedRoleId = ACLLib_1.ACLLib.normalizeId(roleId);
        const normalizedPermissionId = ACLLib_1.ACLLib.normalizeId(permissionId);
        const role = ACLLib_1.ACLLib.ensureRoleExists(this.roles.get(normalizedRoleId));
        if (!role.permissionIds.includes(normalizedPermissionId)) {
            role.permissionIds.push(normalizedPermissionId);
            role.updatedAt = ACLLib_1.ACLLib.now();
        }
        this.roles.set(normalizedRoleId, role);
        return {
            ...role,
            parentRoleIds: [...role.parentRoleIds],
            permissionIds: [...role.permissionIds],
            metadata: { ...role.metadata }
        };
    }
    removePermissionFromRole(roleId, permissionId) {
        const normalizedRoleId = ACLLib_1.ACLLib.normalizeId(roleId);
        const normalizedPermissionId = ACLLib_1.ACLLib.normalizeId(permissionId);
        const role = ACLLib_1.ACLLib.ensureRoleExists(this.roles.get(normalizedRoleId));
        role.permissionIds = role.permissionIds.filter((currentPermissionId) => currentPermissionId !== normalizedPermissionId);
        role.updatedAt = ACLLib_1.ACLLib.now();
        this.roles.set(normalizedRoleId, role);
        return {
            ...role,
            parentRoleIds: [...role.parentRoleIds],
            permissionIds: [...role.permissionIds],
            metadata: { ...role.metadata }
        };
    }
    getRole(roleId) {
        const role = this.roles.get(ACLLib_1.ACLLib.normalizeId(roleId));
        if (!role) {
            return undefined;
        }
        return {
            ...role,
            parentRoleIds: [...role.parentRoleIds],
            permissionIds: [...role.permissionIds],
            metadata: { ...role.metadata }
        };
    }
    getRoles() {
        return [...this.roles.values()].map((role) => ({
            ...role,
            parentRoleIds: [...role.parentRoleIds],
            permissionIds: [...role.permissionIds],
            metadata: { ...role.metadata }
        }));
    }
    getAssignedRoles(subject) {
        const now = ACLLib_1.ACLLib.now();
        const subjectAssignments = this.assignments.get(subject);
        if (!subjectAssignments) {
            return [];
        }
        return [...subjectAssignments.values()]
            .filter((assignment) => assignment.expiresAt === undefined || assignment.expiresAt > now)
            .map((assignment) => ({ ...assignment }));
    }
    getEffectiveRoleIds(subject) {
        const roles = new Set();
        for (const assignment of this.getAssignedRoles(subject)) {
            ACLLib_1.ACLLib.collectRoleLineage(assignment.roleId, this.roles).forEach((roleId) => roles.add(roleId));
        }
        return [...roles];
    }
    getInheritanceChain(roleId) {
        const normalizedRoleId = ACLLib_1.ACLLib.normalizeId(roleId);
        ACLLib_1.ACLLib.ensureRoleExists(this.roles.get(normalizedRoleId));
        return ACLLib_1.ACLLib.collectRoleLineage(normalizedRoleId, this.roles);
    }
    getRoleStore() {
        return this.roles;
    }
}
exports.RoleManager = RoleManager;
//# sourceMappingURL=RoleManager.js.map