import { AdvancedGovernance } from './AdvancedGovernance';
import { VoteType, ProposalState } from './structures/GovernanceStructs';

describe('AdvancedGovernance', () => {
    let governance: AdvancedGovernance;
    const owner = 'owner-address';
    const proposer = 'proposer-address';
    const voter1 = 'voter1-address';
    const voter2 = 'voter2-address';
    const delegatee = 'delegatee-address';

    beforeEach(() => {
        governance = new AdvancedGovernance(owner);
        governance.setTokenBalance(proposer, 500);
        governance.setTokenBalance(voter1, 400);
        governance.setTokenBalance(voter2, 100);
        governance.setTokenBalance(delegatee, 200);
    });

    describe('Proposals', () => {
        it('creates a proposal with sufficient tokens', () => {
            const id = governance.propose([], [], [], 'Test proposal', proposer, false);
            const proposal = governance.getProposal(id);
            expect(proposal.state).toBe(ProposalState.Active);
            expect(proposal.proposer).toBe(proposer);
        });

        it('rejects proposal with insufficient tokens', () => {
            governance.setTokenBalance('poor', 10);
            expect(() => governance.propose([], [], [], 'Test', 'poor', false)).toThrow('insufficient tokens');
        });

        it('cancels a proposal by proposer', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.cancelProposal(id, proposer);
            expect(governance.getProposal(id).state).toBe(ProposalState.Cancelled);
        });

        it('cancels a proposal by owner', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.cancelProposal(id, owner);
            expect(governance.getProposal(id).state).toBe(ProposalState.Cancelled);
        });

        it('tracks total proposals', () => {
            governance.propose([], [], [], 'P1', proposer, false);
            governance.propose([], [], [], 'P2', proposer, false);
            expect(governance.totalProposals()).toBe(2);
        });
    });

    describe('Voting', () => {
        it('casts a vote and applies quadratic voting power', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.castVote(id, VoteType.For, voter1);
            const proposal = governance.getProposal(id);
            expect(proposal.forVotes).toBeGreaterThan(0);
            expect(proposal.quadraticForVotes).toBeGreaterThan(0);
        });

        it('prevents double voting', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.castVote(id, VoteType.For, voter1);
            expect(() => governance.castVote(id, VoteType.For, voter1)).toThrow('already voted');
        });

        it('tracks hasVoted correctly', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            expect(governance.hasVoted(id, voter1)).toBe(false);
            governance.castVote(id, VoteType.For, voter1);
            expect(governance.hasVoted(id, voter1)).toBe(true);
        });

        it('casts against vote', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.castVote(id, VoteType.Against, voter2);
            expect(governance.getProposal(id).againstVotes).toBeGreaterThan(0);
        });

        it('casts abstain vote', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.castVote(id, VoteType.Abstain, voter1);
            expect(governance.getProposal(id).abstainVotes).toBeGreaterThan(0);
        });
    });

    describe('Liquid democracy — delegation', () => {
        it('delegates voting power', () => {
            governance.delegate(delegatee, 200, Date.now() + 86400000, voter1);
            const d = governance.getDelegation(voter1);
            expect(d).toBeDefined();
            expect(d!.delegatee).toBe(delegatee);
            expect(d!.active).toBe(true);
        });

        it('undelegates', () => {
            governance.delegate(delegatee, 200, Date.now() + 86400000, voter1);
            governance.undelegate(voter1);
            expect(governance.getDelegation(voter1)!.active).toBe(false);
        });

        it('rejects self-delegation', () => {
            expect(() => governance.delegate(voter1, 100, Date.now() + 1000, voter1)).toThrow('cannot delegate to self');
        });

        it('delegated power increases delegatee voting power', () => {
            governance.delegate(delegatee, 200, Date.now() + 86400000, voter1);
            const power = governance.getVotingPower(delegatee);
            expect(power).toBeGreaterThan(200); // own 200 + delegated 200
        });
    });

    describe('Reputation', () => {
        it('tracks reputation after voting', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.castVote(id, VoteType.For, voter1);
            const rep = governance.getReputation(voter1);
            expect(rep.votesParticipated).toBe(1);
            expect(rep.score).toBeGreaterThan(0);
        });

        it('tracks reputation after proposing', () => {
            governance.propose([], [], [], 'Test', proposer, false);
            const rep = governance.getReputation(proposer);
            expect(rep.proposalsCreated).toBe(1);
        });
    });

    describe('Analytics', () => {
        it('returns governance analytics', () => {
            const id = governance.propose([], [], [], 'Test', proposer, false);
            governance.castVote(id, VoteType.For, voter1);
            const analytics = governance.getAnalytics();
            expect(analytics.totalProposals).toBe(1);
            expect(analytics.activeParticipants).toBeGreaterThan(0);
        });
    });
});
