import { AdvancedProposal, VoteType, Delegation, ReputationRecord, GovernanceAnalytics } from '../structures/GovernanceStructs';

export interface IAdvancedGovernance {
    // Proposals
    propose(
        targets: string[],
        values: number[],
        calldatas: string[],
        description: string,
        proposer: string,
        automationEnabled: boolean
    ): string;

    cancelProposal(proposalId: string, caller: string): void;
    executeProposal(proposalId: string, caller: string): void;
    queueProposal(proposalId: string, caller: string): void;

    // Voting
    castVote(proposalId: string, voteType: VoteType, voter: string): void;
    castVoteWithReason(proposalId: string, voteType: VoteType, reason: string, voter: string): void;

    // Liquid democracy — delegation
    delegate(delegatee: string, votingPower: number, expiresAt: number, caller: string): void;
    undelegate(caller: string): void;
    getDelegation(delegator: string): Delegation | undefined;

    // Reputation
    getReputation(address: string): ReputationRecord;

    // Analytics
    getAnalytics(): GovernanceAnalytics;

    // Queries
    getProposal(proposalId: string): AdvancedProposal;
    getVotingPower(address: string): number;
    hasVoted(proposalId: string, voter: string): boolean;
    totalProposals(): number;
}
