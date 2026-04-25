import {
    u128,
    u64,
    u8,
    FXRate,
    FXPair,
    Currency,
    CurrencyMap,
    FXRateMap
} from '../structures/SettlementStructs';

/**
 * FX Conversion Library
 * Provides real-time FX conversion with minimal spread and high accuracy
 */
export class FXConversionLib {
    
    // Constants for precision and spread
    private static readonly BASIS_POINTS_PRECISION = 10000; // 10000 = 100%
    private static readonly MAX_SPREAD_BP = 10; // Maximum 0.1% spread (10 basis points)
    private static readonly RATE_PRECISION = 1000000; // 6 decimal places for rates
    private static readonly CONFIDENCE_THRESHOLD = 200; // Minimum confidence level
    private static readonly RATE_STALENESS_SECONDS = 300; // 5 minutes
    
    // Storage for FX data
    private static fxRates: FXRateMap = new Map();
    private static fxPairs: Map<string, FXPair> = new Map();
    private static currencies: CurrencyMap = new Map();
    private static rateSources: Set<string> = new Set();
    
    /**
     * Initializes the FX library with supported currencies and pairs
     */
    public static initialize(currencies: Currency[], pairs: FXPair[]): void {
        // Initialize currencies
        currencies.forEach(currency => {
            this.currencies.set(currency.code, currency);
        });
        
        // Initialize FX pairs
        pairs.forEach(pair => {
            this.fxPairs.set(pair.pair, pair);
        });
        
        // Add default rate sources
        this.rateSources.add('Reuters');
        this.rateSources.add('Bloomberg');
        this.rateSources.add('Oracle');
        this.rateSources.add('Chainlink');
    }
    
    /**
     * Updates FX rates with validation and spread calculation
     * @param rates Array of FX rates to update
     * @returns Number of successfully updated rates
     */
    public static updateFXRates(rates: FXRate[]): number {
        let updatedCount = 0;
        
        for (const rate of rates) {
            if (this.validateFXRate(rate)) {
                const existingRate = this.fxRates.get(`${rate.baseCurrency}/${rate.quoteCurrency}`);
                
                // Calculate optimal spread
                const optimalSpread = this.calculateOptimalSpread(rate, existingRate);
                const rateWithSpread = {
                    ...rate,
                    spread: optimalSpread,
                    timestamp: Date.now() as u64
                };
                
                this.fxRates.set(`${rate.baseCurrency}/${rate.quoteCurrency}`, rateWithSpread);
                this.rateSources.add(rate.source);
                updatedCount++;
            }
        }
        
        return updatedCount;
    }
    
    /**
     * Gets current FX rate for a currency pair
     * @param baseCurrency Base currency code
     * @param quoteCurrency Quote currency code
     * @returns Current FX rate or null if not available
     */
    public static getFXRate(baseCurrency: string, quoteCurrency: string): FXRate | null {
        const pairKey = `${baseCurrency}/${quoteCurrency}`;
        const rate = this.fxRates.get(pairKey);
        
        if (!rate) {
            // Try inverse rate
            const inverseKey = `${quoteCurrency}/${baseCurrency}`;
            const inverseRate = this.fxRates.get(inverseKey);
            
            if (inverseRate) {
                return this.inverseRate(inverseRate);
            }
            
            return null;
        }
        
        // Check if rate is stale
        if (this.isRateStale(rate)) {
            return null;
        }
        
        return rate;
    }
    
    /**
     * Converts amount between currencies with real-time rates
     * @param amount Amount to convert
     * @param fromCurrency Source currency
     * @param toCurrency Target currency
     * @returns Converted amount or null if conversion not possible
     */
    public static convertCurrency(amount: u128, fromCurrency: string, toCurrency: string): u128 | null {
        // Direct conversion
        const directRate = this.getFXRate(fromCurrency, toCurrency);
        if (directRate) {
            return this.applyConversion(amount, directRate);
        }
        
        // Inverse conversion
        const inverseRate = this.getFXRate(toCurrency, fromCurrency);
        if (inverseRate) {
            const invertedRate = this.inverseRate(inverseRate);
            return this.applyConversion(amount, invertedRate);
        }
        
        // Multi-hop conversion through USD
        if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
            const toUsdRate = this.getFXRate(fromCurrency, 'USD');
            const fromUsdRate = this.getFXRate('USD', toCurrency);
            
            if (toUsdRate && fromUsdRate) {
                const usdAmount = this.applyConversion(amount, toUsdRate);
                return this.applyConversion(usdAmount, fromUsdRate);
            }
        }
        
