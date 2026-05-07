#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    NextReportId,
    Report(u64),
    EntityLatestReport(Address),
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ReportType {
    Emissions,
    EnergyProduction,
    EnergyConsumption,
    CarbonOffset,
    Regulatory,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ReportStatus {
    Draft,
    Submitted,
    Verified,
    Rejected,
}

#[contracttype]
#[derive(Clone)]
pub struct RegulatoryReport {
    pub id: u64,
    pub entity: Address,
    pub reporter: Address,
    pub report_type: ReportType,
    pub period_start: u64,
    pub period_end: u64,
    pub value: i128,          // primary metric (e.g. kg CO2, kWh)
    pub unit: String,
    pub jurisdiction: String,
    pub status: ReportStatus,
    pub submitted_at: u64,
    pub verified_at: u64,
    pub metadata_uri: String,
}

#[contract]
pub struct ReportingContract;

#[contractimpl]
impl ReportingContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextReportId, &1u64);
    }

    pub fn submit_report(
        env: Env,
        reporter: Address,
        entity: Address,
        report_type: ReportType,
        period_start: u64,
        period_end: u64,
        value: i128,
        unit: String,
        jurisdiction: String,
        metadata_uri: String,
    ) -> u64 {
        reporter.require_auth();
        assert!(period_end > period_start, "invalid period");

        let now = env.ledger().timestamp();
        let id = Self::next_id(&env);
        let report = RegulatoryReport {
            id,
            entity: entity.clone(),
            reporter,
            report_type,
            period_start,
            period_end,
            value,
            unit,
            jurisdiction,
            status: ReportStatus::Submitted,
            submitted_at: now,
            verified_at: 0,
            metadata_uri,
        };
        env.storage().persistent().set(&DataKey::Report(id), &report);
        env.storage().persistent().set(&DataKey::EntityLatestReport(entity.clone()), &id);
        env.events().publish((symbol_short!("rep_sub"), entity), id);
        id
    }

    pub fn verify_report(env: Env, admin: Address, report_id: u64) {
        Self::require_admin(&env, &admin);
        let mut report: RegulatoryReport = Self::get_inner(&env, report_id);
        assert!(report.status == ReportStatus::Submitted, "not submitted");
        report.status = ReportStatus::Verified;
        report.verified_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Report(report_id), &report);
        env.events().publish((symbol_short!("rep_ver"),), report_id);
    }

    pub fn reject_report(env: Env, admin: Address, report_id: u64) {
        Self::require_admin(&env, &admin);
        let mut report: RegulatoryReport = Self::get_inner(&env, report_id);
        assert!(report.status == ReportStatus::Submitted, "not submitted");
        report.status = ReportStatus::Rejected;
        env.storage().persistent().set(&DataKey::Report(report_id), &report);
    }

    pub fn get_report(env: Env, report_id: u64) -> RegulatoryReport {
        Self::get_inner(&env, report_id)
    }

    pub fn get_latest_report_id(env: Env, entity: Address) -> u64 {
        env.storage().persistent()
            .get(&DataKey::EntityLatestReport(entity))
            .expect("no reports found")
    }

    fn get_inner(env: &Env, id: u64) -> RegulatoryReport {
        env.storage().persistent().get(&DataKey::Report(id)).expect("report not found")
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextReportId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextReportId, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(*caller == admin, "not admin");
    }
}
