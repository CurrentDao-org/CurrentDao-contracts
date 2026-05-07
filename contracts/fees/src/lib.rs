#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec, vec};

#[contracttype]
pub enum DataKey {
    Admin,
    BaseFee,       // basis points
    DynamicFee,    // basis points (overrides base when active)
    DynamicActive,
    NextRecipientId,
    Recipient(u64),
    RecipientList,
    TotalCollected,
    TotalDistributed,
}

#[contracttype]
#[derive(Clone)]
pub struct FeeRecipient {
    pub id: u64,
    pub address: Address,
    pub share_bps: u32, // share of fees in basis points (sum must = 10000)
    pub label: String,
    pub total_received: i128,
}

#[contract]
pub struct FeesContract;

#[contractimpl]
impl FeesContract {
    pub fn initialize(env: Env, admin: Address, base_fee_bps: u32) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        assert!(base_fee_bps <= 1000, "fee too high");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::BaseFee, &base_fee_bps);
        env.storage().instance().set(&DataKey::DynamicFee, &base_fee_bps);
        env.storage().instance().set(&DataKey::DynamicActive, &false);
        env.storage().instance().set(&DataKey::NextRecipientId, &1u64);
        env.storage().instance().set(&DataKey::TotalCollected, &0i128);
        env.storage().instance().set(&DataKey::TotalDistributed, &0i128);
        env.storage().persistent().set(&DataKey::RecipientList, &vec![&env] as &Vec<u64>);
    }

    // ── Fee configuration ────────────────────────────────────────────────

    pub fn set_base_fee(env: Env, admin: Address, fee_bps: u32) {
        Self::require_admin(&env, &admin);
        assert!(fee_bps <= 1000, "fee too high");
        env.storage().instance().set(&DataKey::BaseFee, &fee_bps);
    }

    pub fn set_dynamic_fee(env: Env, admin: Address, fee_bps: u32, active: bool) {
        Self::require_admin(&env, &admin);
        assert!(fee_bps <= 1000, "fee too high");
        env.storage().instance().set(&DataKey::DynamicFee, &fee_bps);
        env.storage().instance().set(&DataKey::DynamicActive, &active);
    }

    pub fn get_current_fee(env: Env) -> u32 {
        let dynamic_active: bool = env.storage().instance().get(&DataKey::DynamicActive).unwrap_or(false);
        if dynamic_active {
            env.storage().instance().get(&DataKey::DynamicFee).unwrap_or(0)
        } else {
            env.storage().instance().get(&DataKey::BaseFee).unwrap_or(0)
        }
    }

    pub fn calculate_fee(env: Env, amount: i128) -> i128 {
        let fee_bps = Self::get_current_fee(env);
        amount * fee_bps as i128 / 10_000
    }

    // ── Recipients ───────────────────────────────────────────────────────

    pub fn add_recipient(env: Env, admin: Address, address: Address, share_bps: u32, label: String) -> u64 {
        Self::require_admin(&env, &admin);
        // Validate total shares don't exceed 10000
        let list: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RecipientList)
            .unwrap_or_else(|| vec![&env]);
        let mut total_shares: u32 = 0;
        for rid in list.iter() {
            if let Some(r) = env.storage().persistent().get::<_, FeeRecipient>(&DataKey::Recipient(rid)) {
                total_shares += r.share_bps;
            }
        }
        assert!(total_shares + share_bps <= 10_000, "total shares exceed 100%");

        let id = Self::next_id(&env);
        let recipient = FeeRecipient { id, address, share_bps, label, total_received: 0 };
        env.storage().persistent().set(&DataKey::Recipient(id), &recipient);

        let mut list: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RecipientList)
            .unwrap_or_else(|| vec![&env]);
        list.push_back(id);
        env.storage().persistent().set(&DataKey::RecipientList, &list);
        id
    }

    pub fn remove_recipient(env: Env, admin: Address, recipient_id: u64) {
        Self::require_admin(&env, &admin);
        let mut list: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RecipientList)
            .unwrap_or_else(|| vec![&env]);
        let mut new_list: Vec<u64> = vec![&env];
        for rid in list.iter() {
            if rid != recipient_id { new_list.push_back(rid); }
        }
        env.storage().persistent().set(&DataKey::RecipientList, &new_list);
    }

    // ── Distribution ─────────────────────────────────────────────────────

    /// Record fee collection and compute per-recipient amounts. Returns total fee.
    pub fn collect_fee(env: Env, amount: i128) -> i128 {
        let fee = Self::calculate_fee(env.clone(), amount);
        let total: i128 = env.storage().instance().get(&DataKey::TotalCollected).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalCollected, &(total + fee));
        env.events().publish((symbol_short!("fee_col"),), fee);
        fee
    }

    /// Distribute accumulated fees to recipients. Returns total distributed.
    pub fn distribute_fees(env: Env, admin: Address, total_amount: i128) -> i128 {
        Self::require_admin(&env, &admin);
        assert!(total_amount > 0, "nothing to distribute");

        let list: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RecipientList)
            .unwrap_or_else(|| vec![&env]);
        let mut distributed: i128 = 0;

        for rid in list.iter() {
            if let Some(mut r) = env.storage().persistent().get::<_, FeeRecipient>(&DataKey::Recipient(rid)) {
                let share = total_amount * r.share_bps as i128 / 10_000;
                r.total_received += share;
                distributed += share;
                env.storage().persistent().set(&DataKey::Recipient(rid), &r);
                env.events().publish((symbol_short!("fee_dis"), r.address), share);
            }
        }

        let total_dist: i128 = env.storage().instance().get(&DataKey::TotalDistributed).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalDistributed, &(total_dist + distributed));
        distributed
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_recipient(env: Env, recipient_id: u64) -> FeeRecipient {
        env.storage().persistent().get(&DataKey::Recipient(recipient_id)).expect("not found")
    }

    pub fn get_recipient_list(env: Env) -> Vec<u64> {
        env.storage().persistent().get(&DataKey::RecipientList).unwrap_or_else(|| vec![&env])
    }

    pub fn get_total_collected(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalCollected).unwrap_or(0)
    }

    pub fn get_total_distributed(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalDistributed).unwrap_or(0)
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextRecipientId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextRecipientId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
