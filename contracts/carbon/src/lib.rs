#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec,
    Address, Env, String, Vec,
};

// ── Storage keys ────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    NextCreditId,
    NextOrderId,
    NextTradeId,
    NextCertId,
    TradingFeeBps,
    TotalSupply,
    RetiredSupply,
    Credit(u64),
    Order(u64),
    Trade(u64),
    Certificate(u64),
    VerifyReport(u64),
    ImpactMetrics(u64),
    AccountBalance(Address, u64), // (owner, credit_id) -> amount
    Verifier(Address),
    SupportedStandard(String),
    CreditOrders(u64),            // credit_id -> Vec<order_id>
    TotalVolume,
    TotalTrades,
    ActiveOrders,
}

// ── Data types ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct CarbonCredit {
    pub id: u64,
    pub project_id: String,
    pub amount: i128,
    pub vintage: u64,
    pub standard: String,
    pub methodology: String,
    pub issuer: Address,
    pub current_owner: Address,
    pub issued_at: u64,
    pub is_retired: bool,
    pub is_verified: bool,
    pub metadata_uri: String,
}

#[contracttype]
#[derive(Clone)]
pub struct Order {
    pub id: u64,
    pub trader: Address,
    pub credit_id: u64,
    pub amount: i128,
    pub price: i128,
    pub is_buy_order: bool,
    pub is_active: bool,
    pub timestamp: u64,
    pub expires_at: u64, // 0 = no expiry
    pub filled_amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Trade {
    pub id: u64,
    pub credit_id: u64,
    pub amount: i128,
    pub price: i128,
    pub buyer: Address,
    pub seller: Address,
    pub timestamp: u64,
    pub fee: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct VerificationReport {
    pub credit_id: u64,
    pub verifier: Address,
    pub timestamp: u64,
    pub is_valid: bool,
    pub report_uri: String,
    pub confidence: u32, // 0-100
}

#[contracttype]
#[derive(Clone)]
pub struct ImpactMetrics {
    pub total_offset: i128,
    pub co2_equivalent: i128,
    pub renewable_energy_kwh: i128,
    pub trees_preserved: i128,
    pub water_saved_liters: i128,
    pub biodiversity_index: u32, // 0-100
    pub last_updated: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct RetirementCertificate {
    pub id: u64,
    pub credit_id: u64,
    pub retiree: Address,
    pub amount: i128,
    pub reason: String,
    pub timestamp: u64,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct CarbonCreditTrading;

#[contractimpl]
impl CarbonCreditTrading {
    // ── Init ─────────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextCreditId, &1u64);
        env.storage().instance().set(&DataKey::NextOrderId, &1u64);
        env.storage().instance().set(&DataKey::NextTradeId, &1u64);
        env.storage().instance().set(&DataKey::NextCertId, &1u64);
        env.storage().instance().set(&DataKey::TradingFeeBps, &50u32); // 0.5%
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
        env.storage().instance().set(&DataKey::RetiredSupply, &0i128);
        env.storage().instance().set(&DataKey::TotalVolume, &0i128);
        env.storage().instance().set(&DataKey::TotalTrades, &0u64);
        env.storage().instance().set(&DataKey::ActiveOrders, &0u64);

        // Supported standards
        for std in [
            String::from_str(&env, "VCS"),
            String::from_str(&env, "Gold Standard"),
            String::from_str(&env, "CDM"),
            String::from_str(&env, "Carbon Registry"),
        ] {
            env.storage()
                .instance()
                .set(&DataKey::SupportedStandard(std), &true);
        }
    }

    // ── Credit management ────────────────────────────────────────────────

    pub fn issue_credit(
        env: Env,
        issuer: Address,
        project_id: String,
        amount: i128,
        vintage: u64,
        standard: String,
        methodology: String,
        metadata_uri: String,
    ) -> u64 {
        issuer.require_auth();
        assert!(amount > 0, "amount must be positive");
        assert!(vintage > 0, "invalid vintage");
        assert!(
            env.storage()
                .instance()
                .get::<_, bool>(&DataKey::SupportedStandard(standard.clone()))
                .unwrap_or(false),
            "standard not supported"
        );

        let id = Self::next_id(&env, DataKey::NextCreditId);
        let now = env.ledger().timestamp();

        let credit = CarbonCredit {
            id,
            project_id,
            amount,
            vintage,
            standard,
            methodology,
            issuer: issuer.clone(),
            current_owner: issuer.clone(),
            issued_at: now,
            is_retired: false,
            is_verified: false,
            metadata_uri,
        };

        env.storage().persistent().set(&DataKey::Credit(id), &credit);
        env.storage()
            .persistent()
            .set(&DataKey::AccountBalance(issuer.clone(), id), &amount);

        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));

        env.events().publish(
            (symbol_short!("issued"), issuer),
            (id, amount),
        );
        id
    }

    pub fn verify_credit(
        env: Env,
        verifier: Address,
        credit_id: u64,
        is_valid: bool,
        report_uri: String,
        confidence: u32,
    ) {
        verifier.require_auth();
        assert!(confidence <= 100, "confidence must be 0-100");
        assert!(
            env.storage()
                .instance()
                .get::<_, bool>(&DataKey::Verifier(verifier.clone()))
                .unwrap_or(false),
            "not an authorized verifier"
        );

        let mut credit: CarbonCredit = env
            .storage()
            .persistent()
            .get(&DataKey::Credit(credit_id))
            .expect("credit not found");

        credit.is_verified = is_valid;
        env.storage()
            .persistent()
            .set(&DataKey::Credit(credit_id), &credit);

        let report = VerificationReport {
            credit_id,
            verifier: verifier.clone(),
            timestamp: env.ledger().timestamp(),
            is_valid,
            report_uri,
            confidence,
        };
        env.storage()
            .persistent()
            .set(&DataKey::VerifyReport(credit_id), &report);

        env.events().publish(
            (symbol_short!("verified"), verifier),
            (credit_id, is_valid),
        );
    }

    pub fn retire_credit(
        env: Env,
        retiree: Address,
        credit_id: u64,
        amount: i128,
        reason: String,
    ) -> u64 {
        retiree.require_auth();
        assert!(amount > 0, "amount must be positive");

        let mut credit: CarbonCredit = env
            .storage()
            .persistent()
            .get(&DataKey::Credit(credit_id))
            .expect("credit not found");
        assert!(credit.is_verified, "credit not verified");

        let bal_key = DataKey::AccountBalance(retiree.clone(), credit_id);
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&bal_key)
            .unwrap_or(0);
        assert!(balance >= amount, "insufficient balance");

        env.storage()
            .persistent()
            .set(&bal_key, &(balance - amount));

        credit.amount -= amount;
        if credit.amount == 0 {
            credit.is_retired = true;
        }
        env.storage()
            .persistent()
            .set(&DataKey::Credit(credit_id), &credit);

        let retired: i128 = env
            .storage()
            .instance()
            .get(&DataKey::RetiredSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::RetiredSupply, &(retired + amount));

        let cert_id = Self::next_id(&env, DataKey::NextCertId);
        let cert = RetirementCertificate {
            id: cert_id,
            credit_id,
            retiree: retiree.clone(),
            amount,
            reason,
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Certificate(cert_id), &cert);

        env.events().publish(
            (symbol_short!("retired"), retiree),
            (credit_id, amount),
        );
        cert_id
    }

