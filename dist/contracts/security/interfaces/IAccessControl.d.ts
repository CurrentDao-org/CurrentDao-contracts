/**
 * @title IAccessControl
 * @dev Interface for the comprehensive Role-Based Access Control system
 * @dev Supports hierarchical roles, time-based permissions, and multi-signature requirements
 */
export interface RoleGrantedEvent {
    account: string;
    role: string;
    granter: string;
}
export interface RoleRevokedEvent {
    account: string;
    role: string;
    revoker: string;
}
export interface RoleCreatedEvent {
    role: string;
    parentRole: string;
    priority: number;
}
export interface PermissionSetEvent {
    role: string;
    permission: string;
    granted: boolean;
}
export interface TimePermissionSetEvent {
    role: string;
    permission: string;
    startTime: number;
    endTime: number;
}
export interface MultiSigRequirementSetEvent {
    permission: string;
    requiredSignatures: number;
}
export interface EmergencyPauseActivatedEvent {
    activator: string;
}
export interface EmergencyPauseDeactivatedEvent {
    deactivator: string;
}
export interface PermissionAuditLogEvent {
    account: string;
    role: string;
    permission: string;
    granted: boolean;
    timestamp: number;
}
export interface IAccessControl {
    createRole(role: string, parentRole: string, priority: number): Promise<void>;
    grantRole(role: string, account: string): Promise<void>;
    revokeRole(role: string, account: string): Promise<void>;
    hasRole(role: string, account: string): Promise<boolean>;
    getRoleMembers(role: string): Promise<string[]>;
    setPermission(role: string, permission: string, granted: boolean): Promise<void>;
    setTimeBasedPermission(role: string, permission: string, startTime: number, endTime: number): Promise<void>;
    hasPermission(role: string, permission: string, account: string): Promise<boolean>;
    hasPermissionWithTime(role: string, permission: string, account: string): Promise<{
        hasPermission: boolean;
        timeLeft: number;
    }>;
    getRoleHierarchy(role: string): Promise<string[]>;
    inheritsPermission(role: string, permission: string): Promise<boolean>;
    setMultiSigRequirement(permission: string, requiredSignatures: number): Promise<void>;
    submitMultiSigTransaction(permission: string, data: string, signers: string[]): Promise<number>;
    confirmMultiSigTransaction(transactionId: number, signer: string): Promise<void>;
    executeMultiSigTransaction(transactionId: number): Promise<void>;
    emergencyPause(): Promise<void>;
    emergencyUnpause(): Promise<void>;
    isPaused(): Promise<boolean>;
    getPermissionAuditTrail(account: string, role: string): Promise<AuditEntry[]>;
    getRoleAuditTrail(role: string): Promise<AuditEntry[]>;
    batchGrantRole(role: string, accounts: string[]): Promise<void>;
    batchRevokeRole(role: string, accounts: string[]): Promise<void>;
    batchSetPermissions(role: string, permissions: string[], granted: boolean[]): Promise<void>;
}
export declare enum Role {
    ADMIN = 0,
    OPERATOR = 1,
    USER = 2,
    VIEWER = 3
}
export declare class RoleData {
    role: string;
    parentRole: string;
    priority: number;
    memberCount: number;
    members: Map<string, boolean>;
    permissions: Map<string, boolean>;
    timePermissions: Map<string, TimePermission>;
    constructor(role: string, parentRole: string, priority: number);
}
export declare class TimePermission {
    hasTimeLimit: boolean;
    startTime: number;
    endTime: number;
    constructor(hasTimeLimit?: boolean, startTime?: number, endTime?: number);
}
export declare class MultiSigTransaction {
    permission: string;
    data: string;
    signers: string[];
    requiredSignatures: number;
    confirmationCount: number;
    executed: boolean;
    timestamp: number;
    constructor(permission: string, data: string, signers: string[], requiredSignatures: number);
}
export declare class AuditEntry {
    account: string;
    role: string;
    permission: string;
    granted: boolean;
    timestamp: number;
    actor: string;
    action: string;
    constructor(account: string, role: string, permission: string, granted: boolean, actor: string, action: string);
}
export declare class PermissionCheck {
    hasPermission: boolean;
    timeLeft: number;
    requiresMultiSig: boolean;
    requiredSignatures: number;
    constructor(hasPermission: boolean, timeLeft?: number, requiresMultiSig?: boolean, requiredSignatures?: number);
}
export declare const DEFAULT_ADMIN_ROLE = "DEFAULT_ADMIN_ROLE";
export declare const OPERATOR_ROLE = "OPERATOR_ROLE";
export declare const USER_ROLE = "USER_ROLE";
export declare const VIEWER_ROLE = "VIEWER_ROLE";
export declare const PERMISSION_ADMIN = "PERMISSION_ADMIN";
export declare const PERMISSION_MINT = "PERMISSION_MINT";
export declare const PERMISSION_BURN = "PERMISSION_BURN";
export declare const PERMISSION_TRANSFER = "PERMISSION_TRANSFER";
export declare const PERMISSION_PAUSE = "PERMISSION_PAUSE";
export declare const PERMISSION_EMERGENCY = "PERMISSION_EMERGENCY";
export declare const PERMISSION_GRANT_ROLE = "PERMISSION_GRANT_ROLE";
export declare const PERMISSION_REVOKE_ROLE = "PERMISSION_REVOKE_ROLE";
export declare const PERMISSION_SET_PERMISSION = "PERMISSION_SET_PERMISSION";
export declare const PERMISSION_MULTISIG_ADMIN = "PERMISSION_MULTISIG_ADMIN";
export declare const PERMISSION_VIEW = "PERMISSION_VIEW";
export declare const PERMISSION_VIEW_OWN_DATA = "PERMISSION_VIEW_OWN_DATA";
//# sourceMappingURL=IAccessControl.d.ts.map