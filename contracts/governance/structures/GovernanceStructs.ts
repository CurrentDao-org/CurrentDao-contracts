export enum ProposalState {
    Pending = 'Pending',
    Active = 'Active',
    Succeeded = 'Succeeded',
    Defeated = 'Defeated',
    Queued = 'Queued',
    Executed = 'Executed',
    Cancelled = 'Cancelled'
}

export enum VoteType {
    Against = 0,
    For = 1,
    Abstain = 2
}

export interface AdvancedProposal {
    id: string;
    proposer: string;
    description: string;
    targets: string[];
    values: number[];
    calldatas: string[];
    startTime: number;
    endTime: number;
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
    quadraticForVotes: number;
    quadraticAgainstVotes: number;
    state: ProposalState;
    executed: boolean;
    cancelled: boolean;
    automationEnabled: boolean;
}

export interface VoteRecord {
    voter: string;
    proposalId: string;
    voteType: VoteType;
    rawVotingPower: number;
    quadraticVotingPower: number;
    reputationBonus: number;
    timestamp: number;
}

export interface Delegation {
    delegator: string;
    delegatee: string;
    votingPower: number;
    expiresAt: number;
    active: boolean;
}

export interface ReputationRecord {
    address: string;
    score: number;
    proposalsCreated: number;
    votesParticipated: number;
    successfulProposals: number;
    lastUpdated: number;
}

export interface GovernanceAnalytics {
    totalProposals: number;
    activeParticipants: number;
    averageParticipationRate: number;
    quadraticVoteWeight: number;
    delegationRate: number;
    reportedAt: number;
}
