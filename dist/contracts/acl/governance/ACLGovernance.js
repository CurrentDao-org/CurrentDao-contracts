"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACLGovernance = void 0;
const IAccessControlList_1 = require("../interfaces/IAccessControlList");
const ACLLib_1 = require("../libraries/ACLLib");
/**
 * @title ACLGovernance
 * @dev Proposal and voting engine for dynamic role management and ACL configuration changes
 */
class ACLGovernance {
    governanceMembers = new Set();
    proposals = new Map();
    constructor(initialGovernanceMembers) {
        initialGovernanceMembers.forEach((member) => this.governanceMembers.add(member));
    }
    createProposal(type, title, description, proposer, payload, executionDelaySeconds = 0) {
        this.assertGovernanceMember(proposer);
        const proposal = {
            id: `${type}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            type,
            title,
            description,
            proposer,
            payload,
            votes: [],
            feedback: [],
            createdAt: ACLLib_1.ACLLib.now(),
            executableAt: ACLLib_1.ACLLib.now() + executionDelaySeconds,
            status: 'PENDING'
        };
        this.proposals.set(proposal.id, proposal);
        return this.getProposal(proposal.id);
    }
    castVote(proposalId, voter, choice, reason) {
        this.assertGovernanceMember(voter);
        const proposal = this.getMutableProposal(proposalId);
        proposal.votes = proposal.votes.filter((vote) => vote.voter !== voter);
        const vote = {
            voter,
            choice,
            weight: 1,
            ...(reason ? { reason } : {}),
            timestamp: ACLLib_1.ACLLib.now()
        };
        proposal.votes.push(vote);
        return this.getProposal(proposalId);
    }
    submitCommunityFeedback(proposalId, author, support, comment) {
        const proposal = this.getMutableProposal(proposalId);
        const feedback = {
            author,
            support,
            comment,
            timestamp: ACLLib_1.ACLLib.now()
        };
        proposal.feedback.push(feedback);
        return this.getProposal(proposalId);
    }
    evaluateProposal(proposalId, threshold, communityQuorum) {
        const proposal = this.getMutableProposal(proposalId);
        const forVotes = proposal.votes.filter((vote) => vote.choice === IAccessControlList_1.GovernanceVoteChoice.FOR).reduce((sum, vote) => sum + vote.weight, 0);
        const againstVotes = proposal.votes.filter((vote) => vote.choice === IAccessControlList_1.GovernanceVoteChoice.AGAINST).reduce((sum, vote) => sum + vote.weight, 0);
        const abstainVotes = proposal.votes.filter((vote) => vote.choice === IAccessControlList_1.GovernanceVoteChoice.ABSTAIN).reduce((sum, vote) => sum + vote.weight, 0);
        const communitySupport = proposal.feedback.filter((item) => item.support).length;
        const communityOpposition = proposal.feedback.filter((item) => !item.support).length;
        const approved = forVotes >= threshold && forVotes > againstVotes && proposal.feedback.length >= communityQuorum;
        proposal.status = approved ? 'APPROVED' : proposal.status === 'EXECUTED' ? 'EXECUTED' : 'PENDING';
        return {
            approved,
            forVotes,
            againstVotes,
            abstainVotes,
            communitySupport,
            communityOpposition
        };
    }
    markExecuted(proposalId) {
        const proposal = this.getMutableProposal(proposalId);
        if (proposal.status !== 'APPROVED') {
            throw new Error(IAccessControlList_1.ACL_ERROR.PROPOSAL_NOT_APPROVED);
        }
        if (proposal.executableAt > ACLLib_1.ACLLib.now()) {
            throw new Error(IAccessControlList_1.ACL_ERROR.PROPOSAL_NOT_EXECUTABLE);
        }
        proposal.status = 'EXECUTED';
        proposal.executedAt = ACLLib_1.ACLLib.now();
        return this.getProposal(proposalId);
    }
    addGovernanceMember(member) {
        this.governanceMembers.add(member);
    }
    removeGovernanceMember(member) {
        this.governanceMembers.delete(member);
    }
    replaceGovernanceMembers(members) {
        this.governanceMembers.clear();
        members.forEach((member) => this.governanceMembers.add(member));
    }
    isGovernanceMember(member) {
        return this.governanceMembers.has(member);
    }
    getGovernanceMembers() {
        return [...this.governanceMembers.values()];
    }
    getProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(IAccessControlList_1.ACL_ERROR.PROPOSAL_NOT_FOUND);
        }
        return {
            ...proposal,
            votes: proposal.votes.map((vote) => ({ ...vote })),
            feedback: proposal.feedback.map((item) => ({ ...item }))
        };
    }
    getProposals() {
        return [...this.proposals.keys()].map((proposalId) => this.getProposal(proposalId));
    }
    getMutableProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(IAccessControlList_1.ACL_ERROR.PROPOSAL_NOT_FOUND);
        }
        return proposal;
    }
    assertGovernanceMember(member) {
        if (!this.governanceMembers.has(member)) {
            throw new Error(IAccessControlList_1.ACL_ERROR.INVALID_GOVERNANCE_MEMBER);
        }
    }
}
exports.ACLGovernance = ACLGovernance;
//# sourceMappingURL=ACLGovernance.js.map