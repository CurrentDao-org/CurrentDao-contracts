"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingPool = void 0;
const StakingLib_1 = require("../libraries/StakingLib");
class StakingPool {
    config;
    positions = new Map();
    totalStaked = 0;
    totalRewardsDistributed = 0;
    stakerCount = 0;
    constructor(config) {
        if (!StakingLib_1.StakingLib.validateLockup(config.lockupPeriod)) {
            throw new Error(`Pool ${config.poolId}: lockup must be between 1 day and 1 year`);
        }
        this.config = { ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(updates) {
        if (updates.lockupPeriod !== undefined && !StakingLib_1.StakingLib.validateLockup(updates.lockupPeriod)) {
            throw new Error('Invalid lockup period');
        }
        this.config = { ...this.config, ...updates };
    }
    getStats() {
        const utilization = StakingLib_1.StakingLib.calcUtilization(this.totalStaked, this.config.maxCapacity);
        const currentAPY = StakingLib_1.StakingLib.getDynamicAPY(this.config, {
            poolId: this.config.poolId,
            totalStaked: this.totalStaked,
            utilization,
            currentAPY: this.config.baseAPY,
            totalRewardsDistributed: this.totalRewardsDistributed,
            stakerCount: this.stakerCount,
        });
        return {
            poolId: this.config.poolId,
            totalStaked: this.totalStaked,
            utilization,
            currentAPY,
            totalRewardsDistributed: this.totalRewardsDistributed,
            stakerCount: this.stakerCount,
        };
    }
    stake(staker, amount, now) {
        if (!this.config.active)
            throw new Error(`Pool ${this.config.poolId} is not active`);
        if (amount <= 0)
            throw new Error('Stake amount must be positive');
        if (this.totalStaked + amount > this.config.maxCapacity) {
            throw new Error(`Pool ${this.config.poolId} capacity exceeded`);
        }
        const existing = this.positions.get(staker);
        if (existing) {
            // Accumulate pending rewards before adding more stake
            const stats = this.getStats();
            const accrued = StakingLib_1.StakingLib.calculateRewards(existing, stats.currentAPY, now);
            existing.pendingRewards += accrued;
            existing.amount += amount;
            existing.lastCompoundAt = now;
            existing.lockupEnd = now + this.config.lockupPeriod;
            this.totalStaked += amount;
            return { ...existing };
        }
        const position = {
            staker,
            poolId: this.config.poolId,
            amount,
            stakedAt: now,
            lastCompoundAt: now,
            lockupEnd: now + this.config.lockupPeriod,
            pendingRewards: 0,
            compoundedRewards: 0,
        };
        this.positions.set(staker, position);
        this.totalStaked += amount;
        this.stakerCount++;
        return { ...position };
    }
    unstake(staker, amount, now) {
        const position = this.positions.get(staker);
        if (!position)
            throw new Error('No stake position found');
        if (amount > position.amount)
            throw new Error('Insufficient staked amount');
        const penalty = StakingLib_1.StakingLib.calculatePenalty(amount, this.config, position.stakedAt, now);
        const received = amount - penalty;
        position.amount -= amount;
        this.totalStaked -= amount;
        if (position.amount === 0) {
            this.positions.delete(staker);
            this.stakerCount = Math.max(0, this.stakerCount - 1);
        }
        return { received, penalty };
    }
    claimRewards(staker, now) {
        const position = this.positions.get(staker);
        if (!position)
            throw new Error('No stake position found');
        const stats = this.getStats();
        const accrued = StakingLib_1.StakingLib.calculateRewards(position, stats.currentAPY, now);
        const total = position.pendingRewards + accrued;
        position.pendingRewards = 0;
        position.lastCompoundAt = now;
        this.totalRewardsDistributed += total;
        return total;
    }
    compound(staker, now) {
        if (!this.config.compoundingEnabled)
            throw new Error('Compounding not enabled for this pool');
        const position = this.positions.get(staker);
        if (!position)
            throw new Error('No stake position found');
        const stats = this.getStats();
        const accrued = StakingLib_1.StakingLib.calculateRewards(position, stats.currentAPY, now);
        const total = position.pendingRewards + accrued;
        // Apply 15% annual compounding boost
        const periodsCompounded = Math.floor((now - position.stakedAt) / (86_400 * 30)); // monthly periods
        const boosted = StakingLib_1.StakingLib.applyCompoundBoost(total, periodsCompounded);
        // Re-stake the boosted rewards
        if (this.totalStaked + boosted <= this.config.maxCapacity) {
            position.amount += boosted;
            this.totalStaked += boosted;
        }
        position.pendingRewards = 0;
        position.compoundedRewards += boosted;
        position.lastCompoundAt = now;
        this.totalRewardsDistributed += boosted;
        return boosted;
    }
    getPendingRewards(staker, now) {
        const position = this.positions.get(staker);
        if (!position)
            return 0;
        const stats = this.getStats();
        const accrued = StakingLib_1.StakingLib.calculateRewards(position, stats.currentAPY, now);
        return position.pendingRewards + accrued;
    }
    getPosition(staker) {
        const p = this.positions.get(staker);
        return p ? { ...p } : null;
    }
}
exports.StakingPool = StakingPool;
//# sourceMappingURL=StakingPool.js.map