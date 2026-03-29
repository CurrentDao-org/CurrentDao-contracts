import { ACLConfig, AccessControlListEvents, AccessDecision, AccessEffect, AccessRequest, AuditLogEntry, ConfigUpdatePayload, EmergencyActionPayload, EmergencyState, GovernanceEvaluation, GovernanceProposal, GovernanceProposalType, GovernanceVoteChoice, IAccessControlList, PermissionAssignmentPayload, PermissionDefinition, PermissionPayload, PerformanceSnapshot, RoleCreationPayload, RoleDefinition, RoleMutationPayload, UpdateRolePayload } from './interfaces/IAccessControlList';
type GovernancePayload = RoleCreationPayload | UpdateRolePayload | RoleMutationPayload | PermissionPayload | PermissionAssignmentPayload | ConfigUpdatePayload | EmergencyActionPayload;
interface AccessControlListOptions {
    config?: Partial<ACLConfig>;
    eventHandlers?: AccessControlListEvents;
    bootstrapActor?: string;
}
export declare class AccessControlList implements IAccessControlList {
    private readonly roleManager;
    private readonly permissionManager;
    private governance;
    private readonly eventHandlers;
    private readonly auditTrail;
    private readonly accessMeasurements;
    private config;
    private emergencyState;
    constructor(options?: AccessControlListOptions);
    hasAccess(request: AccessRequest): Promise<AccessDecision>;
    assignRole(subject: string, roleId: string, actor: string, reason?: string, expiresAt?: number): Promise<void>;
    revokeRole(subject: string, roleId: string, actor: string, reason?: string): Promise<void>;
    createPermission(payload: PermissionPayload, actor: string): Promise<PermissionDefinition>;
    createGovernanceProposal<TPayload>(type: GovernanceProposalType, title: string, description: string, proposer: string, payload: TPayload, executionDelaySeconds?: number): Promise<GovernanceProposal<TPayload>>;
    executeGovernanceProposal(proposalId: string, executor: string): Promise<void>;
    getAuditTrail(subject?: string): Promise<AuditLogEntry[]>;
    getPerformanceSnapshot(): Promise<PerformanceSnapshot>;
    createRole(payload: RoleCreationPayload, actor: string, governanceManaged?: boolean): Promise<RoleDefinition>;
    updateRole(payload: UpdateRolePayload, actor: string): Promise<RoleDefinition>;
    assignPermissionToRole(payload: PermissionAssignmentPayload, actor: string): Promise<RoleDefinition>;
    grantDirectPermission(subject: string, permissionId: string, actor: string, effect: AccessEffect, reason?: string, expiresAt?: number): Promise<void>;
    revokeDirectPermission(subject: string, permissionId: string, actor: string): Promise<void>;
    registerContractFunctions(contractId: string, functions: string[], actor: string): Promise<PermissionDefinition[]>;
    castGovernanceVote(proposalId: string, voter: string, choice: GovernanceVoteChoice, reason?: string): Promise<GovernanceProposal>;
    submitCommunityFeedback(proposalId: string, author: string, support: boolean, comment: string): Promise<GovernanceProposal>;
    evaluateGovernanceProposal(proposalId: string): Promise<GovernanceEvaluation>;
    executeEmergencyAction(payload: EmergencyActionPayload, actor: string): Promise<EmergencyState>;
    getRoles(): RoleDefinition[];
    getRole(roleId: string): RoleDefinition | undefined;
    getPermissions(): PermissionDefinition[];
    getPermission(permissionId: string): PermissionDefinition | undefined;
    getConfig(): ACLConfig;
    getEmergencyState(): EmergencyState;
    getGovernanceMembers(): string[];
    getProposal<TPayload = GovernancePayload>(proposalId: string): GovernanceProposal<TPayload>;
    getProposals(): GovernanceProposal[];
    private bootstrapPermissions;
    private bootstrapRoles;
    private getBootstrapPermissionsForRole;
    private logAudit;
    private recordAccessMeasurement;
    private isEmergencyAuthorized;
    private applyGovernancePayload;
    private applyConfigUpdate;
}
export {};
//# sourceMappingURL=AccessControlList.d.ts.map