"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiChainLiquidityPool = void 0;
const LiquidityLib_1 = require("./libraries/LiquidityLib");
const CrossChainBridge_1 = require("./bridges/CrossChainBridge");
const RebalancingEngine_1 = require("./rebalancing/RebalancingEngine");
class MultiChainLiquidityPool {
    chains;
    positions;
    bridgeEngine;
    rebalancingEngine;
    totalVolume = 0;
    rewardPool = 0;
    isEmergency = false;
    rewardRate = 0.05; // 5% annual reward rate (simulated)
    constructor(initialChains) {
        this.chains = new Map();
        initialChains.forEach(c => this.chains.set(c.chainId, c));
        this.positions = new Map();
        this.bridgeEngine = new CrossChainBridge_1.CrossChainBridge(this.chains);
        this.rebalancingEngine = new RebalancingEngine_1.RebalancingEngine(this.chains);
    }
    /**
     * Deposits liquidity into a specific chain.
     */
    async deposit(provider, chainId, amount) {
        if (this.isEmergency)
            throw new Error("Contract is in emergency mode.");
        const chain = this.chains.get(chainId);
        if (!chain || !chain.active)
            throw new Error("Invalid or inactive chain.");
        chain.currentLiquidity += amount;
        const providerPositions = this.positions.get(provider) || [];
        providerPositions.push({
            provider,
            chainId,
            amount,
            entryPrice: 1000, // Simulated entry price
            timestamp: Date.now(),
            rewardDebt: 0
        });
        this.positions.set(provider, providerPositions);
    }
    /**
     * Withdraws liquidity from a specific chain, including IL protection.
     */
    async withdraw(provider, chainId, amount) {
        if (this.isEmergency)
            throw new Error("Use emergencyWithdraw during emergency mode.");
        const providerPositions = this.positions.get(provider);
        if (!providerPositions)
            throw new Error("No positions found for provider.");
        const chain = this.chains.get(chainId);
        if (!chain || chain.currentLiquidity < amount)
            throw new Error("Insufficient liquidity on chain.");
        const posIndex = providerPositions.findIndex(p => p.chainId === chainId && p.amount >= amount);
        if (posIndex === -1)
            throw new Error("Position not found or insufficient.");
        const pos = providerPositions[posIndex];
        const currentPrice = 900; // Simulated current price (lower than entry)
        // Calculate IL protection
        const ilProtection = LiquidityLib_1.LiquidityLib.calculateILProtection(pos.entryPrice, currentPrice, amount);
        const withdrawAmount = amount + ilProtection;
        // Ensure chain can cover the protection
        if (chain.currentLiquidity < withdrawAmount) {
            throw new Error("Chain liquidity too low for IL protection payout.");
        }
        chain.currentLiquidity -= withdrawAmount;
        pos.amount -= amount;
        if (pos.amount === 0) {
            providerPositions.splice(posIndex, 1);
        }
        return withdrawAmount;
    }
    /**
     * Rebalances liquidity across all chains to optimize capital efficiency.
     */
    async rebalance() {
        const actions = this.rebalancingEngine.calculateRebalancingActions();
        for (const action of actions) {
            await this.bridgeEngine.bridgeAsset(action.fromChain, action.toChain, action.amount);
        }
        return actions;
    }
    /**
     * Bridges an asset from one chain to another.
     */
    async bridge(fromChainId, toChainId, amount) {
        if (this.isEmergency)
            throw new Error("Bridging disabled during emergency.");
        // Slippage check (simulated expected vs actual)
        if (!LiquidityLib_1.LiquidityLib.isSlippageAcceptable(amount, amount * 0.99)) {
            throw new Error("Slippage too high.");
        }
        return await this.bridgeEngine.bridgeAsset(fromChainId, toChainId, amount);
    }
    /**
     * Calculates rewards for a liquidity provider across all their positions.
     */
    calculateRewards(provider) {
        const providerPositions = this.positions.get(provider) || [];
        const now = Date.now();
        return providerPositions.reduce((total, pos) => {
            const duration = (now - pos.timestamp) / 1000; // in seconds
            return total + LiquidityLib_1.LiquidityLib.calculateRewards(pos.amount, duration, this.rewardRate);
        }, 0);
    }
    /**
     * Claims all rewards for a provider.
     */
    claimRewards(provider) {
        const rewards = this.calculateRewards(provider);
        this.rewardPool -= rewards;
        const providerPositions = this.positions.get(provider) || [];
        providerPositions.forEach(pos => pos.timestamp = Date.now()); // Reset timestamp
    }
    /**
     * Returns the overall pool statistics.
     */
    getPoolStats() {
        let totalLiquidity = 0;
        let activeChains = 0;
        this.chains.forEach(c => {
            totalLiquidity += c.currentLiquidity;
            if (c.active)
                activeChains++;
        });
        return {
            totalLiquidity,
            totalVolume: this.totalVolume,
            totalRewardsDistributed: 0, // Placeholder
            activeChains
        };
    }
    /**
     * Emergency withdrawal bypasses certain checks to return original liquidity.
     */
    emergencyWithdraw(provider) {
        const providerPositions = this.positions.get(provider) || [];
        providerPositions.forEach(pos => {
            const chain = this.chains.get(pos.chainId);
            if (chain) {
                chain.currentLiquidity -= pos.amount;
            }
        });
        this.positions.delete(provider);
    }
    /**
     * Toggles the emergency mode status.
     */
    toggleEmergencyMode() {
        this.isEmergency = !this.isEmergency;
    }
    /**
     * Arbitrage check between two chains.
     */
    checkArbitrageOpportunity(chainIdA, chainIdB) {
        // Simulated prices on different chains
        const priceA = 1000;
        const priceB = 1060; // 6% deviation
        return !LiquidityLib_1.LiquidityLib.checkPriceDeviation(priceA, priceB);
    }
}
exports.MultiChainLiquidityPool = MultiChainLiquidityPool;
//# sourceMappingURL=MultiChainLiquidityPool.js.map