#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

#[contracttype]
pub enum DataKey {
    Admin,
    NextPoolId,
    Pool(u64),
    LpBalance(Address, u64), // (provider, pool_id) -> lp_tokens
    FeeBps,
}

#[contracttype]
#[derive(Clone)]
pub struct LiquidityPool {
    pub id: u64,
    pub token_a: Address,
    pub token_b: Address,
    pub reserve_a: i128,
    pub reserve_b: i128,
    pub total_lp: i128,
    pub fee_bps: u32,
    pub is_active: bool,
}

#[contract]
pub struct LiquidityContract;

#[contractimpl]
impl LiquidityContract {
    pub fn initialize(env: Env, admin: Address, default_fee_bps: u32) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        assert!(default_fee_bps <= 1000, "fee too high");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextPoolId, &1u64);
        env.storage().instance().set(&DataKey::FeeBps, &default_fee_bps);
    }

    // ── Pool creation ────────────────────────────────────────────────────

    pub fn create_pool(env: Env, admin: Address, token_a: Address, token_b: Address, fee_bps: u32) -> u64 {
        Self::require_admin(&env, &admin);
        assert!(token_a != token_b, "identical tokens");
        assert!(fee_bps <= 1000, "fee too high");

        let id = Self::next_id(&env);
        let pool = LiquidityPool {
            id,
            token_a,
            token_b,
            reserve_a: 0,
            reserve_b: 0,
            total_lp: 0,
            fee_bps,
            is_active: true,
        };
        env.storage().persistent().set(&DataKey::Pool(id), &pool);
        env.events().publish((symbol_short!("pool_new"),), id);
        id
    }

    // ── Liquidity ────────────────────────────────────────────────────────

    /// Add liquidity. Returns LP tokens minted.
    pub fn add_liquidity(
        env: Env,
        provider: Address,
        pool_id: u64,
        amount_a: i128,
        amount_b: i128,
    ) -> i128 {
        provider.require_auth();
        assert!(amount_a > 0 && amount_b > 0, "amounts must be positive");

        let mut pool: LiquidityPool = Self::get_pool_inner(&env, pool_id);
        assert!(pool.is_active, "pool not active");

        let lp_minted = if pool.total_lp == 0 {
            // Initial liquidity: geometric mean
            Self::sqrt(amount_a * amount_b)
        } else {
            // Proportional to existing reserves
            let lp_a = amount_a * pool.total_lp / pool.reserve_a;
            let lp_b = amount_b * pool.total_lp / pool.reserve_b;
            lp_a.min(lp_b)
        };

        assert!(lp_minted > 0, "insufficient liquidity minted");

        pool.reserve_a += amount_a;
        pool.reserve_b += amount_b;
        pool.total_lp += lp_minted;
        env.storage().persistent().set(&DataKey::Pool(pool_id), &pool);

        let lp_key = DataKey::LpBalance(provider.clone(), pool_id);
        let current_lp: i128 = env.storage().persistent().get(&lp_key).unwrap_or(0);
        env.storage().persistent().set(&lp_key, &(current_lp + lp_minted));

        env.events().publish((symbol_short!("liq_add"), provider), (pool_id, amount_a, amount_b, lp_minted));
        lp_minted
    }

    /// Remove liquidity. Returns (amount_a, amount_b) withdrawn.
    pub fn remove_liquidity(env: Env, provider: Address, pool_id: u64, lp_amount: i128) -> (i128, i128) {
        provider.require_auth();
        assert!(lp_amount > 0, "lp amount must be positive");

        let lp_key = DataKey::LpBalance(provider.clone(), pool_id);
        let lp_balance: i128 = env.storage().persistent().get(&lp_key).unwrap_or(0);
        assert!(lp_balance >= lp_amount, "insufficient LP balance");

        let mut pool: LiquidityPool = Self::get_pool_inner(&env, pool_id);
        let amount_a = lp_amount * pool.reserve_a / pool.total_lp;
        let amount_b = lp_amount * pool.reserve_b / pool.total_lp;

        pool.reserve_a -= amount_a;
        pool.reserve_b -= amount_b;
        pool.total_lp -= lp_amount;
        env.storage().persistent().set(&DataKey::Pool(pool_id), &pool);
        env.storage().persistent().set(&lp_key, &(lp_balance - lp_amount));

        env.events().publish((symbol_short!("liq_rem"), provider), (pool_id, amount_a, amount_b));
        (amount_a, amount_b)
    }

    // ── Swap ─────────────────────────────────────────────────────────────

    /// Swap token_a for token_b (a_to_b=true) or vice versa. Returns amount out.
    pub fn swap(env: Env, trader: Address, pool_id: u64, amount_in: i128, a_to_b: bool) -> i128 {
        trader.require_auth();
        assert!(amount_in > 0, "amount must be positive");

        let mut pool: LiquidityPool = Self::get_pool_inner(&env, pool_id);
        assert!(pool.is_active, "pool not active");

        // x * y = k  (constant product AMM)
        let fee = amount_in * pool.fee_bps as i128 / 10_000;
        let amount_in_after_fee = amount_in - fee;

        let amount_out = if a_to_b {
            // dy = y * dx / (x + dx)
            pool.reserve_b * amount_in_after_fee / (pool.reserve_a + amount_in_after_fee)
        } else {
            pool.reserve_a * amount_in_after_fee / (pool.reserve_b + amount_in_after_fee)
        };

        assert!(amount_out > 0, "insufficient output");

        if a_to_b {
            pool.reserve_a += amount_in;
            pool.reserve_b -= amount_out;
        } else {
            pool.reserve_b += amount_in;
            pool.reserve_a -= amount_out;
        }
        env.storage().persistent().set(&DataKey::Pool(pool_id), &pool);

        env.events().publish((symbol_short!("swap"), trader), (pool_id, amount_in, amount_out, a_to_b));
        amount_out
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_pool(env: Env, pool_id: u64) -> LiquidityPool {
        Self::get_pool_inner(&env, pool_id)
    }

    pub fn get_lp_balance(env: Env, provider: Address, pool_id: u64) -> i128 {
        env.storage().persistent().get(&DataKey::LpBalance(provider, pool_id)).unwrap_or(0)
    }

    /// Quote: how much token_b for amount_a in (no fee applied, for display).
    pub fn quote(env: Env, pool_id: u64, amount_a: i128) -> i128 {
        let pool: LiquidityPool = Self::get_pool_inner(&env, pool_id);
        if pool.reserve_a == 0 { return 0; }
        amount_a * pool.reserve_b / pool.reserve_a
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn get_pool_inner(env: &Env, id: u64) -> LiquidityPool {
        env.storage().persistent().get(&DataKey::Pool(id)).expect("pool not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextPoolId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextPoolId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }

    /// Integer square root (Babylonian method).
    fn sqrt(n: i128) -> i128 {
        if n <= 0 { return 0; }
        let mut x = n;
        let mut y = (x + 1) / 2;
        while y < x {
            x = y;
            y = (x + n / x) / 2;
        }
        x
    }
}
