#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    NextCertId,
    Cert(u64),
    Issuer(Address),
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum CertStatus {
    Active,
    Revoked,
    Expired,
}

#[contracttype]
#[derive(Clone)]
pub struct EnergyCertificate {
    pub id: u64,
    pub owner: Address,
    pub issuer: Address,
    pub energy_kwh: i128,
    pub source: String,       // "solar", "wind", "hydro", etc.
    pub location: String,
    pub issued_at: u64,
    pub expires_at: u64,      // 0 = no expiry
    pub status: CertStatus,
    pub metadata_uri: String,
}

#[contract]
pub struct CertificatesContract;

#[contractimpl]
impl CertificatesContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextCertId, &1u64);
    }

    pub fn authorize_issuer(env: Env, admin: Address, issuer: Address) {
        Self::require_admin(&env, &admin);
        env.storage().persistent().set(&DataKey::Issuer(issuer), &true);
    }

    pub fn revoke_issuer(env: Env, admin: Address, issuer: Address) {
        Self::require_admin(&env, &admin);
        env.storage().persistent().set(&DataKey::Issuer(issuer), &false);
    }

    pub fn issue(
        env: Env,
        issuer: Address,
        owner: Address,
        energy_kwh: i128,
        source: String,
        location: String,
        validity_seconds: u64,
        metadata_uri: String,
    ) -> u64 {
        issuer.require_auth();
        assert!(
            env.storage().persistent().get::<_, bool>(&DataKey::Issuer(issuer.clone())).unwrap_or(false),
            "not authorized issuer"
        );
        assert!(energy_kwh > 0, "energy must be positive");

        let now = env.ledger().timestamp();
        let id = Self::next_id(&env);
        let cert = EnergyCertificate {
            id,
            owner,
            issuer: issuer.clone(),
            energy_kwh,
            source,
            location,
            issued_at: now,
            expires_at: if validity_seconds > 0 { now + validity_seconds } else { 0 },
            status: CertStatus::Active,
            metadata_uri,
        };
        env.storage().persistent().set(&DataKey::Cert(id), &cert);
        env.events().publish((symbol_short!("cert_iss"), issuer), (id, energy_kwh));
        id
    }

    pub fn revoke(env: Env, issuer: Address, cert_id: u64) {
        issuer.require_auth();
        let mut cert: EnergyCertificate = Self::get_inner(&env, cert_id);
        assert!(cert.issuer == issuer, "not issuer");
        assert!(cert.status == CertStatus::Active, "not active");
        cert.status = CertStatus::Revoked;
        env.storage().persistent().set(&DataKey::Cert(cert_id), &cert);
        env.events().publish((symbol_short!("cert_rev"),), cert_id);
    }

    pub fn transfer(env: Env, owner: Address, cert_id: u64, new_owner: Address) {
        owner.require_auth();
        let mut cert: EnergyCertificate = Self::get_inner(&env, cert_id);
        assert!(cert.owner == owner, "not owner");
        assert!(cert.status == CertStatus::Active, "not active");
        cert.owner = new_owner;
        env.storage().persistent().set(&DataKey::Cert(cert_id), &cert);
    }

    pub fn get_certificate(env: Env, cert_id: u64) -> EnergyCertificate {
        Self::get_inner(&env, cert_id)
    }

    pub fn is_valid(env: Env, cert_id: u64) -> bool {
        let cert: EnergyCertificate = Self::get_inner(&env, cert_id);
        let now = env.ledger().timestamp();
        cert.status == CertStatus::Active && (cert.expires_at == 0 || now < cert.expires_at)
    }

    fn get_inner(env: &Env, id: u64) -> EnergyCertificate {
        env.storage().persistent().get(&DataKey::Cert(id)).expect("certificate not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextCertId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextCertId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