    // ── Trading ──────────────────────────────────────────────────────────

    pub fn place_buy_order(
        env: Env,
        trader: Address,
        credit_id: u64,
        amount: i128,
        price: i128,
        expires_at: u64,
    ) -> u64 {
        trader.require_auth();
        Self::assert_credit_verified(&env, credit_id);
        assert!(amount > 0 && price > 0, "amount and price must be positive");

        let id = Self::next_id(&env, DataKey::NextOrderId);
        let order = Order {
            id,
            trader: trader.clone(),
            credit_id,
            amount,
            price,
            is_buy_order: true,
            is_active: true,
            timestamp: env.ledger().timestamp(),
            expires_at,
            filled_amount: 0,
        };
        env.storage().persistent().set(&DataKey::Order(id), &order);
        Self::push_credit_order(&env, credit_id, id);
        Self::inc_active_orders(&env);

        env.events().publish(
            (symbol_short!("buy_ord"), trader),
            (id, credit_id, amount, price),
        );
        id
    }

    pub fn place_sell_order(
        env: Env,
        trader: Address,
        credit_id: u64,
        amount: i128,
        price: i128,
        expires_at: u64,
    ) -> u64 {
        trader.require_auth();
        Self::assert_credit_verified(&env, credit_id);
        assert!(amount > 0 && price > 0, "amount and price must be positive");

        let bal: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::AccountBalance(trader.clone(), credit_id))
            .unwrap_or(0);
        assert!(bal >= amount, "insufficient balance");

