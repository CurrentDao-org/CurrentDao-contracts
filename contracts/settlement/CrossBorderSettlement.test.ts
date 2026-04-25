import { CrossBorderSettlement } from './CrossBorderSettlement';
import { 
    SettlementRequest,
    ComplianceData,
    FXRate,
    SettlementStatus,
    ReportType,
    CrossChainStatus,
    Currency,
    BankInfo,
    RegulatoryJurisdiction,
    ComplianceLevel,
    ReportingPeriod
} from './structures/SettlementStructs';
import { FXConversionLib } from './libraries/FXConversionLib';

describe('CrossBorderSettlement', () => {
    let settlement: CrossBorderSettlement;
    let owner: string;
    let user1: string;
    let user2: string;
    let bank1: string;
    let bank2: string;

    beforeEach(() => {
        owner = '0xowner';
        user1 = '0xuser1';
        user2 = '0xuser2';
        bank1 = 'BANK_1';
        bank2 = 'BANK_2';
        
        settlement = new CrossBorderSettlement(owner);
        
        // Setup test data
        setupTestData();
    });

    describe('Contract Initialization', () => {
        it('should initialize with correct owner', () => {
            expect(settlement.getOwner()).toBe(owner);
        });

        it('should have supported currencies', () => {
            const currencies = settlement.getSupportedCurrencies();
            expect(currencies.length).toBeGreaterThan(0);
            expect(currencies.some(c => c.code === 'USD')).toBe(true);
            expect(currencies.some(c => c.code === 'EUR')).toBe(true);
        });

        it('should have supported banks', () => {
            const banks = settlement.getSupportedBanks();
            expect(banks.length).toBe(55); // As per initialization
            expect(banks.some(b => b.bankId === bank1)).toBe(true);
        });

        it('should be initially unpaused', () => {
            expect(() => settlement.initiateSettlement(createMockSettlementRequest())).not.toThrow();
        });
    });

    describe('Settlement Initiation', () => {
        it('should initiate settlement successfully', () => {
            const request = createMockSettlementRequest();
            const executionId = settlement.initiateSettlement(request);
            
            expect(executionId).toBeDefined();
            expect(executionId).toMatch(/^SETTLE_/);
            
            const settlementData = settlement.getSettlement(executionId);
            expect(settlementData.status).toBe(SettlementStatus.PENDING);
            expect(settlementData.requestId).toBe(request.requestId);
        });

        it('should fail with invalid currency', () => {
            const request = createMockSettlementRequest();
            request.fromCurrency = 'INVALID';
            
            expect(() => settlement.initiateSettlement(request)).toThrow('Unsupported currency');
        });

        it('should fail with invalid bank', () => {
            const request = createMockSettlementRequest();
            request.fromBank = 'INVALID_BANK';
            
            expect(() => settlement.initiateSettlement(request)).toThrow('Unsupported bank');
        });

        it('should fail with invalid amount', () => {
            const request = createMockSettlementRequest();
            request.amount = 0;
            
            expect(() => settlement.initiateSettlement(request)).toThrow('Invalid amount');
        });

        it('should fail without KYC verification', () => {
            // Don't perform KYC before settlement
            const request = createMockSettlementRequest();
            
            expect(() => settlement.initiateSettlement(request)).toThrow('KYC verification required');
        });
    });

    describe('KYC and Compliance', () => {
        beforeEach(() => {
            // Perform KYC for test users
            const kycData: ComplianceData = {
                kycVerified: true,
                kycLevel: 150,
                amlChecked: true,
                sanctionsCleared: true,
                riskScore: 50,
                documentation: ['passport', 'utility_bill'],
                additionalInfo: 'Verified user'
            };
            
            settlement.performKYC(user1, kycData);
            settlement.performKYC(user2, kycData);
        });

        it('should perform KYC verification successfully', () => {
            const kycData: ComplianceData = {
                kycVerified: true,
                kycLevel: 200,
                amlChecked: false,
                sanctionsCleared: false,
                riskScore: 30,
                documentation: ['passport'],
                additionalInfo: 'High level verification'
            };
            
            const result = settlement.performKYC('0xnewuser', kycData);
            expect(result).toBe(true);
        });

        it('should reject KYC with insufficient level', () => {
            const kycData: ComplianceData = {
                kycVerified: true,
                kycLevel: 50, // Too low
                amlChecked: false,
                sanctionsCleared: false,
                riskScore: 100,
                documentation: [],
                additionalInfo: 'Low level verification'
            };
            
            const result = settlement.performKYC('0xlowlevel', kycData);
            expect(result).toBe(false);
        });

        it('should perform AML screening', () => {
            const request = createMockSettlementRequest();
            const result = settlement.performAML(user1, request);
            expect(result).toBe(true);
        });

        it('should check sanctions successfully', () => {
            const result = settlement.checkSanctions([user1, user2]);
            expect(result).toBe(true);
        });
    });

    describe('FX Conversion', () => {
        beforeEach(() => {
            // Setup FX rates
            const fxRates: FXRate[] = [
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'EUR',
                    rate: 850000, // 0.85 EUR per USD
                    timestamp: Date.now() as any,
                    spread: 5, // 0.05% spread
                    source: 'Reuters',
                    confidence: 250
                },
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'GBP',
                    rate: 730000, // 0.73 GBP per USD
                    timestamp: Date.now() as any,
                    spread: 8,
                    source: 'Bloomberg',
                    confidence: 240
                }
            ];
            
            FXConversionLib.updateFXRates(fxRates);
            settlement.updateFXRates(fxRates, owner);
        });

        it('should get FX rate successfully', () => {
            const rate = settlement.getFXRate('USD', 'EUR');
            expect(rate.baseCurrency).toBe('USD');
            expect(rate.quoteCurrency).toBe('EUR');
            expect(rate.spread).toBeLessThanOrEqual(10); // <0.1% spread
        });

        it('should convert currency successfully', () => {
            const amount = 1000000; // $1000 USD
            const converted = settlement.convertCurrency(amount, 'USD', 'EUR');
            expect(converted).toBeGreaterThan(0);
            expect(converted).toBeLessThan(amount); // EUR should be less than USD
        });

        it('should handle inverse conversion', () => {
            const amount = 850000; // 850 EUR
            const converted = settlement.convertCurrency(amount, 'EUR', 'USD');
            expect(converted).toBeGreaterThan(0);
        });

        it('should update FX rates', () => {
            const newRates: FXRate[] = [
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'JPY',
                    rate: 110000000, // 110 JPY per USD
                    timestamp: Date.now() as any,
                    spread: 7,
                    source: 'Chainlink',
                    confidence: 255
                }
            ];
            
            expect(() => settlement.updateFXRates(newRates, owner)).not.toThrow();
            
            const rate = settlement.getFXRate('USD', 'JPY');
            expect(rate.rate).toBe(110000000);
        });
    });

    describe('Settlement Execution', () => {
        let executionId: string;

        beforeEach(() => {
            // Setup compliance
            setupCompliance();
            
            // Initiate settlement
            const request = createMockSettlementRequest();
            executionId = settlement.initiateSettlement(request);
        });

        it('should execute settlement successfully', () => {
            const result = settlement.executeSettlement(executionId, owner);
            expect(result).toBe(true);
            
            const settlementData = settlement.getSettlement(executionId);
            expect(settlementData.status).toBe(SettlementStatus.COMPLETED);
            expect(settlementData.completedAt).toBeDefined();
        });

        it('should fail execution without authorization', () => {
            expect(() => settlement.executeSettlement(executionId, user1)).toThrow('Caller not authorized');
        });

        it('should cancel settlement successfully', () => {
            const result = settlement.cancelSettlement(executionId, user1);
            expect(result).toBe(true);
            
            const settlementData = settlement.getSettlement(executionId);
            expect(settlementData.status).toBe(SettlementStatus.CANCELLED);
        });

        it('should get settlement status', () => {
            const status = settlement.getSettlementStatus(executionId);
            expect(status).toBe(SettlementStatus.PENDING);
        });
    });

    describe('Risk Management', () => {
        beforeEach(() => {
            setupCompliance();
        });

        it('should assess risk for settlement', () => {
            const request = createMockSettlementRequest();
            const riskAssessment = settlement.assessRisk(request);
            
            expect(riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
            expect(riskAssessment.riskScore).toBeLessThanOrEqual(255);
            expect(riskAssessment.riskFactors.length).toBeGreaterThan(0);
            expect(riskAssessment.mitigation.length).toBeGreaterThan(0);
        });

        it('should get settlement limits', () => {
            const limits = settlement.getSettlementLimits('USD');
            expect(limits.currency).toBe('USD');
            expect(limits.perTransactionLimit).toBeGreaterThan(0);
            expect(limits.dailyLimit).toBeGreaterThan(limits.perTransactionLimit);
        });

        it('should check settlement limits', () => {
            const request = createMockSettlementRequest();
            const withinLimits = settlement.checkSettlementLimits(request);
            expect(withinLimits).toBe(true);
            
            // Test exceeding limits
            request.amount = 2000000; // Exceeds per-transaction limit
            const exceedsLimits = settlement.checkSettlementLimits(request);
            expect(exceedsLimits).toBe(false);
        });

        it('should update settlement limits', () => {
            const newLimits = settlement.getSettlementLimits('USD');
            newLimits.perTransactionLimit = 2000000;
            
            expect(() => settlement.updateSettlementLimits('USD', newLimits, owner)).not.toThrow();
        });
    });

    describe('Gas Optimization', () => {
        it('should create optimization batch', () => {
            const transactions = ['tx1', 'tx2', 'tx3'];
            const batchId = settlement.createOptimizationBatch(transactions);
            
            expect(batchId).toBeDefined();
            expect(batchId).toMatch(/^BATCH_/);
        });

        it('should fail with batch size exceeding limit', () => {
            const transactions = Array(60).fill('tx'); // Exceeds max batch size of 50
            expect(() => settlement.createOptimizationBatch(transactions)).toThrow('Batch size exceeds maximum');
        });

        it('should execute optimized batch', () => {
            const transactions = ['tx1', 'tx2'];
            const batchId = settlement.createOptimizationBatch(transactions);
            
            const result = settlement.executeOptimizedBatch(batchId, owner);
            expect(result.transactions.length).toBe(2);
            expect(result.gasUsed).toBeGreaterThan(0);
        });

        it('should get gas metrics', () => {
            const transactions = ['tx1'];
            const batchId = settlement.createOptimizationBatch(transactions);
            settlement.executeOptimizedBatch(batchId, owner);
            
            const metrics = settlement.getGasMetrics(batchId);
            expect(metrics.baseGas).toBeGreaterThan(0);
            expect(metrics.optimizedGas).toBeGreaterThan(0);
            expect(metrics.savings).toBeGreaterThan(0);
        });
    });

    describe('Cross-Chain Settlement', () => {
        it('should initiate cross-chain settlement', () => {
            const xcSettlement = {
                settlementId: '',
                sourceChain: 'ethereum',
                targetChain: 'polygon',
                bridgeContract: '0xbridge',
                bridgeFee: 1000,
                estimatedTime: 300000,
                status: CrossChainStatus.PENDING as CrossChainStatus
            };
            
            const settlementId = settlement.initiateCrossChainSettlement(xcSettlement);
            expect(settlementId).toBeDefined();
            expect(settlementId).toMatch(/^XC_/);
        });

        it('should get cross-chain status', () => {
            const xcSettlement = {
                settlementId: '',
                sourceChain: 'ethereum',
                targetChain: 'bsc',
                bridgeContract: '0xbridge',
                bridgeFee: 1500,
                estimatedTime: 600000,
                status: CrossChainStatus.PENDING as CrossChainStatus
            };
            
            const settlementId = settlement.initiateCrossChainSettlement(xcSettlement);
            const status = settlement.getCrossChainStatus(settlementId);
            expect(status).toBe(CrossChainStatus.PENDING);
        });

        it('should complete cross-chain settlement', () => {
            const xcSettlement = {
                settlementId: '',
                sourceChain: 'ethereum',
                targetChain: 'arbitrum',
                bridgeContract: '0xbridge',
                bridgeFee: 800,
                estimatedTime: 180000,
                status: CrossChainStatus.PENDING as CrossChainStatus
            };
            
            const settlementId = settlement.initiateCrossChainSettlement(xcSettlement);
            
            // Mock the settlement to be in confirming state
            // In real implementation, this would happen through the process
            const result = settlement.completeCrossChainSettlement(settlementId, '0xtargettx', owner);
            expect(result).toBe(true);
        });
    });

    describe('Compliance Reporting', () => {
        it('should generate compliance report', () => {
            const period: ReportingPeriod = {
                startDate: Date.now() - 86400000 as any, // 24 hours ago
                endDate: Date.now() as any,
                type: 'daily'
            };
            
            const report = settlement.generateComplianceReport(ReportType.STR, period);
            expect(report.reportId).toBeDefined();
            expect(report.reportType).toBe(ReportType.STR);
            expect(report.period).toEqual(period);
        });

        it('should get compliance requirements', () => {
            const requirements = settlement.getComplianceRequirements('US');
            expect(requirements.kycRequired).toBe(true);
            expect(requirements.amlRequired).toBe(true);
            expect(requirements.sanctionsCheck).toBe(true);
        });
    });

    describe('Bank Integration', () => {
        it('should get bank information', () => {
            const bankInfo = settlement.getBankInfo(bank1);
            expect(bankInfo.bankId).toBe(bank1);
            expect(bankInfo.name).toBeDefined();
            expect(bankInfo.swiftCode).toBeDefined();
        });

        it('should validate bank account', () => {
            const isValid = settlement.validateBankAccount(bank1, user1);
            expect(isValid).toBe(true);
        });

        it('should update bank information', () => {
            const bankInfo = settlement.getBankInfo(bank1);
            bankInfo.name = 'Updated Bank Name';
            
            expect(() => settlement.updateBankInfo(bankInfo, owner)).not.toThrow();
        });
    });

    describe('Administrative Functions', () => {
        it('should pause and unpause contract', () => {
            settlement.pause(owner);
            expect(() => settlement.initiateSettlement(createMockSettlementRequest())).toThrow('Contract is paused');
            
            settlement.unpause(owner);
            expect(() => settlement.initiateSettlement(createMockSettlementRequest())).not.toThrow();
        });

        it('should transfer ownership', () => {
            const newOwner = '0xnewowner';
            settlement.transferOwnership(newOwner, owner);
            expect(settlement.getOwner()).toBe(newOwner);
        });

        it('should update configuration', () => {
            const newConfig = {
                maxSettlementTime: 15 * 60 * 1000, // 15 minutes
                maxBatchSize: 100
            };
            
            expect(() => settlement.updateConfiguration(newConfig, owner)).not.toThrow();
            
            const config = settlement.getConfiguration();
            expect(config.maxSettlementTime).toBe(15 * 60 * 1000);
            expect(config.maxBatchSize).toBe(100);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid settlement ID', () => {
            expect(() => settlement.getSettlement('invalid_id')).toThrow('Settlement not found');
        });

        it('should handle unauthorized operations', () => {
            expect(() => settlement.pause(user1)).toThrow('Caller is not owner');
            expect(() => settlement.updateFXRates([], user1)).toThrow('Caller not authorized');
        });

        it('should handle invalid bank', () => {
            expect(() => settlement.getBankInfo('invalid_bank')).toThrow('Bank not found');
        });

        it('should handle invalid currency limits', () => {
            expect(() => settlement.getSettlementLimits('INVALID')).toThrow('Settlement limits not found for currency');
        });
    });

    describe('Events', () => {
        it('should emit settlement initiated event', () => {
            setupCompliance();
            
            const eventsBefore = settlement.getPastEvents().length;
            settlement.initiateSettlement(createMockSettlementRequest());
            const eventsAfter = settlement.getPastEvents().length;
            
            expect(eventsAfter).toBe(eventsBefore + 1);
            
            const events = settlement.getPastEvents();
            const latestEvent = events[events.length - 1];
            expect(latestEvent.event).toBe('SettlementInitiated');
        });

        it('should emit settlement executed event', () => {
            setupCompliance();
            
            const executionId = settlement.initiateSettlement(createMockSettlementRequest());
            const eventsBefore = settlement.getPastEvents().length;
            
            settlement.executeSettlement(executionId, owner);
            const eventsAfter = settlement.getPastEvents().length;
            
            expect(eventsAfter).toBe(eventsBefore + 1);
            
            const events = settlement.getPastEvents();
            const latestEvent = events[events.length - 1];
            expect(latestEvent.event).toBe('SettlementExecuted');
        });
    });

    // --- Helper Functions ---

    function setupTestData(): void {
        // Setup FX rates
        const fxRates: FXRate[] = [
            {
                baseCurrency: 'USD',
                quoteCurrency: 'EUR',
                rate: 850000,
                timestamp: Date.now() as any,
                spread: 5,
                source: 'Reuters',
                confidence: 250
            },
            {
                baseCurrency: 'EUR',
                quoteCurrency: 'USD',
                rate: 1176471,
                timestamp: Date.now() as any,
                spread: 5,
                source: 'Reuters',
                confidence: 250
            }
        ];
        
        FXConversionLib.updateFXRates(fxRates);
        settlement.updateFXRates(fxRates, owner);
    }

    function setupCompliance(): void {
        const kycData: ComplianceData = {
            kycVerified: true,
            kycLevel: 150,
            amlChecked: true,
            sanctionsCleared: true,
            riskScore: 50,
            documentation: ['passport', 'utility_bill'],
            additionalInfo: 'Verified user'
        };
        
        settlement.performKYC(user1, kycData);
        settlement.performKYC(user2, kycData);
        
        const request = createMockSettlementRequest();
        settlement.performAML(user1, request);
        settlement.performAML(user2, request);
    }

    function createMockSettlementRequest(): SettlementRequest {
        return {
            requestId: `REQ_${Date.now()}`,
            fromParty: user1,
            toParty: user2,
            amount: 100000, // $100 USD
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            fromBank: bank1,
            toBank: bank2,
            purpose: 'Energy trading settlement',
            reference: 'REF_001',
            urgency: 'normal',
            complianceData: {
                kycVerified: true,
                kycLevel: 150,
                amlChecked: true,
                sanctionsCleared: true,
                riskScore: 50,
                documentation: ['passport'],
                additionalInfo: 'Standard compliance'
            },
            timestamp: Date.now() as any
        };
    }
});

