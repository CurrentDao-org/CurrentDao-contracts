import { 
    Address, 
    u128, 
    u64, 
    u8,
    Currency,
    FXRate,
    SettlementRequest,
    SettlementExecution,
    ComplianceData,
    BankInfo,
    RiskAssessment,
    SettlementLimit,
    ComplianceReport,
    GasOptimization,
    CrossChainSettlement,
    SettlementStatus,
    ReportType,
    CrossChainStatus
} from '../structures/SettlementStructs';

/**
 * Interface for Cross-Border Settlement Contract
 * Handles multi-currency settlement with international compliance and FX conversion
 */
export interface ICrossBorderSettlement {
    
    // --- Core Settlement Functions ---
    
    /**
     * Initiates a cross-border settlement request
     * @param request Settlement request details
     * @returns Settlement execution ID
     */
    initiateSettlement(request: SettlementRequest): string;
    
    /**
     * Executes a pending settlement
     * @param executionId Settlement execution ID
     * @param caller Caller address
     * @returns Success status
     */
    executeSettlement(executionId: string, caller: Address): boolean;
    
    /**
     * Cancels a pending settlement
     * @param executionId Settlement execution ID
     * @param caller Caller address
     * @returns Success status
     */
    cancelSettlement(executionId: string, caller: Address): boolean;
    
    /**
     * Gets settlement execution details
     * @param executionId Settlement execution ID
     * @returns Settlement execution details
     */
    getSettlement(executionId: string): SettlementExecution;
    
    /**
     * Gets settlement status
     * @param executionId Settlement execution ID
     * @returns Current settlement status
     */
    getSettlementStatus(executionId: string): SettlementStatus;
    
    // --- Currency and FX Functions ---
    
    /**
     * Gets supported currencies
     * @returns Array of supported currencies
     */
    getSupportedCurrencies(): Currency[];
    
    /**
     * Gets current FX rate for a currency pair
     * @param baseCurrency Base currency code
     * @param quoteCurrency Quote currency code
     * @returns Current FX rate
     */
    getFXRate(baseCurrency: string, quoteCurrency: string): FXRate;
    
    /**
     * Converts amount between currencies
     * @param amount Amount to convert
     * @param fromCurrency Source currency
     * @param toCurrency Target currency
     * @returns Converted amount
     */
    convertCurrency(amount: u128, fromCurrency: string, toCurrency: string): u128;
    
    /**
     * Updates FX rates from oracle
     * @param rates Array of FX rates to update
     * @param caller Caller address (must be authorized oracle)
     */
    updateFXRates(rates: FXRate[], caller: Address): void;
    
    // --- Banking Integration Functions ---
    
    /**
     * Gets supported bank information
     * @param bankId Bank identifier
     * @returns Bank information
     */
    getBankInfo(bankId: string): BankInfo;
    
    /**
     * Gets all supported banks
     * @returns Array of supported banks
     */
    getSupportedBanks(): BankInfo[];
    
    /**
     * Adds or updates bank information
     * @param bank Bank information
     * @param caller Caller address (must be authorized)
     */
    updateBankInfo(bank: BankInfo, caller: Address): void;
    
    /**
     * Validates bank account
     * @param bankId Bank identifier
     * @param accountNumber Account number
     * @returns Validation status
     */
    validateBankAccount(bankId: string, accountNumber: string): boolean;
    
    // --- Compliance and Regulatory Functions ---
    
    /**
     * Performs KYC verification
     * @param party Party address to verify
     * @param kycData KYC verification data
     * @returns Verification status
     */
    performKYC(party: Address, kycData: ComplianceData): boolean;
    
    /**
     * Performs AML screening
     * @param party Party address to screen
     * @param transactionData Transaction data for screening
     * @returns Screening status
     */
    performAML(party: Address, transactionData: SettlementRequest): boolean;
    
    /**
     * Checks sanctions compliance
     * @param parties Parties to check
     * @returns Sanctions compliance status
     */
    checkSanctions(parties: Address[]): boolean;
    
    /**
     * Gets compliance requirements for jurisdiction
     * @param countryCode Country code
     * @returns Compliance requirements
     */
    getComplianceRequirements(countryCode: string): any;
    
    /**
     * Generates compliance report
     * @param reportType Type of report to generate
     * @param period Reporting period
     * @returns Generated compliance report
     */
    generateComplianceReport(reportType: ReportType, period: any): ComplianceReport;
    
    // --- Risk Management Functions ---
    
    /**
     * Performs risk assessment for settlement
     * @param request Settlement request to assess
     * @returns Risk assessment result
     */
    assessRisk(request: SettlementRequest): RiskAssessment;
    