        let id = Self::next_id(&env, DataKey::NextOrderId);
        let order = Order {
            id,
            trader: trader.clone(),
            credit_id,
            amount,
            price,
            is_buy_order: false,
            is_active: true,
            timestamp: env.ledger().timestamp(),
            expires_at,
            filled_amount: 0,
        };
        env.storage().persistent().set(&DataKey::Order(id), &order);
        Self::push_credit_order(&env, credit_id, id);
        Self::inc_active_orders(&env);

        env.events().publish(
            (symbol_short!("sell_ord"), trader),
            (id, credit_id, amount, price),
        );
        id
    }

    /// Fill `fill_amount` of an existing order. The caller is the counterparty.
    pub fn fill_order(env: Env, filler: Address, order_id: u64, fill_amount: i128) -> u64 {
        filler.require_auth();

        let mut order: Order = env
            .storage()
            .persistent()
            .get(&DataKey::Order(order_id))
            .expect("order not found");

        assert!(order.is_active, "order not active");
        assert!(fill_amount > 0, "fill amount must be positive");
        let remaining = order.amount - order.filled_amount;
        assert!(fill_amount <= remaining, "fill exceeds remaining");

        let now = env.ledger().timestamp();
        if order.expires_at != 0 {
            assert!(now < order.expires_at, "order expired");
        }

        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TradingFeeBps)
            .unwrap_or(50);
        let fee = (fill_amount * order.price * fee_bps as i128) / 10_000;

        let (buyer, seller) = if order.is_buy_order {
            // order.trader is the buyer; filler is the seller
            let sel_bal: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::AccountBalance(filler.clone(), order.credit_id))
                .unwrap_or(0);
            assert!(sel_bal >= fill_amount, "seller insufficient balance");
            (order.trader.clone(), filler.clone())
        } else {
            // order.trader is the seller; filler is the buyer
            (filler.clone(), order.trader.clone())
        };

        // Transfer credits: seller → buyer
        let sel_key = DataKey::AccountBalance(seller.clone(), order.credit_id);
        let buy_key = DataKey::AccountBalance(buyer.clone(), order.credit_id);
        let sel_bal: i128 = env.storage().persistent().get(&sel_key).unwrap_or(0);
        assert!(sel_bal >= fill_amount, "seller insufficient balance");
        env.storage()
            .persistent()
            .set(&sel_key, &(sel_bal - fill_amount));
        let buy_bal: i128 = env.storage().persistent().get(&buy_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&buy_key, &(buy_bal + fill_amount));

        // Update order
        order.filled_amount += fill_amount;
        if order.filled_amount == order.amount {
            order.is_active = false;
            let active: u64 = env
                .storage()
                .instance()
                .get(&DataKey::ActiveOrders)
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&DataKey::ActiveOrders, &active.saturating_sub(1));
        }
        env.storage()
            .persistent()
            .set(&DataKey::Order(order_id), &order);

        // Record trade
        let trade_id = Self::next_id(&env, DataKey::NextTradeId);
        let trade = Trade {
            id: trade_id,
            credit_id: order.credit_id,
            amount: fill_amount,
            price: order.price,
            buyer: buyer.clone(),
            seller: seller.clone(),
            timestamp: now,
            fee,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Trade(trade_id), &trade);

        // Update stats
        let vol: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalVolume)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalVolume, &(vol + fill_amount * order.price));
        let trades: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalTrades)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalTrades, &(trades + 1));

        env.events().publish(
            (symbol_short!("trade"), buyer),
            (trade_id, order_id, fill_amount, order.price),
        );
        trade_id
    }

    pub fn cancel_order(env: Env, trader: Address, order_id: u64) {
        trader.require_auth();
        let mut order: Order = env
            .storage()
            .persistent()
            .get(&DataKey::Order(order_id))
            .expect("order not found");
        assert!(order.trader == trader, "not order owner");
        assert!(order.is_active, "order not active");
        order.is_active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Order(order_id), &order);
        let active: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActiveOrders)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ActiveOrders, &active.saturating_sub(1));
    }

    /// Batch-fill multiple orders in one call.
    pub fn batch_fill_orders(
        env: Env,
        filler: Address,
        order_ids: Vec<u64>,
        amounts: Vec<i128>,
    ) -> Vec<u64> {
        filler.require_auth();
        assert!(order_ids.len() == amounts.len(), "length mismatch");
        let mut trade_ids: Vec<u64> = vec![&env];
        for i in 0..order_ids.len() {
            let tid = Self::fill_order(
                env.clone(),
                filler.clone(),
                order_ids.get(i).unwrap(),
                amounts.get(i).unwrap(),
            );
            trade_ids.push_back(tid);
        }
        trade_ids
    }

    // ── Impact metrics ───────────────────────────────────────────────────

    pub fn update_impact_metrics(
        env: Env,
        caller: Address,
        credit_id: u64,
        co2_equivalent: i128,
        renewable_energy_kwh: i128,
        trees_preserved: i128,
        water_saved_liters: i128,
        biodiversity_index: u32,
    ) {
        caller.require_auth();
        let credit: CarbonCredit = env
            .storage()
            .persistent()
            .get(&DataKey::Credit(credit_id))
            .expect("credit not found");
        let is_verifier = env
            .storage()
            .instance()
            .get::<_, bool>(&DataKey::Verifier(caller.clone()))
            .unwrap_or(false);
        assert!(
            credit.issuer == caller || is_verifier,
            "not authorized"
        );

        let metrics = ImpactMetrics {
            total_offset: credit.amount,
            co2_equivalent,
            renewable_energy_kwh,
            trees_preserved,
            water_saved_liters,
            biodiversity_index,
            last_updated: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::ImpactMetrics(credit_id), &metrics);
    }

    // ── Admin ────────────────────────────────────────────────────────────

    pub fn add_verifier(env: Env, admin: Address, verifier: Address) {
        Self::require_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Verifier(verifier), &true);
    }

    pub fn remove_verifier(env: Env, admin: Address, verifier: Address) {
        Self::require_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Verifier(verifier), &false);
    }

    pub fn add_standard(env: Env, admin: Address, standard: String) {
        Self::require_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::SupportedStandard(standard), &true);
    }

    pub fn remove_standard(env: Env, admin: Address, standard: String) {
        Self::require_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::SupportedStandard(standard), &false);
    }

    pub fn set_trading_fee(env: Env, admin: Address, fee_bps: u32) {
        Self::require_admin(&env, &admin);
        assert!(fee_bps <= 1000, "fee too high"); // max 10%
        env.storage()
            .instance()
            .set(&DataKey::TradingFeeBps, &fee_bps);
    }

    // ── Views ────────────────────────────────────────────────────────────

    pub fn get_credit(env: Env, credit_id: u64) -> CarbonCredit {
        env.storage()
            .persistent()
            .get(&DataKey::Credit(credit_id))
            .expect("credit not found")
    }

    pub fn get_order(env: Env, order_id: u64) -> Order {
        env.storage()
            .persistent()
            .get(&DataKey::Order(order_id))
            .expect("order not found")
    }

    pub fn get_trade(env: Env, trade_id: u64) -> Trade {
        env.storage()
            .persistent()
            .get(&DataKey::Trade(trade_id))
            .expect("trade not found")
    }

    pub fn get_verification_report(env: Env, credit_id: u64) -> VerificationReport {
        env.storage()
            .persistent()
            .get(&DataKey::VerifyReport(credit_id))
            .expect("report not found")
    }

    pub fn get_impact_metrics(env: Env, credit_id: u64) -> ImpactMetrics {
        env.storage()
            .persistent()
            .get(&DataKey::ImpactMetrics(credit_id))
            .expect("metrics not found")
    }

    pub fn get_certificate(env: Env, cert_id: u64) -> RetirementCertificate {
        env.storage()
            .persistent()
            .get(&DataKey::Certificate(cert_id))
            .expect("certificate not found")
    }

    pub fn get_balance(env: Env, account: Address, credit_id: u64) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::AccountBalance(account, credit_id))
            .unwrap_or(0)
    }

    pub fn get_total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    pub fn get_retired_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::RetiredSupply)
            .unwrap_or(0)
    }

    pub fn get_circulating_supply(env: Env) -> i128 {
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        let retired: i128 = env
            .storage()
            .instance()
            .get(&DataKey::RetiredSupply)
            .unwrap_or(0);
        total - retired
    }

    pub fn get_active_orders_for_credit(env: Env, credit_id: u64) -> Vec<u64> {
        let order_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::CreditOrders(credit_id))
            .unwrap_or_else(|| vec![&env]);
        let mut active: Vec<u64> = vec![&env];
        for oid in order_ids.iter() {
            if let Some(o) = env
                .storage()
                .persistent()
                .get::<_, Order>(&DataKey::Order(oid))
            {
                if o.is_active {
                    active.push_back(oid);
                }
            }
        }
        active
    }

    pub fn get_spot_price(env: Env, credit_id: u64) -> i128 {
        let active = Self::get_active_orders_for_credit(env.clone(), credit_id);
        let mut total_price: i128 = 0;
        let mut count: i128 = 0;
        for oid in active.iter() {
            if let Some(o) = env
                .storage()
                .persistent()
                .get::<_, Order>(&DataKey::Order(oid))
            {
                if !o.is_buy_order {
                    total_price += o.price;
                    count += 1;
                }
            }
        }
        if count == 0 { 0 } else { total_price / count }
    }

    pub fn is_verifier(env: Env, addr: Address) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&DataKey::Verifier(addr))
            .unwrap_or(false)
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    fn next_id(env: &Env, key: DataKey) -> u64 {
        let id: u64 = env.storage().instance().get(&key).unwrap_or(1);
        env.storage().instance().set(&key, &(id + 1));
        id
    }

    fn require_admin(env: &Env, caller: &Address) {
        caller.require_auth();
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        assert!(*caller == admin, "not admin");
    }

    fn assert_credit_verified(env: &Env, credit_id: u64) {
        let credit: CarbonCredit = env
            .storage()
            .persistent()
            .get(&DataKey::Credit(credit_id))
            .expect("credit not found");
        assert!(credit.is_verified, "credit not verified");
    }

    fn push_credit_order(env: &Env, credit_id: u64, order_id: u64) {
        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::CreditOrders(credit_id))
            .unwrap_or_else(|| vec![env]);
        ids.push_back(order_id);
        env.storage()
            .persistent()
            .set(&DataKey::CreditOrders(credit_id), &ids);
    }

    fn inc_active_orders(env: &Env) {
        let n: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActiveOrders)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ActiveOrders, &(n + 1));
    }
}
