import { FeeStructure, FeeCalculationContext } from '../structures/FeeStructure';
export interface FeeCalculationResult {
    totalFee: number;
    baseFee: number;
    dynamicAdjustment: number;
    volumeDiscount: number;
    exemptionDiscount: number;
    effectiveRate: number;
    tierUsed?: string;
    breakdown: {
        fixed: number;
        percentage: number;
        adjustments: Array<{
            type: 'DYNAMIC' | 'VOLUME' | 'EXEMPTION';
            amount: number;
            description: string;
        }>;
    };
    gasEstimate: number;
}
export declare class FeeCalculation {
    private static readonly BASIS_POINTS;
    private static readonly GAS_BASE;
    private static readonly GAS_PER_CALCULATION;
    /**
     * Calculate fee based on structure, context, and various adjustments
     */
    static calculateFee(structure: FeeStructure, context: FeeCalculationContext): FeeCalculationResult;
    /**
     * Calculate base fee without any adjustments
     */
    private static calculateBaseFee;
    /**
     * Calculate tiered fee based on volume tiers
     */
    private static calculateTieredFee;
    /**
     * Calculate dynamic adjustment based on network congestion
     */
    private static calculateDynamicAdjustment;
    /**
     * Calculate volume discount for user
     */
    private static calculateVolumeDiscount;
    /**
     * Calculate exemption discount
     */
    private static calculateExemptionDiscount;
    /**
     * Estimate gas cost for fee calculation
     */
    private static estimateGasCost;
    /**
     * Batch calculate fees for multiple transactions (gas optimization)
     */
    static batchCalculateFees(structures: FeeStructure[], contexts: FeeCalculationContext[]): FeeCalculationResult[];
    /**
     * Optimize fee calculation for common scenarios
     */
    static optimizeFeeCalculation(structure: FeeStructure, contexts: FeeCalculationContext[]): {
        results: FeeCalculationResult[];
        optimizationMetrics: any;
    };
    /**
     * Group contexts by similar properties for batch optimization
     */
    private static groupContextsBySimilarity;
    /**
     * Validate fee calculation parameters
     */
    static validateParameters(structure: FeeStructure, context: FeeCalculationContext): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=FeeCalculation.d.ts.map