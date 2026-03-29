import { IFeeManager } from './interfaces/IFeeManager';
import { FeeStructure, FeeTier, FeeDistribution, FeeExemption, HistoricalFeeRecord, NetworkCongestionData, FeeOptimizationMetrics } from './structures/FeeStructure';
import { FeeCalculationResult } from './libraries/FeeCalculation';
/**
 * Comprehensive fee management system implementing IFeeManager
 * Supports multiple fee types, tiered structures, and dynamic adjustments
 */
export declare class FeeManager implements IFeeManager {
    private owner;
    private paused;
    private networkCongestionLevel;
    private feeStructures;
    private feeDistributions;
    private exemptions;
    private userVolumes;
    private feeHistory;
    private userTiers;
    private networkCongestionHistory;
    private optimizationMetrics;
    onFeeCalculated?: (result: FeeCalculationResult) => void;
    onFeeDistributed?: (transactionType: string, amounts: Map<string, number>) => void;
    onExemptionCreated?: (exemption: FeeExemption) => void;
    onExemptionRevoked?: (exemptionId: string) => void;
    onNetworkCongestionUpdated?: (newLevel: number) => void;
    onFeeStructureUpdated?: (transactionType: string, structure: FeeStructure) => void;
    constructor(owner: string);
    calculateFee(amount: number, userAddress: string, transactionType: string, networkCongestion?: number): FeeCalculationResult;
    calculateFeeWithExemption(amount: number, userAddress: string, transactionType: string, exemptionId?: string, networkCongestion?: number): FeeCalculationResult;
    setFeeStructure(transactionType: string, structure: FeeStructure): void;
    getFeeStructure(transactionType: string): FeeStructure | null;
    updateFeeStructure(transactionType: string, updates: Partial<FeeStructure>): void;
    addFeeTier(transactionType: string, tier: FeeTier): void;
    removeFeeTier(transactionType: string, tierIndex: number): void;
    updateFeeTier(transactionType: string, tierIndex: number, updates: Partial<FeeTier>): void;
    getUserTier(userAddress: string, transactionType: string): FeeTier | null;
    setUserTier(userAddress: string, transactionType: string, tier: FeeTier): void;
    setNetworkCongestionLevel(congestionLevel: number): void;
    getNetworkCongestionLevel(): number;
    enableDynamicFees(transactionType: string, enabled: boolean): void;
    isDynamicFeesEnabled(transactionType: string): boolean;
    setFeeDistribution(transactionType: string, distribution: FeeDistribution): void;
    getFeeDistribution(transactionType: string): FeeDistribution | null;
    distributeFees(transactionType: string, totalFee: number): void;
    createExemption(userAddress: string, transactionType: string, exemptionType: 'PERCENTAGE' | 'FIXED' | 'FULL', value: number, expiresAt?: number): string;
    revokeExemption(exemptionId: string): void;
    getExemption(exemptionId: string): FeeExemption | null;
    getUserExemptions(userAddress: string): FeeExemption[];
    isExemptionValid(exemptionId: string): boolean;
    private getBestExemption;
    recordFeePayment(userAddress: string, transactionType: string, amount: number, feeAmount: number, tierUsed: string, networkCongestion: number): void;
    getUserFeeHistory(userAddress: string, limit?: number): HistoricalFeeRecord[];
    getFeeStatistics(transactionType: string, timeRange?: {
        start: number;
        end: number;
    }): {
        totalFees: number;
        averageFee: number;
        totalTransactions: number;
        volumeDiscounted: number;
    };
    updateUserVolume(userAddress: string, transactionType: string, amount: number): void;
    getUserVolume(userAddress: string, transactionType: string, period?: 'daily' | 'weekly' | 'monthly'): number;
    calculateVolumeDiscount(userAddress: string, transactionType: string, baseFee: number): number;
    batchCalculateFees(requests: Array<{
        amount: number;
        userAddress: string;
        transactionType: string;
        networkCongestion?: number;
    }>): FeeCalculationResult[];
    pause(): void;
    unpause(): void;
    isPaused(): boolean;
    transferOwnership(newOwner: string): void;
    getOwner(): string;
    private requireOwner;
    private requireNotPaused;
    private initializeDefaultStructures;
    private updateOptimizationMetrics;
    getOptimizationMetrics(): FeeOptimizationMetrics;
    getNetworkCongestionHistory(limit?: number): NetworkCongestionData[];
    getAllFeeStructures(): Map<string, FeeStructure>;
    getAllFeeDistributions(): Map<string, FeeDistribution>;
    getAllExemptions(): Map<string, FeeExemption>;
}
//# sourceMappingURL=FeeManager.d.ts.map