describe('FXConversionLib', () => {
    beforeEach(() => {
        // Initialize FX library
        const currencies: Currency[] = [
            { code: 'USD', name: 'US Dollar', decimals: 2, isActive: true, requiresLicense: false },
            { code: 'EUR', name: 'Euro', decimals: 2, isActive: true, requiresLicense: false },
            { code: 'GBP', name: 'British Pound', decimals: 2, isActive: true, requiresLicense: false }
        ];
        
        FXConversionLib.initialize(currencies, []);
    });

    describe('FX Rate Management', () => {
        it('should update FX rates successfully', () => {
            const rates: FXRate[] = [
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'EUR',
                    rate: 850000,
                    timestamp: Date.now() as any,
                    spread: 5,
                    source: 'Reuters',
                    confidence: 250
                }
            ];
            
            const updatedCount = FXConversionLib.updateFXRates(rates);
            expect(updatedCount).toBe(1);
        });

        it('should get FX rate', () => {
            const rates: FXRate[] = [
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'EUR',
                    rate: 850000,
                    timestamp: Date.now() as any,
                    spread: 5,
                    source: 'Reuters',
                    confidence: 250
                }
            ];
            
            FXConversionLib.updateFXRates(rates);
            
            const rate = FXConversionLib.getFXRate('USD', 'EUR');
            expect(rate).toBeDefined();
            expect(rate!.rate).toBe(850000);
        });

        it('should handle inverse rates', () => {
            const rates: FXRate[] = [
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'EUR',
                    rate: 850000,
                    timestamp: Date.now() as any,
                    spread: 5,
                    source: 'Reuters',
                    confidence: 250
                }
            ];
            
            FXConversionLib.updateFXRates(rates);
            
            const inverseRate = FXConversionLib.getFXRate('EUR', 'USD');
            expect(inverseRate).toBeDefined();
            expect(inverseRate!.baseCurrency).toBe('EUR');
            expect(inverseRate!.quoteCurrency).toBe('USD');
        });
    });

    describe('Currency Conversion', () => {
        beforeEach(() => {
            const rates: FXRate[] = [
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'EUR',
                    rate: 850000,
                    timestamp: Date.now() as any,
                    spread: 5,
                    source: 'Reuters',
                    confidence: 250
                }
            ];
            
            FXConversionLib.updateFXRates(rates);
        });

        it('should convert currency directly', () => {
            const amount = 1000000; // $1000 USD
            const converted = FXConversionLib.convertCurrency(amount, 'USD', 'EUR');
            expect(converted).toBe(850000); // €850
        });

        it('should convert currency inversely', () => {
            const amount = 850000; // €850 EUR
            const converted = FXConversionLib.convertCurrency(amount, 'EUR', 'USD');
            expect(converted).toBeCloseTo(1000000, 0); // ~$1000 USD
        });

        it('should return null for unsupported conversion', () => {
            const converted = FXConversionLib.convertCurrency(1000000, 'USD', 'INVALID');
            expect(converted).toBeNull();
        });
    });

    describe('Rate Validation', () => {
        it('should validate FX rate', () => {
            const validRate: FXRate = {
                baseCurrency: 'USD',
                quoteCurrency: 'EUR',
                rate: 850000,
                timestamp: Date.now() as any,
                spread: 5,
                source: 'Reuters',
                confidence: 250
            };
            
            expect(FXConversionLib.validateFXRate(validRate)).toBe(true);
        });

        it('should reject invalid FX rate', () => {
            const invalidRate: FXRate = {
                baseCurrency: 'INVALID',
                quoteCurrency: 'EUR',
                rate: 850000,
                timestamp: Date.now() as any,
                spread: 5,
                source: 'Reuters',
                confidence: 250
            };
            
            expect(FXConversionLib.validateFXRate(invalidRate)).toBe(false);
        });

        it('should reject rate with low confidence', () => {
            const lowConfidenceRate: FXRate = {
                baseCurrency: 'USD',
                quoteCurrency: 'EUR',
                rate: 850000,
                timestamp: Date.now() as any,
                spread: 5,
                source: 'Reuters',
                confidence: 100 // Below threshold
            };
            
            expect(FXConversionLib.validateFXRate(lowConfidenceRate)).toBe(false);
        });
    });

    describe('Spread Calculation', () => {
        it('should calculate conversion with fees', () => {
            const rate: FXRate = {
                baseCurrency: 'USD',
                quoteCurrency: 'EUR',
                rate: 850000,
                timestamp: Date.now() as any,
                spread: 5, // 0.05%
                source: 'Reuters',
                confidence: 250
            };
            
            const result = FXConversionLib.calculateConversionWithFees(1000000, rate, true);
            expect(result.convertedAmount).toBe(850000);
            expect(result.spread).toBe(425); // 0.05% of 850000
            expect(result.totalCost).toBe(850425);
        });

        it('should calculate conversion without spread', () => {
            const rate: FXRate = {
                baseCurrency: 'USD',
                quoteCurrency: 'EUR',
                rate: 850000,
                timestamp: Date.now() as any,
                spread: 5,
                source: 'Reuters',
                confidence: 250
            };
            
            const result = FXConversionLib.calculateConversionWithFees(1000000, rate, false);
            expect(result.convertedAmount).toBe(850000);
            expect(result.spread).toBe(0);
            expect(result.totalCost).toBe(850000);
        });
    });

    describe('Utility Functions', () => {
        it('should get supported currencies', () => {
            const currencies = FXConversionLib.getSupportedCurrencies();
            expect(currencies.length).toBeGreaterThan(0);
            expect(currencies.some(c => c.code === 'USD')).toBe(true);
        });

        it('should validate currency pair', () => {
            expect(FXConversionLib.isValidPair('USD', 'EUR')).toBe(true);
            expect(FXConversionLib.isValidPair('INVALID', 'EUR')).toBe(false);
        });

        it('should get rate statistics', () => {
            const rates: FXRate[] = [
                {
                    baseCurrency: 'USD',
                    quoteCurrency: 'EUR',
                    rate: 850000,
                    timestamp: Date.now() as any,
                    spread: 5,
                    source: 'Reuters',
                    confidence: 250
                }
            ];
            
            FXConversionLib.updateFXRates(rates);
            
            const stats = FXConversionLib.getRateStatistics('USD', 'EUR');
            expect(stats.currentRate).toBe(850000);
            expect(stats.spread).toBe(5);
            expect(stats.confidence).toBe(250);
            expect(stats.volatility).toBeGreaterThanOrEqual(0);
        });
    });
});
