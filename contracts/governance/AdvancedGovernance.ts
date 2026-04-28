import { IAdvancedGovernance } from './interfaces/IAdvancedGovernance';
import {
    AdvancedProposal,
    ProposalState,
    VoteType,
    VoteRecord,
    Delegation,
    ReputationRecord,
    GovernanceAnalytics
} from './structures/GovernanceStructs';
import { GovernanceLib } from './libraries/GovernanceLib';

/**
 * AdvancedGovernance — DAO 2.0 with Liquid Democracy
 *
 * Features:
 * - Quadratic voting to prevent whale dominance
 * - Liquid democracy: flexible vote delegation
 * - Reputation-based voting power bonuses
 * - Proposal automation support
 * - Governance analytics
 * - Incentive tracking for active participants
 */
export class AdvancedGovernance implements IAdvancedGovernance {
    private proposals: Map<string, AdvancedProposal> = new Map();
    private votes: Map<string, Map<string, VoteRecord>> = new Map(); // proposalId => voter => record
    private delegations: Map<string, Delegation> = new Map(); // delegator => delegation
    private reputations: Map<string, ReputationRecord> = new Map();
    private tokenBalances: Map<string, number> = new Map(); // address => token balance

    private owner: string;
    private proposalCount = 0;
    private proposalThreshold = 100;   // Min tokens to propose
    private quorum = 1000;             // Min total votes for quorum
    private votingPeriod = 24 * 60 * 60 * 1000; // 1 day ms
    private timelockDelay = 48 * 60 * 60 * 1000; // 2 days ms

    constructor(owner: string) {
        this.owner = owner;
    }

    // --- Token balance management (for testing / integration) ---

    setTokenBalance(address: string, balance: number): void {
        this.tokenBalances.set(address, balance);
    }

    // --- Proposals ---

    propose(
        targets: string[],
        values: number[],
        calldatas: string[],
        description: string,
        proposer: string,
        automationEnabled: boolean
    ): string {
        const balance = this.tokenBalances.get(proposer) ?? 0;
        if (balance < this.proposalThreshold) throw new Error('AdvancedGovernance: insufficient tokens to propose');

        const id = GovernanceLib.generateProposalId(proposer, description, this.proposalCount++);
        const now = Date.now();
        const proposal: AdvancedProposal = {
            id,
            proposer,
            description,
            targets,
            values,
            calldatas,
            startTime: now,
            endTime: now + this.votingPeriod,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            quadraticForVotes: 0,
            quadraticAgainstVotes: 0,
            state: ProposalState.Active,
            executed: false,
            cancelled: false,
            automationEnabled
        };
        this.proposals.set(id, proposal);
        this.votes.set(id, new Map());

        // Update proposer reputation
        const rep = this.getOrCreateReputation(proposer);
        rep.proposalsCreated++;
        rep.lastUpdated = now;

        return id;
    }

    cancelProposal(proposalId: string, caller: string): void {
        const proposal = this.getProposal(proposalId);
        if (proposal.proposer !== caller && caller !== this.owner) {
            throw new Error('AdvancedGovernance: not authorized to cancel');
        }
        if (proposal.state !== ProposalState.Active && proposal.state !== ProposalState.Pending) {
            throw new Error('AdvancedGovernance: proposal not cancellable');
        }
        proposal.state = ProposalState.Cancelled;
        proposal.cancelled = true;
    }

    queueProposal(proposalId: string, caller: string): void {
        const proposal = this.getProposal(proposalId);
        if (proposal.state !== ProposalState.Succeeded) throw new Error('AdvancedGovernance: proposal not succeeded');
        proposal.state = ProposalState.Queued;
    }

    executeProposal(proposalId: string, caller: string): void {
        const proposal = this.getProposal(proposalId);
        if (proposal.state !== ProposalState.Queued && proposal.state !== ProposalState.Succeeded) {
            throw new Error('AdvancedGovernance: proposal not executable');
        }
        proposal.state = ProposalState.Executed;
        proposal.executed = true;

        // Update proposer reputation for successful proposal
        const rep = this.getOrCreateReputation(proposal.proposer);
        rep.successfulProposals++;
        rep.score += 10;
        rep.lastUpdated = Date.now();
    }

    // --- Voting ---

    castVote(proposalId: string, voteType: VoteType, voter: string): void {
        this.castVoteWithReason(proposalId, voteType, '', voter);
    }

