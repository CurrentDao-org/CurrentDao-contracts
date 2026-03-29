"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeManager = void 0;
const FeeStructure_1 = require("./structures/FeeStructure");
const FeeCalculation_1 = require("./libraries/FeeCalculation");
/**
 * Comprehensive fee management system implementing IFeeManager
 * Supports multiple fee types, tiered structures, and dynamic adjustments
 */
class FeeManager {
    owner;
    paused = false;
    networkCongestionLevel = 0;
    // Storage
    feeStructures = new Map();
    feeDistributions = new Map();
    exemptions = new Map();
    userVolumes = new Map();
    feeHistory = new Map();
    userTiers = new Map(); // userAddress -> transactionType -> tier
    networkCongestionHistory = [];
    optimizationMetrics = {
        totalGasSaved: 0,
        averageCalculationTime: 0,
        batchEfficiency: 0,
        cacheHitRate: 0,
        lastOptimized: Date.now()
    };
    // Events
    onFeeCalculated;
    onFeeDistributed;
    onExemptionCreated;
    onExemptionRevoked;
    onNetworkCongestionUpdated;
    onFeeStructureUpdated;
    constructor(owner) {
        this.owner = owner;
        this.initializeDefaultStructures();
    }
    // --- Core fee calculation methods ---
    calculateFee(amount, userAddress, transactionType, networkCongestion) {
        this.requireNotPaused();
        const structure = this.getFeeStructure(transactionType);
        if (!structure) {
            throw new Error(`Fee structure not found for transaction type: ${transactionType}`);
        }
        const congestion = networkCongestion ?? this.networkCongestionLevel;
        const userTier = this.getUserTier(userAddress, transactionType);
        const userVolume = this.getUserVolume(userAddress, transactionType);
        const exemption = this.getBestExemption(userAddress, transactionType);
        const context = {
            userAddress,
            transactionType,
            amount,
            networkCongestion: congestion,
            userTier: userTier || undefined,
            exemption: exemption || undefined,
            userVolume,
            timestamp: Date.now()
        };
        const validation = FeeCalculation_1.FeeCalculation.validateParameters(structure, context);
        if (!validation.isValid) {
            throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
        }
        const result = FeeCalculation_1.FeeCalculation.calculateFee(structure, context);
        // Update optimization metrics
        this.updateOptimizationMetrics(result.gasEstimate);
        // Emit event
        this.onFeeCalculated?.(result);
        return result;
    }
    calculateFeeWithExemption(amount, userAddress, transactionType, exemptionId, networkCongestion) {
        let exemption;
        if (exemptionId) {
            exemption = this.getExemption(exemptionId) || undefined;
            if (!exemption || !this.isExemptionValid(exemptionId)) {
                throw new Error(`Invalid or expired exemption: ${exemptionId}`);
            }
        }
        const structure = this.getFeeStructure(transactionType);
        if (!structure) {
            throw new Error(`Fee structure not found for transaction type: ${transactionType}`);
        }
        const congestion = networkCongestion ?? this.networkCongestionLevel;
        const userTier = this.getUserTier(userAddress, transactionType);
        const userVolume = this.getUserVolume(userAddress, transactionType);
        const context = {
            userAddress,
            transactionType,
            amount,
            networkCongestion: congestion,
            userTier: userTier || undefined,
            exemption,
            userVolume,
            timestamp: Date.now()
        };
        const result = FeeCalculation_1.FeeCalculation.calculateFee(structure, context);
        this.updateOptimizationMetrics(result.gasEstimate);
        this.onFeeCalculated?.(result);
        return result;
    }
    // --- Fee structure management ---
    setFeeStructure(transactionType, structure) {
        this.requireOwner();
        this.requireNotPaused();
        structure.transactionType = transactionType;
        structure.updatedAt = Date.now();
        this.feeStructures.set(transactionType, structure);
        this.onFeeStructureUpdated?.(transactionType, structure);
    }
    getFeeStructure(transactionType) {
        return this.feeStructures.get(transactionType) || null;
    }
    updateFeeStructure(transactionType, updates) {
        this.requireOwner();
        this.requireNotPaused();
        const existing = this.getFeeStructure(transactionType);
        if (!existing) {
            throw new Error(`Fee structure not found for transaction type: ${transactionType}`);
        }
        const updated = {
            ...existing,
            ...updates,
            transactionType,
            updatedAt: Date.now()
        };
        this.feeStructures.set(transactionType, updated);
        this.onFeeStructureUpdated?.(transactionType, updated);
    }
    // --- Tier management ---
    addFeeTier(transactionType, tier) {
        this.requireOwner();
        this.requireNotPaused();
        const structure = this.getFeeStructure(transactionType);
        if (!structure) {
            throw new Error(`Fee structure not found for transaction type: ${transactionType}`);
        }
        structure.tiers.push(tier);
        structure.tiers.sort((a, b) => a.priority - b.priority);
        this.feeStructures.set(transactionType, structure);
        this.onFeeStructureUpdated?.(transactionType, structure);
    }
    removeFeeTier(transactionType, tierIndex) {
        this.requireOwner();
        this.requireNotPaused();
        const structure = this.getFeeStructure(transactionType);
        if (!structure) {
            throw new Error(`Fee structure not found for transaction type: ${transactionType}`);
        }
        if (tierIndex < 0 || tierIndex >= structure.tiers.length) {
            throw new Error(`Invalid tier index: ${tierIndex}`);
        }
        structure.tiers.splice(tierIndex, 1);
        this.feeStructures.set(transactionType, structure);
        this.onFeeStructureUpdated?.(transactionType, structure);
    }
    updateFeeTier(transactionType, tierIndex, updates) {
        this.requireOwner();
        this.requireNotPaused();
        const structure = this.getFeeStructure(transactionType);
        if (!structure) {
            throw new Error(`Fee structure not found for transaction type: ${transactionType}`);
        }
        if (tierIndex < 0 || tierIndex >= structure.tiers.length) {
            throw new Error(`Invalid tier index: ${tierIndex}`);
        }
        structure.tiers[tierIndex] = { ...structure.tiers[tierIndex], ...updates };
        this.feeStructures.set(transactionType, structure);
        this.onFeeStructureUpdated?.(transactionType, structure);
    }
    getUserTier(userAddress, transactionType) {
        const userTiers = this.userTiers.get(userAddress);
        if (!userTiers) {
            return null;
        }
        return userTiers.get(transactionType) || null;
    }
    setUserTier(userAddress, transactionType, tier) {
        this.requireOwner();
        if (!this.userTiers.has(userAddress)) {
            this.userTiers.set(userAddress, new Map());
        }
        this.userTiers.get(userAddress).set(transactionType, tier);
    }
    // --- Dynamic fee adjustment ---
    setNetworkCongestionLevel(congestionLevel) {
        this.requireOwner();
        if (congestionLevel < 0 || congestionLevel > 100) {
            throw new Error('Network congestion level must be between 0 and 100');
        }
        this.networkCongestionLevel = congestionLevel;
        // Record in history
        this.networkCongestionHistory.push({
            level: congestionLevel,
            timestamp: Date.now()
        });
        // Keep only last 1000 records
        if (this.networkCongestionHistory.length > 1000) {
            this.networkCongestionHistory = this.networkCongestionHistory.slice(-1000);
        }
        this.onNetworkCongestionUpdated?.(congestionLevel);
    }
    getNetworkCongestionLevel() {
        return this.networkCongestionLevel;
    }
    enableDynamicFees(transactionType, enabled) {
        this.requireOwner();
        this.requireNotPaused();
        const structure = this.getFeeStructure(transactionType);
        if (!structure) {
            throw new Error(`Fee structure not found for transaction type: ${transactionType}`);
        }
        structure.dynamicAdjustment.enabled = enabled;
        structure.updatedAt = Date.now();
        this.feeStructures.set(transactionType, structure);
        this.onFeeStructureUpdated?.(transactionType, structure);
    }
    isDynamicFeesEnabled(transactionType) {
        const structure = this.getFeeStructure(transactionType);
        return structure?.dynamicAdjustment.enabled || false;
    }
    // --- Fee distribution management ---
    setFeeDistribution(transactionType, distribution) {
        this.requireOwner();
        this.requireNotPaused();
        // Validate total percentage equals 100%
        if (distribution.totalPercentage !== 10000) {
            throw new Error('Total distribution percentage must equal 10000 (100%)');
        }
        this.feeDistributions.set(transactionType, distribution);
    }
    getFeeDistribution(transactionType) {
        return this.feeDistributions.get(transactionType) || null;
    }
    distributeFees(transactionType, totalFee) {
        this.requireNotPaused();
        const distribution = this.getFeeDistribution(transactionType);
        if (!distribution) {
            throw new Error(`Fee distribution not found for transaction type: ${transactionType}`);
        }
        const amounts = new Map();
        for (const recipient of distribution.recipients) {
            const amount = (totalFee * recipient.percentage) / 10000;
            amounts.set(recipient.address, amount);
        }
        this.onFeeDistributed?.(transactionType, amounts);
    }
    // --- Fee exemption management ---
    createExemption(userAddress, transactionType, exemptionType, value, expiresAt) {
        this.requireOwner();
        this.requireNotPaused();
        const exemptionId = `exemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const exemption = {
            id: exemptionId,
            userAddress,
            transactionType,
            exemptionType: exemptionType,
            value,
            createdAt: Date.now(),
            expiresAt,
            isActive: true,
            createdBy: this.owner
        };
        this.exemptions.set(exemptionId, exemption);
        this.onExemptionCreated?.(exemption);
        return exemptionId;
    }
    revokeExemption(exemptionId) {
        this.requireOwner();
        const exemption = this.exemptions.get(exemptionId);
        if (!exemption) {
            throw new Error(`Exemption not found: ${exemptionId}`);
        }
        exemption.isActive = false;
        this.exemptions.set(exemptionId, exemption);
        this.onExemptionRevoked?.(exemptionId);
    }
    getExemption(exemptionId) {
        return this.exemptions.get(exemptionId) || null;
    }
    getUserExemptions(userAddress) {
        return Array.from(this.exemptions.values())
            .filter(exemption => exemption.userAddress === userAddress && exemption.isActive);
    }
    isExemptionValid(exemptionId) {
        const exemption = this.getExemption(exemptionId);
        if (!exemption || !exemption.isActive) {
            return false;
        }
        if (exemption.expiresAt && exemption.expiresAt < Date.now()) {
            return false;
        }
        return true;
    }
    getBestExemption(userAddress, transactionType) {
        const userExemptions = this.getUserExemptions(userAddress)
            .filter(exemption => exemption.transactionType === transactionType || exemption.transactionType === '*')
            .filter(exemption => this.isExemptionValid(exemption.id));
        // Return the exemption with the highest value
        return userExemptions.sort((a, b) => b.value - a.value)[0];
    }
    // --- Historical tracking ---
    recordFeePayment(userAddress, transactionType, amount, feeAmount, tierUsed, networkCongestion) {
        const record = {
            id: `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userAddress,
            transactionType,
            amount,
            feeAmount,
            effectiveFeeRate: amount > 0 ? (feeAmount / amount) * 10000 : 0,
            tierUsed,
            networkCongestion,
            timestamp: Date.now(),
            discounts: [],
            gasUsed: 0
        };
        if (!this.feeHistory.has(userAddress)) {
            this.feeHistory.set(userAddress, []);
        }
        const userHistory = this.feeHistory.get(userAddress);
        userHistory.push(record);
        // Keep only last 1000 records per user
        if (userHistory.length > 1000) {
            userHistory.splice(0, userHistory.length - 1000);
        }
        this.feeHistory.set(userAddress, userHistory);
    }
    getUserFeeHistory(userAddress, limit) {
        const history = this.feeHistory.get(userAddress) || [];
        return limit ? history.slice(-limit) : history;
    }
    getFeeStatistics(transactionType, timeRange) {
        let totalFees = 0;
        let totalTransactions = 0;
        let volumeDiscounted = 0;
        for (const userHistory of this.feeHistory.values()) {
            for (const record of userHistory) {
                if (record.transactionType !== transactionType) {
                    continue;
                }
                if (timeRange && (record.timestamp < timeRange.start || record.timestamp > timeRange.end)) {
                    continue;
                }
                totalFees += record.feeAmount;
                totalTransactions++;
                if (record.discounts.some(d => d.type === 'VOLUME')) {
                    volumeDiscounted++;
                }
            }
        }
        return {
            totalFees,
            averageFee: totalTransactions > 0 ? totalFees / totalTransactions : 0,
            totalTransactions,
            volumeDiscounted
        };
    }
    // --- Volume and discount tracking ---
    updateUserVolume(userAddress, transactionType, amount) {
        const key = `${userAddress}_${transactionType}_monthly`;
        const existing = this.userVolumes.get(key);
        const record = {
            userAddress,
            transactionType,
            period: 'monthly',
            volume: (existing?.volume || 0) + amount,
            timestamp: Date.now(),
            lastUpdated: Date.now()
        };
        this.userVolumes.set(key, record);
    }
    getUserVolume(userAddress, transactionType, period = 'monthly') {
        const key = `${userAddress}_${transactionType}_${period}`;
        const record = this.userVolumes.get(key);
        if (!record) {
            return 0;
        }
        // Reset volume if period has expired
        const now = Date.now();
        const periodMs = period === 'daily' ? 24 * 60 * 60 * 1000 :
            period === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
                30 * 24 * 60 * 60 * 1000;
        if (now - record.lastUpdated > periodMs) {
            this.userVolumes.delete(key);
            return 0;
        }
        return record.volume;
    }
    calculateVolumeDiscount(userAddress, transactionType, baseFee) {
        const structure = this.getFeeStructure(transactionType);
        if (!structure) {
            return 0;
        }
        const userVolume = this.getUserVolume(userAddress, transactionType);
        const thresholds = structure.volumeThresholds.discountThresholds;
        let discount = 0;
        for (const threshold of thresholds) {
            if (userVolume >= threshold.volume) {
                discount = Math.max(discount, threshold.discount);
            }
        }
        return (baseFee * discount) / 10000;
    }
    // --- Gas optimization ---
    batchCalculateFees(requests) {
        this.requireNotPaused();
        const structures = [];
        const contexts = [];
        for (const request of requests) {
            const structure = this.getFeeStructure(request.transactionType);
            if (!structure) {
                throw new Error(`Fee structure not found for transaction type: ${request.transactionType}`);
            }
            structures.push(structure);
            const context = {
                userAddress: request.userAddress,
                transactionType: request.transactionType,
                amount: request.amount,
                networkCongestion: request.networkCongestion ?? this.networkCongestionLevel,
                userTier: this.getUserTier(request.userAddress, request.transactionType) || undefined,
                exemption: this.getBestExemption(request.userAddress, request.transactionType) || undefined,
                userVolume: this.getUserVolume(request.userAddress, request.transactionType),
                timestamp: Date.now()
            };
            contexts.push(context);
        }
        const results = FeeCalculation_1.FeeCalculation.batchCalculateFees(structures, contexts);
        // Update optimization metrics
        const totalGasSaved = results.reduce((sum, result) => sum + (result.gasEstimate * 0.3), 0);
        this.optimizationMetrics.totalGasSaved += totalGasSaved;
        this.optimizationMetrics.lastOptimized = Date.now();
        return results;
    }
    // --- Administrative functions ---
    pause() {
        this.requireOwner();
        this.paused = true;
    }
    unpause() {
        this.requireOwner();
        this.paused = false;
    }
    isPaused() {
        return this.paused;
    }
    transferOwnership(newOwner) {
        this.requireOwner();
        if (!newOwner) {
            throw new Error('New owner cannot be empty');
        }
        this.owner = newOwner;
    }
    getOwner() {
        return this.owner;
    }
    // --- Private helper methods ---
    requireOwner() {
        // In a real implementation, this would check the caller's address
        // For now, we'll assume this is called by the owner
    }
    requireNotPaused() {
        if (this.paused) {
            throw new Error('Contract is paused');
        }
    }
    initializeDefaultStructures() {
        // Initialize default fee structures
        for (const [transactionType, defaultStructure] of Object.entries(FeeStructure_1.DEFAULT_FEE_STRUCTURES)) {
            const structure = {
                id: `default_${transactionType}`,
                transactionType,
                feeType: defaultStructure.feeType,
                baseFee: defaultStructure.baseFee,
                percentageFee: defaultStructure.percentageFee,
                minFee: defaultStructure.minFee,
                maxFee: defaultStructure.maxFee,
                tiers: defaultStructure.tiers || [],
                dynamicAdjustment: defaultStructure.dynamicAdjustment,
                volumeThresholds: defaultStructure.volumeThresholds,
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            this.feeStructures.set(transactionType, structure);
        }
        // Initialize default fee distributions
        for (const [transactionType, distribution] of Object.entries(FeeStructure_1.DEFAULT_FEE_DISTRIBUTION)) {
            this.feeDistributions.set(transactionType, distribution);
        }
    }
    updateOptimizationMetrics(gasEstimate) {
        this.optimizationMetrics.averageCalculationTime =
            (this.optimizationMetrics.averageCalculationTime + Date.now()) / 2;
    }
    // --- Public getters for monitoring ---
    getOptimizationMetrics() {
        return { ...this.optimizationMetrics };
    }
    getNetworkCongestionHistory(limit) {
        return limit ? this.networkCongestionHistory.slice(-limit) : this.networkCongestionHistory;
    }
    getAllFeeStructures() {
        return new Map(this.feeStructures);
    }
    getAllFeeDistributions() {
        return new Map(this.feeDistributions);
    }
    getAllExemptions() {
        return new Map(this.exemptions);
    }
}
exports.FeeManager = FeeManager;
//# sourceMappingURL=FeeManager.js.map