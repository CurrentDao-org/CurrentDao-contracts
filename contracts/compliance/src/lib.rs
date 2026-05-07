#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    NextRecordId,
    Record(u64),
    EntityStatus(Address),
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ComplianceStatus {
    Compliant,
    NonCompliant,
    UnderReview,
    Exempt,
}

#[contracttype]
#[derive(Clone)]
pub struct ComplianceRecord {
    pub id: u64,
    pub entity: Address,
    pub jurisdiction: String,
    pub standard: String,
    pub status: ComplianceStatus,
    pub auditor: Address,
    pub issued_at: u64,
    pub expires_at: u64,
    pub notes: String,
}

#[contract]
pub struct ComplianceContract;

#[contractimpl]
impl ComplianceContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextRecordId, &1u64);
    }

    pub fn record_compliance(
        env: Env,
        auditor: Address,
        entity: Address,
        jurisdiction: String,
        standard: String,
        status: ComplianceStatus,
        validity_seconds: u64,
        notes: String,
    ) -> u64 {
        auditor.require_auth();
        // Only admin or authorized auditors can record
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(auditor == admin, "not authorized auditor");

        let now = env.ledger().timestamp();
        let id = Self::next_id(&env);
        let record = ComplianceRecord {
            id,
            entity: entity.clone(),
            jurisdiction,
            standard,
            status: status.clone(),
            auditor,
            issued_at: now,
            expires_at: if validity_seconds > 0 { now + validity_seconds } else { 0 },
            notes,
        };
        env.storage().persistent().set(&DataKey::Record(id), &record);
        env.storage().persistent().set(&DataKey::EntityStatus(entity.clone()), &id);
        env.events().publish((symbol_short!("comp_rec"), entity), (id, status == ComplianceStatus::Compliant));
        id
    }

    pub fn update_status(env: Env, admin: Address, record_id: u64, status: ComplianceStatus) {
        Self::require_admin(&env, &admin);
        let mut record: ComplianceRecord = Self::get_inner(&env, record_id);
        record.status = status;
        env.storage().persistent().set(&DataKey::Record(record_id), &record);
    }

    pub fn get_record(env: Env, record_id: u64) -> ComplianceRecord {
        Self::get_inner(&env, record_id)
    }

    pub fn get_latest_record_id(env: Env, entity: Address) -> u64 {
        env.storage().persistent()
            .get(&DataKey::EntityStatus(entity))
            .expect("no compliance record")
    }

    pub fn is_compliant(env: Env, entity: Address) -> bool {
        if let Some(record_id) = env.storage().persistent().get::<_, u64>(&DataKey::EntityStatus(entity)) {
            if let Some(record) = env.storage().persistent().get::<_, ComplianceRecord>(&DataKey::Record(record_id)) {
                let now = env.ledger().timestamp();
                return record.status == ComplianceStatus::Compliant
                    && (record.expires_at == 0 || now < record.expires_at);
            }
        }
        false
    }

    fn get_inner(env: &Env, id: u64) -> ComplianceRecord {
        env.storage().persistent().get(&DataKey::Record(id)).expect("record not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextRecordId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextRecordId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
