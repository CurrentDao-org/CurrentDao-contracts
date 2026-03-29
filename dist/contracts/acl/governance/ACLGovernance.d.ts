import { GovernanceEvaluation, GovernanceProposal, GovernanceProposalType, GovernanceVoteChoice } from '../interfaces/IAccessControlList';
/**
 * @title ACLGovernance
 * @dev Proposal and voting engine for dynamic role management and ACL configuration changes
 */
export declare class ACLGovernance {
    private readonly governanceMembers;
    private readonly proposals;
    constructor(initialGovernanceMembers: string[]);
    createProposal<TPayload>(type: GovernanceProposalType, title: string, description: string, proposer: string, payload: TPayload, executionDelaySeconds?: number): GovernanceProposal<TPayload>;
    castVote(proposalId: string, voter: string, choice: GovernanceVoteChoice, reason?: string): GovernanceProposal;
    submitCommunityFeedback(proposalId: string, author: string, support: boolean, comment: string): GovernanceProposal;
    evaluateProposal(proposalId: string, threshold: number, communityQuorum: number): GovernanceEvaluation;
    markExecuted(proposalId: string): GovernanceProposal;
    addGovernanceMember(member: string): void;
    removeGovernanceMember(member: string): void;
    replaceGovernanceMembers(members: string[]): void;
    isGovernanceMember(member: string): boolean;
    getGovernanceMembers(): string[];
    getProposal<TPayload = unknown>(proposalId: string): GovernanceProposal<TPayload>;
    getProposals(): GovernanceProposal[];
    private getMutableProposal;
    private assertGovernanceMember;
}
//# sourceMappingURL=ACLGovernance.d.ts.map