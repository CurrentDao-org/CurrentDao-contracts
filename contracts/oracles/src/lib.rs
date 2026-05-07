#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec, vec};

#[contracttype]
pub enum DataKey {
    Admin,
    NextNodeId,
    NextRequestId,
    Node(u64),
    Request(u64),
    NodeByOperator(Address),
    MinStake,
    NetworkFee,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum RequestStatus {
    Pending,
    Fulfilled,
    Failed,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub struct OracleNode {
    pub id: u64,
    pub operator: Address,
    pub stake: i128,
    pub reputation: u32,   // 0-100
    pub is_active: bool,
    pub total_responses: u64,
    pub successful_responses: u64,
    pub registered_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct DataRequest {
    pub id: u64,
    pub requester: Address,
    pub data_type: String,
    pub parameters: String,
    pub bounty: i128,
    pub min_responses: u32,
    pub status: RequestStatus,
    pub created_at: u64,
    pub result: String,
    pub response_count: u32,
}

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn initialize(env: Env, admin: Address, min_stake: i128, network_fee: i128) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextNodeId, &1u64);
        env.storage().instance().set(&DataKey::NextRequestId, &1u64);
        env.storage().instance().set(&DataKey::MinStake, &min_stake);
        env.storage().instance().set(&DataKey::NetworkFee, &network_fee);
    }

    // ── Node registry ────────────────────────────────────────────────────

    pub fn register_node(env: Env, operator: Address, stake: i128) -> u64 {
        operator.require_auth();
        let min_stake: i128 = env.storage().instance().get(&DataKey::MinStake).unwrap_or(0);
        assert!(stake >= min_stake, "insufficient stake");
        assert!(
            !env.storage().persistent().has(&DataKey::NodeByOperator(operator.clone())),
            "already registered"
        );

        let id = Self::next_id(&env, DataKey::NextNodeId);
        let node = OracleNode {
            id,
            operator: operator.clone(),
            stake,
            reputation: 50, // start at 50
            is_active: true,
            total_responses: 0,
            successful_responses: 0,
            registered_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Node(id), &node);
        env.storage().persistent().set(&DataKey::NodeByOperator(operator.clone()), &id);
        env.events().publish((symbol_short!("node_reg"), operator), (id, stake));
        id
    }

    pub fn deregister_node(env: Env, operator: Address) {
        operator.require_auth();
        let node_id: u64 = env.storage().persistent()
            .get(&DataKey::NodeByOperator(operator.clone()))
            .expect("node not found");
        let mut node: OracleNode = env.storage().persistent()
            .get(&DataKey::Node(node_id))
            .expect("node not found");
        node.is_active = false;
        env.storage().persistent().set(&DataKey::Node(node_id), &node);
    }

    pub fn slash_node(env: Env, admin: Address, node_id: u64, amount: i128) {
        Self::require_admin(&env, &admin);
        let mut node: OracleNode = env.storage().persistent()
            .get(&DataKey::Node(node_id))
            .expect("node not found");
        node.stake = (node.stake - amount).max(0);
        node.reputation = node.reputation.saturating_sub(10);
        if node.stake == 0 { node.is_active = false; }
        env.storage().persistent().set(&DataKey::Node(node_id), &node);
    }

    // ── Data requests ────────────────────────────────────────────────────

    pub fn submit_request(
        env: Env,
        requester: Address,
        data_type: String,
        parameters: String,
        bounty: i128,
        min_responses: u32,
    ) -> u64 {
        requester.require_auth();
        assert!(bounty >= 0, "invalid bounty");
        assert!(min_responses > 0, "need at least 1 response");

        let id = Self::next_id(&env, DataKey::NextRequestId);
        let request = DataRequest {
            id,
            requester: requester.clone(),
            data_type,
            parameters,
            bounty,
            min_responses,
            status: RequestStatus::Pending,
            created_at: env.ledger().timestamp(),
            result: String::from_str(&env, ""),
            response_count: 0,
        };
        env.storage().persistent().set(&DataKey::Request(id), &request);
        env.events().publish((symbol_short!("req_sub"), requester), (id, bounty));
        id
    }

    pub fn fulfill_request(env: Env, operator: Address, request_id: u64, result: String) {
        operator.require_auth();
        let node_id: u64 = env.storage().persistent()
            .get(&DataKey::NodeByOperator(operator.clone()))
            .expect("not a registered node");
        let mut node: OracleNode = env.storage().persistent()
            .get(&DataKey::Node(node_id))
            .expect("node not found");
        assert!(node.is_active, "node not active");

        let mut request: DataRequest = env.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");
        assert!(request.status == RequestStatus::Pending, "request not pending");

        request.response_count += 1;
        node.total_responses += 1;
        node.successful_responses += 1;

        if request.response_count >= request.min_responses {
            request.result = result;
            request.status = RequestStatus::Fulfilled;
            // Reputation boost
            node.reputation = (node.reputation + 1).min(100);
        }

        env.storage().persistent().set(&DataKey::Request(request_id), &request);
        env.storage().persistent().set(&DataKey::Node(node_id), &node);
        env.events().publish((symbol_short!("req_done"), operator), request_id);
    }

    pub fn cancel_request(env: Env, requester: Address, request_id: u64) {
        requester.require_auth();
        let mut request: DataRequest = env.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");
        assert!(request.requester == requester, "not requester");
        assert!(request.status == RequestStatus::Pending, "not pending");
        request.status = RequestStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Request(request_id), &request);
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_node(env: Env, node_id: u64) -> OracleNode {
        env.storage().persistent().get(&DataKey::Node(node_id)).expect("node not found")
    }

    pub fn get_node_id_by_operator(env: Env, operator: Address) -> u64 {
        env.storage().persistent().get(&DataKey::NodeByOperator(operator)).expect("not registered")
    }

    pub fn get_request(env: Env, request_id: u64) -> DataRequest {
        env.storage().persistent().get(&DataKey::Request(request_id)).expect("request not found")
    }

    pub fn get_reputation(env: Env, node_id: u64) -> u32 {
        let node: OracleNode = env.storage().persistent()
            .get(&DataKey::Node(node_id))
            .expect("node not found");
        node.reputation
    }

    // ── Admin ────────────────────────────────────────────────────────────

    pub fn set_min_stake(env: Env, admin: Address, min_stake: i128) {
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::MinStake, &min_stake);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn next_id(env: &Env, key: DataKey) -> u64 {
        let id: u64 = env.storage().instance().get(&key).unwrap_or(1);
        env.storage().instance().set(&key, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
