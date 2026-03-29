/**
 * Comprehensive fee structure definitions for the fee management system
 */
export declare enum FeeType {
    FIXED = "FIXED",
    PERCENTAGE = "PERCENTAGE",
    TIERED = "TIERED",
    HYBRID = "HYBRID"
}
export declare enum ExemptionType {
    PERCENTAGE = "PERCENTAGE",
    FIXED = "FIXED",
    FULL = "FULL"
}
export interface FeeTier {
    id: string;
    name: string;
    minVolume: number;
    maxVolume?: number;
    discountPercentage: number;
    priority: number;
}
export interface FeeStructure {
    id: string;
    transactionType: string;
    feeType: FeeType;
    baseFee: number;
    percentageFee: number;
    minFee: number;
    maxFee: number;
    tiers: FeeTier[];
    dynamicAdjustment: {
        enabled: boolean;
        minRate: number;
        maxRate: number;
        congestionMultiplier: number;
    };
    volumeThresholds: {
        discountThresholds: Array<{
            volume: number;
            discount: number;
        }>;
        resetPeriod: 'daily' | 'weekly' | 'monthly';
    };
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
}
export interface FeeDistribution {
    transactionType: string;
    recipients: Array<{
        address: string;
        percentage: number;
        name: string;
    }>;
    totalPercentage: number;
}
export interface FeeExemption {
    id: string;
    userAddress: string;
    transactionType: string;
    exemptionType: ExemptionType;
    value: number;
    createdAt: number;
    expiresAt?: number;
    isActive: boolean;
    reason?: string;
    createdBy: string;
}
export interface HistoricalFeeRecord {
    id: string;
    userAddress: string;
    transactionType: string;
    amount: number;
    feeAmount: number;
    effectiveFeeRate: number;
    tierUsed: string;
    networkCongestion: number;
    timestamp: number;
    discounts: Array<{
        type: 'VOLUME' | 'EXEMPTION' | 'DYNAMIC';
        amount: number;
        description: string;
    }>;
    gasUsed: number;
}
export interface UserVolumeRecord {
    userAddress: string;
    transactionType: string;
    period: 'daily' | 'weekly' | 'monthly';
    volume: number;
    timestamp: number;
    lastUpdated: number;
}
export interface NetworkCongestionData {
    level: number;
    timestamp: number;
    blockHeight?: number;
    gasPrice?: number;
    tps?: number;
}
export interface FeeCalculationContext {
    userAddress: string;
    transactionType: string;
    amount: number;
    networkCongestion: number;
    userTier?: FeeTier;
    exemption?: FeeExemption;
    userVolume: number;
    timestamp: number;
}
export interface FeeOptimizationMetrics {
    totalGasSaved: number;
    averageCalculationTime: number;
    batchEfficiency: number;
    cacheHitRate: number;
    lastOptimized: number;
}
export declare const DEFAULT_FEE_STRUCTURES: Record<string, Partial<FeeStructure>>;
export declare const DEFAULT_FEE_DISTRIBUTION: Record<string, FeeDistribution>;
//# sourceMappingURL=FeeStructure.d.ts.map