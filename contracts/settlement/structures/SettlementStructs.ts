// SettlementStructs.ts - Data structures for cross-border settlement

export type Address = string;
export type u128 = number;
export type u64 = number;
export type u32 = number;
export type i128 = number;
export type i64 = number;
export type Bool = boolean;
export type Bytes = Uint8Array;

// Currency and FX related structures
export interface Currency {
    readonly code: string;           // ISO 4217 currency code (e.g., "USD", "EUR", "JPY")
    readonly name: string;           // Full currency name
    readonly decimals: number;       // Number of decimal places
    readonly isActive: boolean;      // Whether the currency is supported
    readonly requiresLicense: boolean; // Whether special licensing is required
}

export interface FXRate {
    readonly baseCurrency: string;   // Base currency code
    readonly quoteCurrency: string;  // Quote currency code
    readonly rate: u128;            // Exchange rate (1 base = rate quote)
    readonly timestamp: u64;         // When the rate was last updated
    readonly spread: u128;          // Bid-ask spread in basis points
    readonly source: string;         // Rate source (e.g., "Reuters", "Bloomberg")
    readonly confidence: u8;         // Confidence level (0-255)
}

export interface FXPair {
    readonly pair: string;           // Currency pair (e.g., "USD/EUR")
    readonly baseCurrency: string;   // Base currency
    readonly quoteCurrency: string;  // Quote currency
    readonly isActive: boolean;      // Whether trading is active
    readonly maxSlippage: u128;     // Maximum allowed slippage
    readonly minAmount: u128;       // Minimum trade amount
    readonly maxAmount: u128;       // Maximum trade amount
}

// Compliance and regulatory structures
export interface ComplianceLevel {
    readonly level: u8;             // Compliance level (0-255)
    readonly kycRequired: boolean;   // KYC verification required
    readonly amlRequired: boolean;   // AML screening required
    readonly sanctionsCheck: boolean; // Sanctions screening required
    readonly sourceOfFunds: boolean;  // Source of funds verification required
    readonly purposeOfPayment: boolean; // Purpose of payment verification required
}

export interface RegulatoryJurisdiction {
    readonly countryCode: string;     // ISO 3166-1 alpha-2 country code
    readonly name: string;           // Jurisdiction name
    readonly regulatoryBody: string;  // Regulatory authority name
    readonly complianceLevel: ComplianceLevel;
    readonly reportingRequirements: string[]; // Required reports
    readonly restrictions: string[];  // Transaction restrictions
}

export interface SanctionsList {
    readonly listId: string;         // Unique identifier for the sanctions list
    readonly name: string;           // List name (e.g., "OFAC SDN", "UN Sanctions")
    readonly version: string;        // List version
    readonly lastUpdated: u64;       // Last update timestamp
    readonly entries: SanctionsEntry[]; // Sanctioned entities
}

export interface SanctionsEntry {
    readonly entityId: string;        // Unique entity identifier
    readonly type: 'individual' | 'entity' | 'vessel' | 'aircraft';
    readonly name: string;           // Entity name
    readonly aliases: string[];      // Alternative names
    readonly addresses: string[];    // Known addresses
    readonly birthDates?: string[];  // For individuals
    readonly nationalities?: string[]; // For individuals
    readonly restrictions: string[];  // Specific restrictions
}

// Banking and payment structures
export interface BankInfo {
    readonly bankId: string;          // Unique bank identifier
    readonly name: string;           // Bank name
    readonly swiftCode: string;      // SWIFT/BIC code
    readonly country: string;         // Bank's country
    readonly currency: string;        // Primary currency
    readonly isCBDC: boolean;         // Whether bank supports CBDC
    readonly settlementSystems: string[]; // Supported settlement systems
    readonly limits: BankLimits;      // Transaction limits
    readonly fees: BankFees;          // Fee structure
}

export interface BankLimits {
    readonly dailyLimit: u128;       // Daily transaction limit
    readonly monthlyLimit: u128;     // Monthly transaction limit
    readonly perTransactionLimit: u128; // Per-transaction limit
    readonly minAmount: u128;       // Minimum transaction amount
}

export interface BankFees {
    readonly fixedFee: u128;         // Fixed fee per transaction
    readonly variableFee: u128;      // Variable fee percentage (basis points)
    readonly currencyFee: u128;      // Currency conversion fee
    readonly crossBorderFee: u128;   // Cross-border transaction fee
}

// Settlement structures
export interface SettlementRequest {
    readonly requestId: string;       // Unique request identifier
    readonly fromParty: Address;     // Initiating party
    readonly toParty: Address;       // Receiving party
    readonly amount: u128;           // Settlement amount
    readonly fromCurrency: string;   // Source currency
    readonly toCurrency: string;     // Target currency
    readonly fromBank: string;        // Source bank ID
    readonly toBank: string;         // Destination bank ID
    readonly purpose: string;         // Purpose of payment
    readonly reference: string;       // Transaction reference
    readonly urgency: 'normal' | 'urgent' | 'priority';
    readonly complianceData: ComplianceData;
    readonly timestamp: u64;          // Request timestamp
}

export interface ComplianceData {
    readonly kycVerified: boolean;     // KYC verification status
    readonly kycLevel: u8;           // KYC level (0-255)
    readonly amlChecked: boolean;     // AML screening status
    readonly sanctionsCleared: boolean; // Sanctions check status
    readonly riskScore: u8;          // Risk assessment score (0-255)
    readonly documentation: string[]; // Required documentation
    readonly additionalInfo: string;  // Additional compliance information
}

