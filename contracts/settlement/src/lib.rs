#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    NextSettlementId,
    Settlement(u64),
    FxRate(String, String), // (from_currency, to_currency) -> rate * 1e6
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum SettlementStatus {
    Pending,
    Completed,
    Failed,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub struct Settlement {
    pub id: u64,
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub from_currency: String,
    pub to_currency: String,
    pub converted_amount: i128,
    pub fx_rate: i128,       // rate * 1_000_000
    pub fee: i128,
    pub status: SettlementStatus,
    pub created_at: u64,
    pub settled_at: u64,
}

#[contract]
pub struct SettlementContract;

#[contractimpl]
impl SettlementContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextSettlementId, &1u64);
    }

    // ── FX rates (set by admin / oracle) ────────────────────────────────

    pub fn set_fx_rate(env: Env, admin: Address, from: String, to: String, rate: i128) {
        Self::require_admin(&env, &admin);
        assert!(rate > 0, "rate must be positive");
        env.storage().persistent().set(&DataKey::FxRate(from, to), &rate);
    }

    pub fn get_fx_rate(env: Env, from: String, to: String) -> i128 {
        env.storage().persistent()
            .get(&DataKey::FxRate(from, to))
            .unwrap_or(0)
    }

    // ── Settlement ───────────────────────────────────────────────────────

    pub fn initiate_settlement(
        env: Env,
        sender: Address,
        receiver: Address,
        amount: i128,
        from_currency: String,
        to_currency: String,
        fee_bps: u32,
    ) -> u64 {
        sender.require_auth();
        assert!(amount > 0, "amount must be positive");

        let rate: i128 = env.storage().persistent()
            .get(&DataKey::FxRate(from_currency.clone(), to_currency.clone()))
            .expect("FX rate not set");

        let fee = amount * fee_bps as i128 / 10_000;
        let net_amount = amount - fee;
        let converted = net_amount * rate / 1_000_000;

        let id = Self::next_id(&env);
        let settlement = Settlement {
            id,
            sender: sender.clone(),
            receiver,
            amount,
            from_currency,
            to_currency,
            converted_amount: converted,
            fx_rate: rate,
            fee,
            status: SettlementStatus::Pending,
            created_at: env.ledger().timestamp(),
            settled_at: 0,
        };
        env.storage().persistent().set(&DataKey::Settlement(id), &settlement);
        env.events().publish((symbol_short!("settle"),  sender), (id, amount, converted));
        id
    }

    pub fn complete_settlement(env: Env, admin: Address, settlement_id: u64) {
        Self::require_admin(&env, &admin);
        let mut s: Settlement = Self::get_inner(&env, settlement_id);
        assert!(s.status == SettlementStatus::Pending, "not pending");
        s.status = SettlementStatus::Completed;
        s.settled_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Settlement(settlement_id), &s);
        env.events().publish((symbol_short!("s_done"),), settlement_id);
    }

    pub fn fail_settlement(env: Env, admin: Address, settlement_id: u64) {
        Self::require_admin(&env, &admin);
        let mut s: Settlement = Self::get_inner(&env, settlement_id);
        assert!(s.status == SettlementStatus::Pending, "not pending");
        s.status = SettlementStatus::Failed;
        env.storage().persistent().set(&DataKey::Settlement(settlement_id), &s);
    }

    pub fn cancel_settlement(env: Env, sender: Address, settlement_id: u64) {
        sender.require_auth();
        let mut s: Settlement = Self::get_inner(&env, settlement_id);
        assert!(s.sender == sender, "not sender");
        assert!(s.status == SettlementStatus::Pending, "not pending");
        s.status = SettlementStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Settlement(settlement_id), &s);
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_settlement(env: Env, settlement_id: u64) -> Settlement {
        Self::get_inner(&env, settlement_id)
    }

    pub fn convert_amount(env: Env, amount: i128, from: String, to: String) -> i128 {
        let rate: i128 = env.storage().persistent()
            .get(&DataKey::FxRate(from, to))
            .unwrap_or(0);
        amount * rate / 1_000_000
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn get_inner(env: &Env, id: u64) -> Settlement {
        env.storage().persistent().get(&DataKey::Settlement(id)).expect("settlement not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextSettlementId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextSettlementId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
