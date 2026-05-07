#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    StakingContract,
    NextProposalId,
    Proposal(u64),
    Vote(u64, Address), // (proposal_id, voter) -> bool (support)
    MinVotingPower,
    VotingPeriod,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Cancelled,
    Executed,
}

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub call_data: String,   // encoded action description
    pub votes_for: i128,
    pub votes_against: i128,
    pub status: ProposalStatus,
    pub created_at: u64,
    pub voting_ends_at: u64,
    pub executed_at: u64,
}

#[contract]
pub struct ProposalsContract;

#[contractimpl]
impl ProposalsContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        min_voting_power: i128,
        voting_period_seconds: u64,
    ) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextProposalId, &1u64);
        env.storage().instance().set(&DataKey::MinVotingPower, &min_voting_power);
        env.storage().instance().set(&DataKey::VotingPeriod, &voting_period_seconds);
    }

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        call_data: String,
    ) -> u64 {
        proposer.require_auth();
        let voting_period: u64 = env.storage().instance().get(&DataKey::VotingPeriod).unwrap_or(604_800);
        let now = env.ledger().timestamp();
        let id = Self::next_id(&env);

        let proposal = Proposal {
            id,
            proposer: proposer.clone(),
            title,
            description,
            call_data,
            votes_for: 0,
            votes_against: 0,
            status: ProposalStatus::Active,
            created_at: now,
            voting_ends_at: now + voting_period,
            executed_at: 0,
        };
        env.storage().persistent().set(&DataKey::Proposal(id), &proposal);
        env.events().publish((symbol_short!("prop_new"), proposer), id);
        id
    }

    pub fn vote(env: Env, voter: Address, proposal_id: u64, support: bool, voting_power: i128) {
        voter.require_auth();
        assert!(voting_power > 0, "no voting power");

        let min_power: i128 = env.storage().instance().get(&DataKey::MinVotingPower).unwrap_or(0);
        assert!(voting_power >= min_power, "insufficient voting power");

        let vote_key = DataKey::Vote(proposal_id, voter.clone());
        assert!(!env.storage().persistent().has(&vote_key), "already voted");

        let mut proposal: Proposal = Self::get_inner(&env, proposal_id);
        assert!(proposal.status == ProposalStatus::Active, "not active");
        assert!(env.ledger().timestamp() < proposal.voting_ends_at, "voting ended");

        if support {
            proposal.votes_for += voting_power;
        } else {
            proposal.votes_against += voting_power;
        }

        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage().persistent().set(&vote_key, &support);
        env.events().publish((symbol_short!("voted"), voter), (proposal_id, support, voting_power));
    }

    pub fn finalize(env: Env, proposal_id: u64) {
        let mut proposal: Proposal = Self::get_inner(&env, proposal_id);
        assert!(proposal.status == ProposalStatus::Active, "not active");
        assert!(env.ledger().timestamp() >= proposal.voting_ends_at, "voting not ended");

        proposal.status = if proposal.votes_for > proposal.votes_against {
            ProposalStatus::Passed
        } else {
            ProposalStatus::Rejected
        };
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        env.events().publish((symbol_short!("finalize"),), (proposal_id, proposal.status == ProposalStatus::Passed));
    }

    pub fn execute(env: Env, admin: Address, proposal_id: u64) {
        Self::require_admin(&env, &admin);
        let mut proposal: Proposal = Self::get_inner(&env, proposal_id);
        assert!(proposal.status == ProposalStatus::Passed, "not passed");
        proposal.status = ProposalStatus::Executed;
        proposal.executed_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        env.events().publish((symbol_short!("executed"),), proposal_id);
    }

    pub fn cancel(env: Env, proposer: Address, proposal_id: u64) {
        proposer.require_auth();
        let mut proposal: Proposal = Self::get_inner(&env, proposal_id);
        assert!(proposal.proposer == proposer, "not proposer");
        assert!(proposal.status == ProposalStatus::Active, "not active");
        proposal.status = ProposalStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        Self::get_inner(&env, proposal_id)
    }

    pub fn has_voted(env: Env, voter: Address, proposal_id: u64) -> bool {
        env.storage().persistent().has(&DataKey::Vote(proposal_id, voter))
    }

    fn get_inner(env: &Env, id: u64) -> Proposal {
        env.storage().persistent().get(&DataKey::Proposal(id)).expect("proposal not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextProposalId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextProposalId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
