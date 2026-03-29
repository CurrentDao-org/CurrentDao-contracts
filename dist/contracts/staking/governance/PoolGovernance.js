"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolGovernance = void 0;
const VOTING_PERIOD = 7 * 86_400; // 7 days
const QUORUM_BPS = 1000; // 10% of total voting weight
const PASS_THRESHOLD_BPS = 5001; // >50% to pass
class PoolGovernance {
    proposals = new Map();
    nextProposalId = 1;
    totalVotingWeight;
    onExecute;
    constructor(totalVotingWeight, onExecute) {
        this.totalVotingWeight = totalVotingWeight;
        this.onExecute = onExecute;
    }
    propose(poolId, paramKey, newValue, proposer, now) {
        const id = this.nextProposalId++;
        this.proposals.set(id, {
            proposalId: id,
            poolId,
            paramKey,
            newValue,
            proposer,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            deadline: now + VOTING_PERIOD,
        });
        return id;
    }
    vote(proposalId, voter, support, weight, now) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)
            throw new Error('Proposal not found');
        if (now > proposal.deadline)
            throw new Error('Voting period ended');
        if (proposal.executed)
            throw new Error('Proposal already executed');
        if (weight <= 0)
            throw new Error('Vote weight must be positive');
        if (support) {
            proposal.votesFor += weight;
        }
        else {
            proposal.votesAgainst += weight;
        }
    }
    execute(proposalId, now) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)
            throw new Error('Proposal not found');
        if (now <= proposal.deadline)
            throw new Error('Voting period not ended');
        if (proposal.executed)
            throw new Error('Already executed');
        const totalVotes = proposal.votesFor + proposal.votesAgainst;
        const quorum = (this.totalVotingWeight * QUORUM_BPS) / 10_000;
        if (totalVotes < quorum)
            throw new Error('Quorum not reached');
        const forBps = (proposal.votesFor / totalVotes) * 10_000;
        if (forBps <= PASS_THRESHOLD_BPS)
            throw new Error('Proposal did not pass');
        proposal.executed = true;
        this.onExecute(proposal.poolId, proposal.paramKey, proposal.newValue);
    }
    getProposal(proposalId) {
        return this.proposals.get(proposalId) ?? null;
    }
    getActiveProposals(now) {
        return Array.from(this.proposals.values()).filter(p => !p.executed && now <= p.deadline);
    }
    updateTotalVotingWeight(weight) {
        this.totalVotingWeight = weight;
    }
}
exports.PoolGovernance = PoolGovernance;
//# sourceMappingURL=PoolGovernance.js.map