#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    NextTokenId,
    Token(u64),
    Approval(u64),           // token_id -> approved address
    OperatorApproval(Address, Address), // (owner, operator) -> bool
}

#[contracttype]
#[derive(Clone)]
pub struct EnergyAssetNFT {
    pub id: u64,
    pub owner: Address,
    pub asset_type: String,   // "solar_panel", "wind_turbine", "battery", etc.
    pub capacity_kw: i128,
    pub location: String,
    pub installed_at: u64,
    pub metadata_uri: String,
    pub is_active: bool,
}

#[contract]
pub struct NftContract;

#[contractimpl]
impl NftContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextTokenId, &1u64);
    }

    // ── Minting ──────────────────────────────────────────────────────────

    pub fn mint(
        env: Env,
        admin: Address,
        owner: Address,
        asset_type: String,
        capacity_kw: i128,
        location: String,
        metadata_uri: String,
    ) -> u64 {
        Self::require_admin(&env, &admin);
        assert!(capacity_kw > 0, "capacity must be positive");

        let id = Self::next_id(&env);
        let token = EnergyAssetNFT {
            id,
            owner: owner.clone(),
            asset_type,
            capacity_kw,
            location,
            installed_at: env.ledger().timestamp(),
            metadata_uri,
            is_active: true,
        };
        env.storage().persistent().set(&DataKey::Token(id), &token);
        env.events().publish((symbol_short!("mint"), owner), id);
        id
    }

    pub fn burn(env: Env, owner: Address, token_id: u64) {
        owner.require_auth();
        let token: EnergyAssetNFT = Self::get_inner(&env, token_id);
        assert!(token.owner == owner, "not owner");
        env.storage().persistent().remove(&DataKey::Token(token_id));
        env.events().publish((symbol_short!("burn"), owner), token_id);
    }

    // ── Transfers ────────────────────────────────────────────────────────

    pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) {
        from.require_auth();
        let mut token: EnergyAssetNFT = Self::get_inner(&env, token_id);
        assert!(token.owner == from, "not owner");
        token.owner = to.clone();
        env.storage().persistent().set(&DataKey::Token(token_id), &token);
        // Clear approval on transfer
        env.storage().persistent().remove(&DataKey::Approval(token_id));
        env.events().publish((symbol_short!("transfer"), from), (to, token_id));
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, token_id: u64) {
        spender.require_auth();
        let mut token: EnergyAssetNFT = Self::get_inner(&env, token_id);
        assert!(token.owner == from, "not owner");

        let approved: Option<Address> = env.storage().persistent().get(&DataKey::Approval(token_id));
        let is_operator = env.storage().persistent()
            .get::<_, bool>(&DataKey::OperatorApproval(from.clone(), spender.clone()))
            .unwrap_or(false);
        assert!(
            approved.map(|a| a == spender).unwrap_or(false) || is_operator,
            "not approved"
        );

        token.owner = to.clone();
        env.storage().persistent().set(&DataKey::Token(token_id), &token);
        env.storage().persistent().remove(&DataKey::Approval(token_id));
        env.events().publish((symbol_short!("transfer"), from), (to, token_id));
    }

    // ── Approvals ────────────────────────────────────────────────────────

    pub fn approve(env: Env, owner: Address, approved: Address, token_id: u64) {
        owner.require_auth();
        let token: EnergyAssetNFT = Self::get_inner(&env, token_id);
        assert!(token.owner == owner, "not owner");
        env.storage().persistent().set(&DataKey::Approval(token_id), &approved);
    }

    pub fn set_approval_for_all(env: Env, owner: Address, operator: Address, approved: bool) {
        owner.require_auth();
        env.storage().persistent().set(&DataKey::OperatorApproval(owner, operator), &approved);
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_token(env: Env, token_id: u64) -> EnergyAssetNFT {
        Self::get_inner(&env, token_id)
    }

    pub fn owner_of(env: Env, token_id: u64) -> Address {
        Self::get_inner(&env, token_id).owner
    }

    pub fn get_approved(env: Env, token_id: u64) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Approval(token_id))
    }

    pub fn is_approved_for_all(env: Env, owner: Address, operator: Address) -> bool {
        env.storage().persistent()
            .get(&DataKey::OperatorApproval(owner, operator))
            .unwrap_or(false)
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn get_inner(env: &Env, id: u64) -> EnergyAssetNFT {
        env.storage().persistent().get(&DataKey::Token(id)).expect("token not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextTokenId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextTokenId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
