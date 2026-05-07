#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec, vec};

#[contracttype]
pub enum DataKey {
    Admin,
    NextEscrowId,
    Escrow(u64),
    Dispute(u64),
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum EscrowStatus {
    Active,
    Delivered,
    Settled,
    Refunded,
    Disputed,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum DisputeOutcome {
    Pending,
    BuyerWins,
    SellerWins,
    Split,
}

#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub id: u64,
    pub buyer: Address,
    pub seller: Address,
    pub amount: i128,
    pub energy_amount: i128, // in Wh
    pub created_at: u64,
    pub expires_at: u64,
    pub status: EscrowStatus,
    pub delivery_proof: String,
    pub iot_sensor_id: String,
}

#[contracttype]
#[derive(Clone)]
pub struct Dispute {
    pub escrow_id: u64,
    pub initiator: Address,
    pub reason: String,
    pub created_at: u64,
    pub outcome: DisputeOutcome,
    pub resolved_at: u64,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextEscrowId, &1u64);
    }

    pub fn create_escrow(
        env: Env,
        buyer: Address,
        seller: Address,
        amount: i128,
        energy_amount: i128,
        lockup_seconds: u64,
        iot_sensor_id: String,
    ) -> u64 {
        buyer.require_auth();
        assert!(amount > 0 && energy_amount > 0, "invalid amounts");
        assert!(lockup_seconds > 0, "lockup must be positive");

        let id = Self::next_id(&env);
        let now = env.ledger().timestamp();
        let escrow = Escrow {
            id,
            buyer,
            seller,
            amount,
            energy_amount,
            created_at: now,
            expires_at: now + lockup_seconds,
            status: EscrowStatus::Active,
            delivery_proof: String::from_str(&env, ""),
            iot_sensor_id,
        };
        env.storage().persistent().set(&DataKey::Escrow(id), &escrow);
        env.events().publish((symbol_short!("created"),), (id, amount));
        id
    }

    pub fn confirm_delivery(env: Env, seller: Address, escrow_id: u64, delivery_proof: String) {
        seller.require_auth();
        let mut escrow: Escrow = Self::get_escrow_inner(&env, escrow_id);
        assert!(escrow.seller == seller, "not seller");
        assert!(escrow.status == EscrowStatus::Active, "not active");
        assert!(env.ledger().timestamp() < escrow.expires_at, "expired");

        escrow.delivery_proof = delivery_proof;
        escrow.status = EscrowStatus::Delivered;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((symbol_short!("deliverd"),), escrow_id);
    }

    pub fn settle(env: Env, buyer: Address, escrow_id: u64) {
        buyer.require_auth();
        let mut escrow: Escrow = Self::get_escrow_inner(&env, escrow_id);
        assert!(escrow.buyer == buyer, "not buyer");
        assert!(
            escrow.status == EscrowStatus::Delivered || escrow.status == EscrowStatus::Active,
            "cannot settle"
        );

        escrow.status = EscrowStatus::Settled;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        // Note: actual token transfer handled by calling contract / client
        env.events().publish((symbol_short!("settled"),), (escrow_id, escrow.amount));
    }

    pub fn refund(env: Env, caller: Address, escrow_id: u64) {
        caller.require_auth();
        let mut escrow: Escrow = Self::get_escrow_inner(&env, escrow_id);
        let now = env.ledger().timestamp();

        // Buyer can refund if expired and not delivered; admin can always refund
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        let is_admin = caller == admin;
        let is_buyer_expired = caller == escrow.buyer && now >= escrow.expires_at && escrow.status == EscrowStatus::Active;
        assert!(is_admin || is_buyer_expired, "cannot refund");

        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((symbol_short!("refunded"),), escrow_id);
    }

    pub fn initiate_dispute(env: Env, initiator: Address, escrow_id: u64, reason: String) {
        initiator.require_auth();
        let mut escrow: Escrow = Self::get_escrow_inner(&env, escrow_id);
        assert!(
            escrow.buyer == initiator || escrow.seller == initiator,
            "not a party"
        );
        assert!(escrow.status == EscrowStatus::Active || escrow.status == EscrowStatus::Delivered, "cannot dispute");

        escrow.status = EscrowStatus::Disputed;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);

        let dispute = Dispute {
            escrow_id,
            initiator,
            reason,
            created_at: env.ledger().timestamp(),
            outcome: DisputeOutcome::Pending,
            resolved_at: 0,
        };
        env.storage().persistent().set(&DataKey::Dispute(escrow_id), &dispute);
        env.events().publish((symbol_short!("disputed"),), escrow_id);
    }

    pub fn resolve_dispute(env: Env, admin: Address, escrow_id: u64, outcome: DisputeOutcome) {
        Self::require_admin(&env, &admin);
        assert!(env.storage().persistent().has(&DataKey::Dispute(escrow_id)), "no dispute");

        let mut dispute: Dispute = env.storage().persistent()
            .get(&DataKey::Dispute(escrow_id))
            .expect("dispute not found");
        assert!(dispute.outcome == DisputeOutcome::Pending, "already resolved");

        dispute.outcome = outcome.clone();
        dispute.resolved_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Dispute(escrow_id), &dispute);

        let mut escrow: Escrow = Self::get_escrow_inner(&env, escrow_id);
        escrow.status = match outcome {
            DisputeOutcome::BuyerWins => EscrowStatus::Refunded,
            DisputeOutcome::SellerWins => EscrowStatus::Settled,
            DisputeOutcome::Split => EscrowStatus::Settled,
            DisputeOutcome::Pending => panic!("invalid outcome"),
        };
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((symbol_short!("resolved"),), escrow_id);
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        Self::get_escrow_inner(&env, escrow_id)
    }

    pub fn get_dispute(env: Env, escrow_id: u64) -> Dispute {
        env.storage().persistent().get(&DataKey::Dispute(escrow_id)).expect("no dispute")
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn get_escrow_inner(env: &Env, id: u64) -> Escrow {
        env.storage().persistent().get(&DataKey::Escrow(id)).expect("escrow not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextEscrowId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextEscrowId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