        return null;
    }
    
    /**
     * Gets multiple FX rates for batch operations
     * @param pairs Array of currency pairs
     * @returns Map of currency pairs to FX rates
     */
    public static getMultipleFXRates(pairs: string[]): Map<string, FXRate> {
        const rates = new Map<string, FXRate>();
        
        for (const pair of pairs) {
            const [base, quote] = pair.split('/');
            const rate = this.getFXRate(base, quote);
            if (rate) {
                rates.set(pair, rate);
            }
        }
        
        return rates;
    }
    
    /**
     * Calculates conversion with fees and spread
     * @param amount Amount to convert
     * @param rate FX rate
     * @param includeSpread Whether to include spread in calculation
     * @returns Converted amount
     */
    public static calculateConversionWithFees(
        amount: u128, 
        rate: FXRate, 
        includeSpread: boolean = true
    ): { convertedAmount: u128; spread: u128; totalCost: u128 } {
        const baseConversion = this.applyConversion(amount, rate);
        
        if (!includeSpread) {
            return {
                convertedAmount: baseConversion,
                spread: 0,
                totalCost: baseConversion
            };
        }
        
        // Apply spread (worst case for user)
        const spreadAmount = (baseConversion * rate.spread) / this.BASIS_POINTS_PRECISION;
        const totalWithSpread = baseConversion + spreadAmount;
        
        return {
            convertedAmount: baseConversion,
            spread: spreadAmount,
            totalCost: totalWithSpread
        };
    }
    
    /**
     * Validates FX rate data
     * @param rate FX rate to validate
     * @returns Validation result
     */
    public static validateFXRate(rate: FXRate): boolean {
        // Check if currencies are supported
        if (!this.currencies.has(rate.baseCurrency) || !this.currencies.has(rate.quoteCurrency)) {
            return false;
        }
        
        // Check if pair is active
        const pairKey = `${rate.baseCurrency}/${rate.quoteCurrency}`;
        const pair = this.fxPairs.get(pairKey);
        if (pair && !pair.isActive) {
            return false;
        }
        
        // Check rate value (must be positive)
        if (rate.rate <= 0) {
            return false;
        }
        
        // Check confidence level
        if (rate.confidence < this.CONFIDENCE_THRESHOLD) {
            return false;
        }
        
        // Check source
        if (!this.rateSources.has(rate.source)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Gets best available rate from multiple sources
     * @param baseCurrency Base currency
     * @param quoteCurrency Quote currency
     * @returns Best FX rate
     */
    public static getBestFXRate(baseCurrency: string, quoteCurrency: string): FXRate | null {
        const allRates = this.getAllRatesForPair(baseCurrency, quoteCurrency);
        
        if (allRates.length === 0) {
            return null;
        }
        
        // Sort by confidence and spread
        allRates.sort((a, b) => {
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence; // Higher confidence first
            }
            return a.spread - b.spread; // Lower spread first
        });
        
        return allRates[0];
    }
    
    /**
     * Calculates rate volatility for risk assessment
     * @param baseCurrency Base currency
     * @param quoteCurrency Quote currency
     * @param periodHours Period in hours for volatility calculation
     * @returns Volatility percentage
     */
    public static calculateVolatility(baseCurrency: string, quoteCurrency: string, periodHours: number = 24): number {
        // This would typically use historical rate data
        // For now, return a mock volatility calculation
        const currentRate = this.getFXRate(baseCurrency, quoteCurrency);
        if (!currentRate) {
            return 0;
        }
        
        // Mock volatility based on spread and confidence
        const baseVolatility = (currentRate.spread / this.BASIS_POINTS_PRECISION) * 100;
        const confidenceAdjustment = (255 - currentRate.confidence) / 255;
        
        return baseVolatility * (1 + confidenceAdjustment);
    }
    
    /**
     * Gets supported currency pairs
     * @returns Array of supported currency pairs
     */
    public static getSupportedPairs(): string[] {
        return Array.from(this.fxPairs.keys());
    }
    
    /**
     * Gets supported currencies
     * @returns Array of supported currencies
     */
    public static getSupportedCurrencies(): Currency[] {
        return Array.from(this.currencies.values());
    }
    
    /**
     * Clears stale FX rates
     * @returns Number of cleared rates
     */
    public static clearStaleRates(): number {
        let clearedCount = 0;
        const currentTime = Date.now() as u64;
        
        for (const [key, rate] of this.fxRates.entries()) {
            if (currentTime - rate.timestamp > this.RATE_STALENESS_SECONDS * 1000) {
                this.fxRates.delete(key);
                clearedCount++;
            }
        }
        
        return clearedCount;
    }
    
    // --- Private Helper Methods ---
    
    /**
     * Validates and calculates optimal spread
     * @param newRate New FX rate
     * @param existingRate Existing FX rate (if any)
     * @returns Optimal spread in basis points
     */
    private static calculateOptimalSpread(newRate: FXRate, existingRate?: FXRate): u128 {
        // Base spread calculation
        let spread = Math.min(newRate.spread, this.MAX_SPREAD_BP);
        
        // Adjust based on confidence
        const confidenceAdjustment = ((255 - newRate.confidence) / 255) * 5; // Max 5 BP adjustment
        spread += confidenceAdjustment;
        
        // Adjust based on volatility if we have historical data
        if (existingRate) {
            const rateChange = Math.abs(newRate.rate - existingRate.rate) / existingRate.rate;
            const volatilityAdjustment = Math.min(rateChange * 100, 10); // Max 10 BP adjustment
            spread += volatilityAdjustment;
        }
        
        // Ensure spread doesn't exceed maximum
        return Math.min(spread, this.MAX_SPREAD_BP) as u128;
    }
    
    /**
     * Applies FX rate conversion with proper precision
     * @param amount Amount to convert
     * @param rate FX rate
     * @returns Converted amount
     */
    private static applyConversion(amount: u128, rate: FXRate): u128 {
        return (amount * rate.rate) / this.RATE_PRECISION;
    }
    
    /**
     * Creates inverse FX rate
     * @param rate Original FX rate
     * @returns Inverse FX rate
     */
    private static inverseRate(rate: FXRate): FXRate {
        const inverseRateValue = (this.RATE_PRECISION * this.RATE_PRECISION) / rate.rate;
        
        return {
            baseCurrency: rate.quoteCurrency,
            quoteCurrency: rate.baseCurrency,
            rate: inverseRateValue,
            timestamp: rate.timestamp,
            spread: rate.spread,
            source: rate.source,
            confidence: rate.confidence
        };
    }
    
    /**
     * Checks if FX rate is stale
     * @param rate FX rate to check
     * @returns True if rate is stale
     */
    private static isRateStale(rate: FXRate): boolean {
        const currentTime = Date.now() as u64;
        return (currentTime - rate.timestamp) > (this.RATE_STALENESS_SECONDS * 1000);
    }
    
    /**
     * Gets all rates for a currency pair from different sources
     * @param baseCurrency Base currency
     * @param quoteCurrency Quote currency
     * @returns Array of FX rates
     */
    private static getAllRatesForPair(baseCurrency: string, quoteCurrency: string): FXRate[] {
        const rates: FXRate[] = [];
        
        // This would typically query multiple sources
        // For now, return the available rate
        const rate = this.getFXRate(baseCurrency, quoteCurrency);
        if (rate) {
            rates.push(rate);
        }
        
        return rates;
    }
    
    /**
     * Validates currency pair
     * @param baseCurrency Base currency
     * @param quoteCurrency Quote currency
     * @returns True if pair is valid
     */
    public static isValidPair(baseCurrency: string, quoteCurrency: string): boolean {
        const pairKey = `${baseCurrency}/${quoteCurrency}`;
        return this.fxPairs.has(pairKey) || this.fxPairs.has(`${quoteCurrency}/${baseCurrency}`);
    }
    
    /**
     * Gets rate statistics for monitoring
     * @param baseCurrency Base currency
     * @param quoteCurrency Quote currency
     * @returns Rate statistics
     */
    public static getRateStatistics(baseCurrency: string, quoteCurrency: string): {
        currentRate: u128 | null;
        spread: u128 | null;
        confidence: u8 | null;
        lastUpdate: u64 | null;
        volatility: number;
        sources: string[];
    } {
        const rate = this.getFXRate(baseCurrency, quoteCurrency);
        const volatility = this.calculateVolatility(baseCurrency, quoteCurrency);
        
        return {
            currentRate: rate?.rate || null,
            spread: rate?.spread || null,
            confidence: rate?.confidence || null,
            lastUpdate: rate?.timestamp || null,
            volatility,
            sources: rate ? [rate.source] : []
        };
    }
}
