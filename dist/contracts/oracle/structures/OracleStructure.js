"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleConfig = exports.DeviationThreshold = exports.AggregationResult = exports.PriceDataPoint = exports.PriceHistory = exports.PriceFeed = exports.OracleMetadata = exports.Oracle = exports.OracleRegistry = void 0;
class OracleRegistry {
    oracles;
    activeOracles;
    assetOracles;
    constructor() {
        this.oracles = {};
        this.activeOracles = {};
        this.assetOracles = {};
    }
}
exports.OracleRegistry = OracleRegistry;
class Oracle {
    id;
    metadata;
    reputation;
    isActive;
    lastSubmission;
    totalSubmissions;
    successfulSubmissions;
    slashCount;
    registeredAt;
    constructor(id, metadata, initialReputation = 100) {
        this.id = id;
        this.metadata = metadata;
        this.reputation = initialReputation;
        this.isActive = true;
        this.lastSubmission = 0;
        this.totalSubmissions = 0;
        this.successfulSubmissions = 0;
        this.slashCount = 0;
        this.registeredAt = Date.now();
    }
    getSuccessRate() {
        if (this.totalSubmissions === 0)
            return 0;
        return (this.successfulSubmissions * 100) / this.totalSubmissions;
    }
    getWeight() {
        // Weight based on reputation and success rate
        const baseWeight = this.reputation > 0 ? this.reputation : 0;
        const successBonus = this.getSuccessRate() / 10;
        return baseWeight + successBonus;
    }
    canSubmit(minDelay) {
        const now = Date.now();
        return this.isActive &&
            (now - this.lastSubmission) >= minDelay &&
            this.reputation > 0;
    }
}
exports.Oracle = Oracle;
class OracleMetadata {
    name;
    description;
    website;
    contact;
    fee;
    minDelay;
    supportedAssets;
    constructor(name, description, website, contact, fee, minDelay, supportedAssets) {
        this.name = name;
        this.description = description;
        this.website = website;
        this.contact = contact;
        this.fee = fee;
        this.minDelay = minDelay;
        this.supportedAssets = supportedAssets;
    }
}
exports.OracleMetadata = OracleMetadata;
class PriceFeed {
    oracleId;
    assetId;
    price;
    timestamp;
    signature;
    isValid;
    deviationScore;
    constructor(oracleId, assetId, price, timestamp, signature) {
        this.oracleId = oracleId;
        this.assetId = assetId;
        this.price = price;
        this.timestamp = timestamp;
        this.signature = signature;
        this.isValid = false;
        this.deviationScore = 0;
    }
    isExpired(maxAge) {
        const now = Date.now();
        return (now - this.timestamp) > maxAge;
    }
}
exports.PriceFeed = PriceFeed;
class PriceHistory {
    assetId;
    dataPoints;
    maxSize;
    constructor(assetId, maxSize = 1000) {
        this.assetId = assetId;
        this.dataPoints = [];
        this.maxSize = maxSize;
    }
    addDataPoint(dataPoint) {
        this.dataPoints.push(dataPoint);
        if (this.dataPoints.length > this.maxSize) {
            this.dataPoints.shift();
        }
    }
    getLatestPrice() {
        if (this.dataPoints.length === 0)
            return 0n;
        return this.dataPoints[this.dataPoints.length - 1].price;
    }
    getPriceAt(timestamp) {
        for (let i = this.dataPoints.length - 1; i >= 0; i--) {
            if (this.dataPoints[i].timestamp <= timestamp) {
                return this.dataPoints[i].price;
            }
        }
        return 0n;
    }
    getAveragePrice(fromTimestamp, toTimestamp) {
        let sum = 0n;
        let count = 0;
        for (const dataPoint of this.dataPoints) {
            if (dataPoint.timestamp >= fromTimestamp &&
                dataPoint.timestamp <= toTimestamp &&
                dataPoint.isValid) {
                sum += BigInt(dataPoint.price);
                count++;
            }
        }
        return count > 0 ? sum / BigInt(count) : 0n;
    }
}
exports.PriceHistory = PriceHistory;
class PriceDataPoint {
    price;
    timestamp;
    oracleId;
    isValid;
    weight;
    constructor(price, timestamp, oracleId, isValid, weight = 1) {
        this.price = price;
        this.timestamp = timestamp;
        this.oracleId = oracleId;
        this.isValid = isValid;
        this.weight = weight;
    }
}
exports.PriceDataPoint = PriceDataPoint;
class AggregationResult {
    weightedPrice;
    totalWeight;
    participatingOracles;
    standardDeviation;
    isValid;
    confidence;
    constructor() {
        this.weightedPrice = 0n;
        this.totalWeight = 0;
        this.participatingOracles = 0;
        this.standardDeviation = 0n;
        this.isValid = false;
        this.confidence = 0;
    }
    calculateConfidence() {
        if (this.participatingOracles === 0)
            return 0;
        // Confidence based on number of oracles and standard deviation
        const oracleConfidence = Math.min(this.participatingOracles * 10, 100);
        const deviationPenalty = Math.min(Number(this.standardDeviation) / 100, 50);
        return Math.max(oracleConfidence - deviationPenalty, 0);
    }
}
exports.AggregationResult = AggregationResult;
class DeviationThreshold {
    assetId;
    maxDeviationPercent;
    windowSize;
    minSamples;
    constructor(assetId, maxDeviationPercent = 500, // 5%
    windowSize = 3600, // 1 hour
    minSamples = 3) {
        this.assetId = assetId;
        this.maxDeviationPercent = maxDeviationPercent;
        this.windowSize = windowSize;
        this.minSamples = minSamples;
    }
}
exports.DeviationThreshold = DeviationThreshold;
class OracleConfig {
    maxOraclesPerAsset;
    minReputationThreshold;
    maxPriceAge;
    aggregationInterval;
    slashThreshold;
    rewardMultiplier;
    automatedUpdates;
    constructor() {
        this.maxOraclesPerAsset = 10;
        this.minReputationThreshold = 50;
        this.maxPriceAge = 300; // 5 minutes
        this.aggregationInterval = 300; // 5 minutes
        this.slashThreshold = 1000; // 10%
        this.rewardMultiplier = 1000000n; // For precision
        this.automatedUpdates = false; // Disabled by default
    }
}
exports.OracleConfig = OracleConfig;
//# sourceMappingURL=OracleStructure.js.map