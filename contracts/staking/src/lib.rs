#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, vec, Address, Env, Vec};

#[contracttype]
pub enum DataKey {
    Admin,
    Paused,
    NextPoolId,
    NextPositionId,
    Pool(u64),
    Position(u64),
    StakerPositions(Address),   // -> Vec<u64>
    PoolPositions(u64),         // -> Vec<u64>
    Delegate(Address),          // delegator -> delegatee
    TotalStaked,
}

#[contracttype]
#[derive(Clone)]
pub struct Pool {
    pub id: u64,
    pub name: soroban_sdk::String,
    pub reward_rate_bps: u32, // annual reward in basis points
    pub min_stake: i128,
    pub max_lockup: u64,      // seconds
    pub total_staked: i128,
    pub is_active: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Position {
    pub id: u64,
    pub pool_id: u64,
    pub staker: Address,
    pub amount: i128,
    pub staked_at: u64,
    pub lockup_until: u64,    // 0 = no lockup
    pub last_claim_at: u64,
    pub rewards_claimed: i128,
}

#[contract]
pub struct StakingContract;

#[contractimpl]
impl StakingContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextPoolId, &1u64);
        env.storage().instance().set(&DataKey::NextPositionId, &1u64);
        env.storage().instance().set(&DataKey::TotalStaked, &0i128);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    // ── Pool management ──────────────────────────────────────────────────

    pub fn create_pool(
        env: Env,
        admin: Address,
        name: soroban_sdk::String,
        reward_rate_bps: u32,
        min_stake: i128,
        max_lockup: u64,
    ) -> u64 {
        Self::require_admin(&env, &admin);
        let id = Self::next_id(&env, DataKey::NextPoolId);
        let pool = Pool {
            id,
            name,
            reward_rate_bps,
            min_stake,
            max_lockup,
            total_staked: 0,
            is_active: true,
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Pool(id), &pool);
        id
    }

    pub fn set_pool_active(env: Env, admin: Address, pool_id: u64, active: bool) {
        Self::require_admin(&env, &admin);
        let mut pool: Pool = env.storage().persistent().get(&DataKey::Pool(pool_id)).expect("pool not found");
        pool.is_active = active;
        env.storage().persistent().set(&DataKey::Pool(pool_id), &pool);
    }

    // ── Staking ──────────────────────────────────────────────────────────

    pub fn stake(env: Env, staker: Address, pool_id: u64, amount: i128, lockup_seconds: u64) -> u64 {
        staker.require_auth();
        Self::assert_not_paused(&env);
        assert!(amount > 0, "amount must be positive");

        let mut pool: Pool = env.storage().persistent().get(&DataKey::Pool(pool_id)).expect("pool not found");
        assert!(pool.is_active, "pool not active");
        assert!(amount >= pool.min_stake, "below minimum stake");

        let now = env.ledger().timestamp();
        let pos_id = Self::next_id(&env, DataKey::NextPositionId);
        let position = Position {
            id: pos_id,
            pool_id,
            staker: staker.clone(),
            amount,
            staked_at: now,
            lockup_until: if lockup_seconds > 0 { now + lockup_seconds } else { 0 },
            last_claim_at: now,
            rewards_claimed: 0,
        };

        env.storage().persistent().set(&DataKey::Position(pos_id), &position);

        // Update staker index
        let mut sp: Vec<u64> = env.storage().persistent()
            .get(&DataKey::StakerPositions(staker.clone()))
            .unwrap_or_else(|| vec![&env]);
        sp.push_back(pos_id);
        env.storage().persistent().set(&DataKey::StakerPositions(staker.clone()), &sp);

        // Update pool index
        let mut pp: Vec<u64> = env.storage().persistent()
            .get(&DataKey::PoolPositions(pool_id))
            .unwrap_or_else(|| vec![&env]);
        pp.push_back(pos_id);
        env.storage().persistent().set(&DataKey::PoolPositions(pool_id), &pp);

        pool.total_staked += amount;
        env.storage().persistent().set(&DataKey::Pool(pool_id), &pool);

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalStaked, &(total + amount));

        env.events().publish((symbol_short!("staked"), staker), (pos_id, pool_id, amount));
        pos_id
    }

    pub fn unstake(env: Env, staker: Address, position_id: u64) -> i128 {
        staker.require_auth();
        Self::assert_not_paused(&env);

        let mut position: Position = env.storage().persistent()
            .get(&DataKey::Position(position_id))
            .expect("position not found");
        assert!(position.staker == staker, "not position owner");

        let now = env.ledger().timestamp();
        let penalty = if position.lockup_until > 0 && now < position.lockup_until {
            // 10% early exit penalty
            position.amount / 10
        } else {
            0
        };

        let pending = Self::calc_pending_rewards(&env, &position);
        let received = position.amount - penalty + pending;

        let mut pool: Pool = env.storage().persistent()
            .get(&DataKey::Pool(position.pool_id))
            .expect("pool not found");
        pool.total_staked -= position.amount;
        env.storage().persistent().set(&DataKey::Pool(position.pool_id), &pool);

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalStaked, &(total - position.amount));

        // Mark position as zero
        position.amount = 0;
        env.storage().persistent().set(&DataKey::Position(position_id), &position);

        env.events().publish((symbol_short!("unstaked"), staker), (position_id, received, penalty));
        received
    }

    pub fn claim_rewards(env: Env, staker: Address, position_id: u64) -> i128 {
        staker.require_auth();
        let mut position: Position = env.storage().persistent()
            .get(&DataKey::Position(position_id))
            .expect("position not found");
        assert!(position.staker == staker, "not position owner");

        let pending = Self::calc_pending_rewards(&env, &position);
        assert!(pending > 0, "no rewards to claim");

        position.last_claim_at = env.ledger().timestamp();
        position.rewards_claimed += pending;
        env.storage().persistent().set(&DataKey::Position(position_id), &position);

        env.events().publish((symbol_short!("claimed"), staker), (position_id, pending));
        pending
    }

    // ── Governance delegation ────────────────────────────────────────────

    pub fn delegate(env: Env, delegator: Address, delegatee: Address) {
        delegator.require_auth();
        env.storage().persistent().set(&DataKey::Delegate(delegator.clone()), &delegatee);
        env.events().publish((symbol_short!("delegate"), delegator), delegatee);
    }

    pub fn get_voting_weight(env: Env, staker: Address) -> i128 {
        let positions: Vec<u64> = env.storage().persistent()
            .get(&DataKey::StakerPositions(staker.clone()))
            .unwrap_or_else(|| vec![&env]);
        let mut weight: i128 = 0;
        for pid in positions.iter() {
            if let Some(p) = env.storage().persistent().get::<_, Position>(&DataKey::Position(pid)) {
                if p.amount > 0 {
                    // Bonus multiplier for locked positions (up to 2x)
                    let now = env.ledger().timestamp();
                    let multiplier = if p.lockup_until > now {
                        let remaining = (p.lockup_until - now) as i128;
                        100 + (remaining / 86400).min(100) // +1% per day remaining, max 2x
                    } else {
                        100
                    };
                    weight += p.amount * multiplier / 100;
                }
            }
        }
        weight
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_pool(env: Env, pool_id: u64) -> Pool {
        env.storage().persistent().get(&DataKey::Pool(pool_id)).expect("pool not found")
    }

    pub fn get_position(env: Env, position_id: u64) -> Position {
        env.storage().persistent().get(&DataKey::Position(position_id)).expect("position not found")
    }

    pub fn get_pending_rewards(env: Env, position_id: u64) -> i128 {
        let position: Position = env.storage().persistent()
            .get(&DataKey::Position(position_id))
            .expect("position not found");
        Self::calc_pending_rewards(&env, &position)
    }

    pub fn get_staker_positions(env: Env, staker: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::StakerPositions(staker))
            .unwrap_or_else(|| vec![&env])
    }

    pub fn get_total_staked(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0)
    }

    pub fn get_delegate(env: Env, delegator: Address) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Delegate(delegator))
    }

    // ── Admin ────────────────────────────────────────────────────────────

    pub fn set_paused(env: Env, admin: Address, paused: bool) {
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::Paused, &paused);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn calc_pending_rewards(env: &Env, position: &Position) -> i128 {
        if position.amount == 0 { return 0; }
        let pool: Pool = env.storage().persistent()
            .get(&DataKey::Pool(position.pool_id))
            .expect("pool not found");
        let now = env.ledger().timestamp();
        let elapsed = (now - position.last_claim_at) as i128;
        // reward = amount * rate_bps / 10000 * elapsed / seconds_per_year
        position.amount * pool.reward_rate_bps as i128 * elapsed / 10_000 / 31_536_000
    }

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

    fn assert_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        assert!(!paused, "contract paused");
    }
}