    /**
     * Gets settlement limits for currency
     * @param currency Currency code
     * @returns Settlement limits
     */
    getSettlementLimits(currency: string): SettlementLimit;
    
    /**
     * Updates settlement limits
     * @param currency Currency code
     * @param limits New settlement limits
     * @param caller Caller address (must be authorized)
     */
    updateSettlementLimits(currency: string, limits: SettlementLimit, caller: Address): void;
    
    /**
     * Checks if settlement exceeds limits
     * @param request Settlement request to check
     * @returns Limit check result
     */
    checkSettlementLimits(request: SettlementRequest): boolean;
    
    // --- Gas Optimization Functions ---
    
    /**
     * Creates batch for gas optimization
     * @param transactions Transaction IDs to batch
     * @returns Batch ID
     */
    createOptimizationBatch(transactions: string[]): string;
    
    /**
     * Executes optimized batch
     * @param batchId Batch identifier
     * @param caller Caller address
     * @returns Execution result
     */
    executeOptimizedBatch(batchId: string, caller: Address): GasOptimization;
    
    /**
     * Gets gas optimization metrics
     * @param batchId Batch identifier
     * @returns Gas metrics
     */
    getGasMetrics(batchId: string): any;
    
    // --- Cross-Chain Functions ---
    
    /**
     * Initiates cross-chain settlement
     * @param settlement Cross-chain settlement details
     * @returns Settlement ID
     */
    initiateCrossChainSettlement(settlement: CrossChainSettlement): string;
    
    /**
     * Gets cross-chain settlement status
     * @param settlementId Settlement identifier
     * @returns Cross-chain status
     */
    getCrossChainStatus(settlementId: string): CrossChainStatus;
    
    /**
     * Completes cross-chain settlement
     * @param settlementId Settlement identifier
     * @param targetTxId Target chain transaction ID
     * @param caller Caller address
     * @returns Completion status
     */
    completeCrossChainSettlement(settlementId: string, targetTxId: string, caller: Address): boolean;
    
    // --- Administrative Functions ---
    
    /**
     * Pauses the contract (emergency stop)
     * @param caller Caller address (must be admin)
     */
    pause(caller: Address): void;
    
    /**
     * Unpauses the contract
     * @param caller Caller address (must be admin)
     */
    unpause(caller: Address): void;
    
    /**
     * Gets contract configuration
     * @returns Contract configuration
     */
    getConfiguration(): any;
    
    /**
     * Updates contract configuration
     * @param config New configuration
     * @param caller Caller address (must be admin)
     */
    updateConfiguration(config: any, caller: Address): void;
    
    /**
     * Gets contract owner
     * @returns Owner address
     */
    getOwner(): Address;
    
    /**
     * Transfers ownership
     * @param newOwner New owner address
     * @param caller Caller address (must be current owner)
     */
    transferOwnership(newOwner: Address, caller: Address): void;
    
    // --- Events ---
    
    /**
     * Emitted when settlement is initiated
     */
    SettlementInitiated: {
        executionId: string;
        requestId: string;
        fromParty: Address;
        toParty: Address;
        amount: u128;
        fromCurrency: string;
        toCurrency: string;
    };
    
    /**
     * Emitted when settlement is executed
     */
    SettlementExecuted: {
        executionId: string;
        amount: u128;
        fees: u128;
        timestamp: u64;
    };
    
    /**
     * Emitted when settlement fails
     */
    SettlementFailed: {
        executionId: string;
        reason: string;
        timestamp: u64;
    };
    
    /**
     * Emitted when FX rate is updated
     */
    FXRateUpdated: {
        baseCurrency: string;
        quoteCurrency: string;
        rate: u128;
        timestamp: u64;
    };
    
    /**
     * Emitted when compliance check is performed
     */
    ComplianceChecked: {
        party: Address;
        result: boolean;
        riskScore: u8;
        timestamp: u64;
    };
    
    /**
     * Emitted when sanctions are checked
     */
    SanctionsChecked: {
        parties: Address[];
        result: boolean;
        timestamp: u64;
    };
    
    /**
     * Emitted when gas optimization batch is created
     */
    OptimizationBatchCreated: {
        batchId: string;
        transactionCount: number;
        estimatedSavings: u64;
    };
    
    /**
     * Emitted when cross-chain settlement is initiated
     */
    CrossChainInitiated: {
        settlementId: string;
        sourceChain: string;
        targetChain: string;
        amount: u128;
    };
    
    /**
     * Emitted when cross-chain settlement is completed
     */
    CrossChainCompleted: {
        settlementId: string;
        sourceTxId: string;
        targetTxId: string;
        timestamp: u64;
    };
}