    castVoteWithReason(proposalId: string, voteType: VoteType, reason: string, voter: string): void {
        const proposal = this.getProposal(proposalId);
        if (proposal.state !== ProposalState.Active) throw new Error('AdvancedGovernance: voting not active');
        if (Date.now() > proposal.endTime) throw new Error('AdvancedGovernance: voting period ended');

        const voterMap = this.votes.get(proposalId)!;
        if (voterMap.has(voter)) throw new Error('AdvancedGovernance: already voted');

        const balance = this.getEffectiveVotingPower(voter);
        const rep = this.getOrCreateReputation(voter);
        const quadraticPower = GovernanceLib.quadraticVotingPower(balance);
        const reputationBonus = GovernanceLib.reputationBonus(rep);
        const effectivePower = GovernanceLib.effectiveVotingPower(balance, rep);

        const record: VoteRecord = {
            voter,
            proposalId,
            voteType,
            rawVotingPower: balance,
            quadraticVotingPower: quadraticPower,
            reputationBonus,
            timestamp: Date.now()
        };
        voterMap.set(voter, record);

        if (voteType === VoteType.For) {
            proposal.forVotes += effectivePower;
            proposal.quadraticForVotes += quadraticPower;
        } else if (voteType === VoteType.Against) {
            proposal.againstVotes += effectivePower;
            proposal.quadraticAgainstVotes += quadraticPower;
        } else {
            proposal.abstainVotes += effectivePower;
        }

        // Update reputation
        rep.votesParticipated++;
        rep.score += 1;
        rep.lastUpdated = Date.now();

        // Auto-finalize if voting period ended
        this.tryFinalizeProposal(proposal);
    }

    // --- Liquid democracy ---

    delegate(delegatee: string, votingPower: number, expiresAt: number, caller: string): void {
        if (caller === delegatee) throw new Error('AdvancedGovernance: cannot delegate to self');
        const balance = this.tokenBalances.get(caller) ?? 0;
        if (votingPower > balance) throw new Error('AdvancedGovernance: insufficient balance to delegate');

        const delegation: Delegation = {
            delegator: caller,
            delegatee,
            votingPower,
            expiresAt,
            active: true
        };
        this.delegations.set(caller, delegation);
    }

    undelegate(caller: string): void {
        const delegation = this.delegations.get(caller);
        if (!delegation || !delegation.active) throw new Error('AdvancedGovernance: no active delegation');
        delegation.active = false;
    }

    getDelegation(delegator: string): Delegation | undefined {
        return this.delegations.get(delegator);
    }

    // --- Reputation ---

    getReputation(address: string): ReputationRecord {
        return this.getOrCreateReputation(address);
    }

    // --- Analytics ---

    getAnalytics(): GovernanceAnalytics {
        const allProposals = Array.from(this.proposals.values());
        const activeParticipants = new Set<string>();
        let totalVotes = 0;

        for (const [, voterMap] of this.votes) {
            for (const voter of voterMap.keys()) {
                activeParticipants.add(voter);
                totalVotes++;
            }
        }

        const totalEligible = this.tokenBalances.size;
        const participationRate = GovernanceLib.participationRate(activeParticipants.size, totalEligible);
        const delegationCount = Array.from(this.delegations.values()).filter(d => d.active).length;
        const delegationRate = totalEligible > 0 ? Math.floor((delegationCount * 100) / totalEligible) : 0;

        return {
            totalProposals: allProposals.length,
            activeParticipants: activeParticipants.size,
            averageParticipationRate: participationRate,
            quadraticVoteWeight: 50, // Quadratic voting weight percentage
            delegationRate,
            reportedAt: Date.now()
        };
    }

    // --- Queries ---

    getProposal(proposalId: string): AdvancedProposal {
        const p = this.proposals.get(proposalId);
        if (!p) throw new Error(`AdvancedGovernance: proposal ${proposalId} not found`);
        return p;
    }

    getVotingPower(address: string): number {
        return this.getEffectiveVotingPower(address);
    }

    hasVoted(proposalId: string, voter: string): boolean {
        return this.votes.get(proposalId)?.has(voter) ?? false;
    }

    totalProposals(): number {
        return this.proposals.size;
    }

    // --- Helpers ---

    private getEffectiveVotingPower(address: string): number {
        let power = this.tokenBalances.get(address) ?? 0;
        // Add delegated power
        for (const [, d] of this.delegations) {
            if (d.delegatee === address && d.active && Date.now() < d.expiresAt) {
                power += d.votingPower;
            }
        }
        return power;
    }

    private getOrCreateReputation(address: string): ReputationRecord {
        if (!this.reputations.has(address)) {
            this.reputations.set(address, {
                address,
                score: 0,
                proposalsCreated: 0,
                votesParticipated: 0,
                successfulProposals: 0,
                lastUpdated: Date.now()
            });
        }
        return this.reputations.get(address)!;
    }

    private tryFinalizeProposal(proposal: AdvancedProposal): void {
        if (Date.now() <= proposal.endTime) return;
        const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        if (totalVotes < this.quorum) {
            proposal.state = ProposalState.Defeated;
        } else if (proposal.forVotes > proposal.againstVotes) {
            proposal.state = ProposalState.Succeeded;
            if (proposal.automationEnabled) {
                proposal.state = ProposalState.Queued;
            }
        } else {
            proposal.state = ProposalState.Defeated;
        }
    }
}
