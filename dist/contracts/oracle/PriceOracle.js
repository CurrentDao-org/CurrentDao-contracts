"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceOracle = void 0;
const OracleStructure_1 = require("./structures/OracleStructure");
const AggregationLib_1 = require("./libraries/AggregationLib");
class PriceOracle {
    registry;
    priceHistories;
    deviationThresholds;
    config;
    owner;
    paused;
    lastAggregationTime;
    constructor(owner) {
        this.owner = owner;
        this.registry = new OracleStructure_1.OracleRegistry();
        this.priceHistories = {};
        this.deviationThresholds = {};
        this.config = new OracleStructure_1.OracleConfig();
        this.paused = false;
        this.lastAggregationTime = {};
    }
    // --- Core Price Feed Methods ---
    submitPriceFeed(oracleId, price, timestamp, signature) {
        this.requireNotPaused();
        this.requireValidOracle(oracleId);
        const oracle = this.registry.oracles[oracleId];
        this.requireOracleCanSubmit(oracle, timestamp);
        const feed = new OracleStructure_1.PriceFeed(oracleId, this.getAssetIdFromOracle(oracleId), price, timestamp, signature);
        // Validate the price feed
        feed.isValid = this.validatePriceFeed(price, oracleId);
        if (feed.isValid) {
            // Store the price feed
            this.storePriceFeed(feed);
            // Update oracle statistics
            this.updateOracleStats(oracle, true);
            // Check for aggregation trigger
            this.checkAggregationTrigger(feed.assetId);
            // Emit event
            this.emitPriceFeedSubmitted(oracleId, feed.assetId, price, timestamp);
        }
        else {
            // Handle invalid submission
            this.handleInvalidSubmission(oracle, feed);
        }
    }
    getCurrentPrice(assetId) {
        const history = this.priceHistories[assetId];
        if (!history) {
            return 0n;
        }
        return history.getLatestPrice();
    }
    getHistoricalPrice(assetId, timestamp) {
        const history = this.priceHistories[assetId];
        if (!history) {
            return 0n;
        }
        return history.getPriceAt(timestamp);
    }
    // --- Oracle Management ---
    registerOracle(oracleAddress, metadata) {
        this.requireOwner();
        this.requireNotPaused();
        if (this.registry.oracles[oracleAddress]) {
            throw new Error("Oracle already registered");
        }
        const oracle = new OracleStructure_1.Oracle(oracleAddress, metadata);
        this.registry.oracles[oracleAddress] = oracle;
        this.registry.activeOracles[oracleAddress] = true;
        // Add oracle to supported assets
        for (const assetId of metadata.supportedAssets) {
            if (!this.registry.assetOracles[assetId]) {
                this.registry.assetOracles[assetId] = [];
            }
            const assetOracles = this.registry.assetOracles[assetId];
            if (assetOracles.length >= this.config.maxOraclesPerAsset) {
                throw new Error("Maximum oracles reached for asset");
            }
            if (!assetOracles.includes(oracleAddress)) {
                assetOracles.push(oracleAddress);
            }
            // Initialize price history if needed
            if (!this.priceHistories[assetId]) {
                this.priceHistories[assetId] = new OracleStructure_1.PriceHistory(assetId);
            }
            // Initialize deviation threshold if needed
            if (!this.deviationThresholds[assetId]) {
                this.deviationThresholds[assetId] = new OracleStructure_1.DeviationThreshold(assetId);
            }
        }
        this.emitOracleRegistered(oracleAddress, metadata);
    }
    updateOracleReputation(oracleId, reputationDelta) {
        this.requireOwner();
        const oracle = this.registry.oracles[oracleId];
        if (!oracle) {
            throw new Error("Oracle not found");
        }
        const newReputation = oracle.reputation + reputationDelta;
        // Deactivate if reputation falls below threshold
        if (newReputation < this.config.minReputationThreshold) {
            oracle.isActive = false;
            this.registry.activeOracles[oracleId] = false;
        }
        oracle.reputation = newReputation;
        this.emitOracleReputationUpdated(oracleId, newReputation);
    }
    deactivateOracle(oracleId) {
        this.requireOwner();
        const oracle = this.registry.oracles[oracleId];
        if (!oracle) {
            throw new Error("Oracle not found");
        }
        oracle.isActive = false;
        this.registry.activeOracles[oracleId] = false;
    }
    // --- Aggregation and Validation ---
    getAggregatedPrice(assetId) {
        const history = this.priceHistories[assetId];
        if (!history) {
            return 0n;
        }
        const assetOracles = this.registry.assetOracles[assetId];
        if (!assetOracles || assetOracles.length === 0) {
            return 0n;
        }
        // Get recent price feeds from active oracles
        const recentFeeds = [];
        const now = Date.now();
        for (const oracleId of assetOracles) {
            const oracle = this.registry.oracles[oracleId];
            if (!oracle || !oracle.isActive)
                continue;
            // Get the latest feed from this oracle
            const latestFeed = this.getLatestFeedFromOracle(oracleId, assetId);
            if (latestFeed &&
                latestFeed.isValid &&
                (now - latestFeed.timestamp) <= this.config.maxPriceAge * 1000) {
                recentFeeds.push(latestFeed);
            }
        }
        // Calculate aggregated price
        const result = AggregationLib_1.AggregationLib.calculateWeightedAverage(recentFeeds, this.registry.oracles);
        if (result.isValid) {
            return result.weightedPrice;
        }
        return 0n;
    }
    validatePriceFeed(price, oracleId) {
        const oracle = this.registry.oracles[oracleId];
        if (!oracle) {
            return false;
        }
        // Get other recent feeds for comparison
        const otherFeeds = this.getOtherRecentFeeds(oracleId, oracle.metadata.supportedAssets[0]);
        // Use aggregation library to validate
        return AggregationLib_1.AggregationLib.validatePriceFeed(new OracleStructure_1.PriceFeed(oracleId, oracle.metadata.supportedAssets[0], price, Date.now(), new Uint8Array()), otherFeeds, this.config.slashThreshold);
    }
    detectPriceDeviation(assetId, newPrice) {
        const history = this.priceHistories[assetId];
        const threshold = this.deviationThresholds[assetId];
        if (!history || !threshold) {
            return false;
        }
        return AggregationLib_1.AggregationLib.detectPriceDeviation(newPrice, history, threshold);
    }
    // --- Query Methods ---
    getOracleInfo(oracleId) {
        const oracle = this.registry.oracles[oracleId];
        if (!oracle) {
            throw new Error("Oracle not found");
        }
        return {
            oracleId: oracle.id,
            metadata: oracle.metadata,
            reputation: oracle.reputation,
            isActive: oracle.isActive,
            lastSubmission: oracle.lastSubmission,
            totalSubmissions: oracle.totalSubmissions,
            successfulSubmissions: oracle.successfulSubmissions
        };
    }
    getActiveOracles() {
        return Object.keys(this.registry.activeOracles).filter(oracleId => this.registry.activeOracles[oracleId]);
    }
    getPriceHistory(assetId, fromTimestamp, toTimestamp) {
        const history = this.priceHistories[assetId];
        if (!history) {
            return [];
        }
        return history.dataPoints.filter(point => point.timestamp >= fromTimestamp && point.timestamp <= toTimestamp);
    }
    // --- Admin Functions ---
    pause() {
        this.requireOwner();
        this.paused = true;
    }
    unpause() {
        this.requireOwner();
        this.paused = false;
    }
    updateConfig(newConfig) {
        this.requireOwner();
        Object.assign(this.config, newConfig);
    }
    setDeviationThreshold(assetId, threshold) {
        this.requireOwner();
        this.deviationThresholds[assetId] = threshold;
    }
    // --- Internal Helper Functions ---
    requireOwner() {
        // In a real implementation, this would check msg.sender
        // For now, we'll assume the check is done elsewhere
    }
    requireNotPaused() {
        if (this.paused) {
            throw new Error("Contract is paused");
        }
    }
    requireValidOracle(oracleId) {
        const oracle = this.registry.oracles[oracleId];
        if (!oracle) {
            throw new Error("Oracle not registered");
        }
        if (!oracle.isActive) {
            throw new Error("Oracle is not active");
        }
    }
    requireOracleCanSubmit(oracle, timestamp) {
        if (!oracle.canSubmit(oracle.metadata.minDelay)) {
            throw new Error("Oracle cannot submit yet");
        }
    }
    getAssetIdFromOracle(oracleId) {
        const oracle = this.registry.oracles[oracleId];
        if (!oracle || oracle.metadata.supportedAssets.length === 0) {
            throw new Error("No supported assets for oracle");
        }
        return oracle.metadata.supportedAssets[0];
    }
    storePriceFeed(feed) {
        const history = this.priceHistories[feed.assetId];
        if (!history) {
            throw new Error("Price history not found for asset");
        }
        const dataPoint = new IPriceOracle_1.PriceDataPoint(feed.price, feed.timestamp, feed.oracleId, feed.isValid, this.registry.oracles[feed.oracleId]?.getWeight() || 0);
        history.addDataPoint(dataPoint);
    }
    updateOracleStats(oracle, success) {
        oracle.totalSubmissions++;
        oracle.lastSubmission = Date.now();
        if (success) {
            oracle.successfulSubmissions++;
        }
    }
    checkAggregationTrigger(assetId) {
        const now = Date.now();
        const lastAggregation = this.lastAggregationTime[assetId] || 0;
        // Automated aggregation every 5 minutes (300 seconds)
        if ((now - lastAggregation) >= this.config.aggregationInterval * 1000) {
            this.performAggregation(assetId);
            this.lastAggregationTime[assetId] = now;
            // Schedule next aggregation if automated updates are enabled
            if (this.config.automatedUpdates) {
                this.scheduleNextAggregation(assetId);
            }
        }
    }
    scheduleNextAggregation(assetId) {
        // In a real implementation, this would use a blockchain timer or external keeper
        // For now, we'll use setTimeout for demonstration
        setTimeout(() => {
            if (!this.paused) {
                this.checkAggregationTrigger(assetId);
            }
        }, this.config.aggregationInterval * 1000);
    }
    /**
     * Force immediate aggregation for an asset
     */
    forceAggregation(assetId) {
        this.requireNotPaused();
        this.performAggregation(assetId);
        this.lastAggregationTime[assetId] = Date.now();
    }
    /**
     * Enable automated price updates
     */
    enableAutomatedUpdates() {
        this.requireOwner();
        this.config.automatedUpdates = true;
        // Start aggregation for all supported assets
        for (const assetId in this.registry.assetOracles) {
            this.scheduleNextAggregation(assetId);
        }
    }
    /**
     * Disable automated price updates
     */
    disableAutomatedUpdates() {
        this.requireOwner();
        this.config.automatedUpdates = false;
    }
    performAggregation(assetId) {
        const aggregatedPrice = this.getAggregatedPrice(assetId);
        if (aggregatedPrice > 0n) {
            const history = this.priceHistories[assetId];
            const dataPoint = new IPriceOracle_1.PriceDataPoint(aggregatedPrice, Date.now(), "AGGREGATION", true, 100 // High weight for aggregated prices
            );
            history.addDataPoint(dataPoint);
            this.emitPriceAggregated(assetId, aggregatedPrice, dataPoint.timestamp);
        }
    }
    getLatestFeedFromOracle(oracleId, assetId) {
        const history = this.priceHistories[assetId];
        if (!history) {
            return null;
        }
        // Find the latest data point from this oracle
        for (let i = history.dataPoints.length - 1; i >= 0; i--) {
            const point = history.dataPoints[i];
            if (point.oracleId === oracleId) {
                return new OracleStructure_1.PriceFeed(oracleId, assetId, point.price, point.timestamp, new Uint8Array());
            }
        }
        return null;
    }
    getOtherRecentFeeds(excludeOracleId, assetId) {
        const history = this.priceHistories[assetId];
        if (!history) {
            return [];
        }
        const now = Date.now();
        const feeds = [];
        for (const point of history.dataPoints) {
            if (point.oracleId !== excludeOracleId &&
                point.isValid &&
                (now - point.timestamp) <= this.config.maxPriceAge * 1000) {
                feeds.push(new OracleStructure_1.PriceFeed(point.oracleId, assetId, point.price, point.timestamp, new Uint8Array()));
            }
        }
        return feeds;
    }
    handleInvalidSubmission(oracle, feed) {
        oracle.slashCount++;
        this.updateOracleStats(oracle, false);
        // Check if oracle should be slashed
        if (oracle.slashCount >= 3) {
            this.updateOracleReputation(oracle.id, -50);
        }
        this.emitSuspiciousPriceDetected(oracle.id, feed.assetId, feed.price, 0);
    }
    // --- Events ---
    emitPriceFeedSubmitted(oracleId, assetId, price, timestamp) {
        // In a real implementation, this would emit an event
        console.log(`PriceFeedSubmitted: ${oracleId}, ${assetId}, ${price}, ${timestamp}`);
    }
    emitPriceAggregated(assetId, aggregatedPrice, timestamp) {
        // In a real implementation, this would emit an event
        console.log(`PriceAggregated: ${assetId}, ${aggregatedPrice}, ${timestamp}`);
    }
    emitOracleRegistered(oracleId, metadata) {
        // In a real implementation, this would emit an event
        console.log(`OracleRegistered: ${oracleId}, ${metadata.name}`);
    }
    emitOracleReputationUpdated(oracleId, newReputation) {
        // In a real implementation, this would emit an event
        console.log(`OracleReputationUpdated: ${oracleId}, ${newReputation}`);
    }
    emitSuspiciousPriceDetected(oracleId, assetId, price, deviation) {
        // In a real implementation, this would emit an event
        console.log(`SuspiciousPriceDetected: ${oracleId}, ${assetId}, ${price}, ${deviation}`);
    }
}
exports.PriceOracle = PriceOracle;
//# sourceMappingURL=PriceOracle.js.map