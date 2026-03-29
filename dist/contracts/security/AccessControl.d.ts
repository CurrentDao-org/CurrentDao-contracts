/**
 * @title AccessControl
 * @dev Comprehensive Role-Based Access Control system with hierarchical roles, time-based permissions, and multi-signature requirements
 * @dev Implements gas-optimized permission checking and emergency controls
 */
import { IAccessControl, RoleData, MultiSigTransaction, AuditEntry, RoleGrantedEvent, RoleRevokedEvent, RoleCreatedEvent, PermissionSetEvent, TimePermissionSetEvent, MultiSigRequirementSetEvent, EmergencyPauseActivatedEvent, EmergencyPauseDeactivatedEvent, PermissionAuditLogEvent } from "./interfaces/IAccessControl";
export declare class AccessControl implements IAccessControl {
    private roles;
    private accountRoles;
    private multiSigRequirements;
    private multiSigTransactions;
    private auditTrail;
    private paused;
    private nextTransactionId;
    onRoleGranted?: (event: RoleGrantedEvent) => void;
    onRoleRevoked?: (event: RoleRevokedEvent) => void;
    onRoleCreated?: (event: RoleCreatedEvent) => void;
    onPermissionSet?: (event: PermissionSetEvent) => void;
    onTimePermissionSet?: (event: TimePermissionSetEvent) => void;
    onMultiSigRequirementSet?: (event: MultiSigRequirementSetEvent) => void;
    onEmergencyPauseActivated?: (event: EmergencyPauseActivatedEvent) => void;
    onEmergencyPauseDeactivated?: (event: EmergencyPauseDeactivatedEvent) => void;
    onPermissionAuditLog?: (event: PermissionAuditLogEvent) => void;
    constructor();
    /**
     * @dev Initialize default role hierarchy
     */
    private initializeDefaultRoles;
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
    private logAudit;
    getAccountRoles(account: string): string[];
    getAllRoles(): string[];
    getRoleData(role: string): RoleData | undefined;
    getMultiSigTransaction(transactionId: number): MultiSigTransaction | undefined;
    getAuditTrail(): AuditEntry[];
    clearCache(): void;
    getCacheStats(): {
        size: number;
        maxSize: number;
    };
}
//# sourceMappingURL=AccessControl.d.ts.map