export interface SettlementExecution {
    readonly executionId: string;     // Unique execution identifier
    readonly requestId: string;       // Associated request ID
    readonly status: SettlementStatus;
    readonly fxRate: FXRate;         // Applied FX rate
    readonly convertedAmount: u128;   // Amount after conversion
    readonly fees: SettlementFees;   // All applicable fees
    readonly fromTxId?: string;       // Source transaction ID
    readonly toTxId?: string;        // Destination transaction ID
    readonly executedAt: u64;        // Execution timestamp
    readonly completedAt?: u64;      // Completion timestamp
    readonly failureReason?: string;  // Failure reason if applicable
}

export interface SettlementFees {
    readonly networkFee: u128;       // Network transaction fee
    readonly bankFee: u128;          // Bank processing fee
    readonly fxFee: u128;            // Currency conversion fee
    readonly complianceFee: u128;     // Compliance processing fee
    readonly crossBorderFee: u128;   // Cross-border fee
    readonly totalFee: u128;         // Total fees
}

export enum SettlementStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    AWAITING_FX = 'awaiting_fx',
    AWAITING_COMPLIANCE = 'awaiting_compliance',
    AWAITING_BANK = 'awaiting_bank',
    EXECUTING = 'executing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REVERSED = 'reversed'
}

// Risk management structures
export interface RiskAssessment {
    readonly riskScore: u8;          // Overall risk score (0-255)
    readonly riskFactors: RiskFactor[];
    readonly mitigation: string[];   // Risk mitigation measures
    readonly requiresEnhancedDd: boolean; // Requires enhanced due diligence
    readonly monitoringRequired: boolean; // Requires ongoing monitoring
}

export interface RiskFactor {
    readonly factor: string;         // Risk factor description
    readonly weight: u8;            // Factor weight (0-255)
    readonly score: u8;             // Factor score (0-255)
    readonly impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface SettlementLimit {
    readonly currency: string;        // Currency code
    readonly dailyLimit: u128;       // Daily settlement limit
    readonly weeklyLimit: u128;      // Weekly settlement limit
    readonly monthlyLimit: u128;     // Monthly settlement limit
    readonly perTransactionLimit: u128; // Per-transaction limit
    readonly counterpartyLimit: u128; // Per-counterparty limit
}

// Reporting structures
export interface ComplianceReport {
    readonly reportId: string;        // Unique report identifier
    readonly reportType: ReportType;
    readonly period: ReportingPeriod;
    readonly jurisdiction: string;    // Reporting jurisdiction
    readonly transactions: SettlementTransaction[];
    readonly summary: ReportSummary;
    readonly generatedAt: u64;        // Report generation timestamp
    readonly submittedAt?: u64;      // Report submission timestamp
}

export enum ReportType {
    STR = 'str',                      // Suspicious Transaction Report
    CTR = 'ctr',                      // Currency Transaction Report
    SAR = 'sar',                      // Suspicious Activity Report
    AML = 'aml',                      // AML Report
    KYC = 'kyc',                      // KYC Report
    SANCTIONS = 'sanctions',          // Sanctions Screening Report
    RISK = 'risk',                    // Risk Assessment Report
    VOLUME = 'volume'                 // Volume and Value Report
}

export interface ReportingPeriod {
    readonly startDate: u64;         // Period start date
    readonly endDate: u64;           // Period end date
    readonly type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface SettlementTransaction {
    readonly transactionId: string;   // Transaction identifier
    readonly amount: u128;           // Transaction amount
    readonly currency: string;        // Currency code
    readonly counterparties: Address[]; // Involved parties
    readonly timestamp: u64;         // Transaction timestamp
    readonly purpose: string;         // Purpose of transaction
    readonly riskScore: u8;          // Risk score
    readonly complianceStatus: string; // Compliance status
}

export interface ReportSummary {
    readonly totalTransactions: number;
    readonly totalAmount: u128;
    readonly highRiskTransactions: number;
    readonly suspiciousTransactions: number;
    readonly blockedTransactions: number;
    readonly complianceIssues: string[];
}

// Gas optimization structures
export interface GasOptimization {
    readonly batchId: string;         // Batch identifier
    readonly transactions: string[];  // Transaction IDs in batch
    readonly gasUsed: u64;           // Total gas used
    readonly gasSaved: u64;          // Gas saved through optimization
    readonly optimizationLevel: u8;   // Optimization level (0-255)
    readonly timestamp: u64;          // Batch timestamp
}

export interface GasMetrics {
    readonly baseGas: u64;           // Base gas cost
    readonly optimizedGas: u64;       // Optimized gas cost
    readonly savings: u64;           // Gas savings
    readonly savingsPercentage: u128; // Savings as percentage
}

// Cross-chain structures
export interface CrossChainSettlement {
    readonly settlementId: string;    // Unique settlement identifier
    readonly sourceChain: string;      // Source blockchain
    readonly targetChain: string;      // Target blockchain
    readonly bridgeContract: Address;  // Bridge contract address
    readonly bridgeFee: u128;         // Bridge fee
    readonly estimatedTime: u64;      // Estimated completion time
    readonly status: CrossChainStatus;
}

export enum CrossChainStatus {
    PENDING = 'pending',
    BRIDGING = 'bridging',
    CONFIRMING = 'confirming',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REVERTED = 'reverted'
}

// Utility types
export type u8 = number;
export type u16 = number;
export type u256 = number;
export type i8 = number;
export type i16 = number;
export type i32 = number;
export type i256 = number;

// Collection types
export type CurrencyMap = Map<string, Currency>;
export type FXRateMap = Map<string, FXRate>;
export type BankMap = Map<string, BankInfo>;
export type JurisdictionMap = Map<string, RegulatoryJurisdiction>;
export type SanctionsMap = Map<string, SanctionsList>;
export type SettlementMap = Map<string, SettlementExecution>;
export type LimitMap = Map<string, SettlementLimit>;
