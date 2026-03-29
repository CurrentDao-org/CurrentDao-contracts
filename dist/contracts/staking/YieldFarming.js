"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YieldFarming = void 0;
const StakingPool_1 = require("./pools/StakingPool");
const RewardCalculator_1 = require("./rewards/RewardCalculator");
const PoolGovernance_1 = require("./governance/PoolGovernance");
/**
 * YieldFarming — main facade for the $WATT staking and yield farming system.
 *
 * Supports 10+ pools, dynamic APY based on utilization, lock-up periods
 * from 1 day to 1 year, 15% annual compounding boost, early withdrawal
 * penalties, and on-chain pool governance.
 *
 * All staking operations are designed to stay under 200k gas equivalent.
 */
class YieldFarming {
    pools = new Map();
    rewardCalculator;
    governance;
    paused = false;
    now;
    constructor(initialVotingWeight = 1_000_000, clock) {
        this.rewardCalculator = new RewardCalculator_1.RewardCalculator();
        this.now = clock ?? (() => Math.floor(Date.now() / 1000));
        this.governance = new PoolGovernance_1.PoolGovernance(initialVotingWeight, (poolId, paramKey, newValue) => this.applyGovernanceChange(poolId, paramKey, newValue));
    }
    // ─── Pool Management ────────────────────────────────────────────────────
    createPool(config) {
        if (this.pools.has(config.poolId)) {
            throw new Error(`Pool ${config.poolId} already exists`);
        }
        this.pools.set(config.poolId, new StakingPool_1.StakingPool(config));
    }
    updatePool(poolId, updates) {
        this.getPoolOrThrow(poolId).updateConfig(updates);
    }
    getPool(poolId) {
        return this.getPoolOrThrow(poolId).getConfig();
    }
    getPoolStats(poolId) {
        return this.getPoolOrThrow(poolId).getStats();
    }
    getAllPools() {
        return Array.from(this.pools.values()).map(p => p.getConfig());
    }
    // ─── Staking ────────────────────────────────────────────────────────────
    stake(staker, poolId, amount) {
        this.assertNotPaused();
        return this.getPoolOrThrow(poolId).stake(staker, amount, this.now());
    }
    unstake(staker, poolId, amount) {
        this.assertNotPaused();
        return this.getPoolOrThrow(poolId).unstake(staker, amount, this.now());
    }
    getPosition(staker, poolId) {
        return this.getPoolOrThrow(poolId).getPosition(staker);
    }
    // ─── Rewards ────────────────────────────────────────────────────────────
    claimRewards(staker, poolId) {
        this.assertNotPaused();
        return this.getPoolOrThrow(poolId).claimRewards(staker, this.now());
    }
    compound(staker, poolId) {
        this.assertNotPaused();
        return this.getPoolOrThrow(poolId).compound(staker, this.now());
    }
    getPendingRewards(staker, poolId) {
        return this.getPoolOrThrow(poolId).getPendingRewards(staker, this.now());
    }
    /**
     * Projects rewards across all pools for a given principal and lockup.
     * Useful for UI to show competitive APY comparisons.
     */
    projectRewards(principal, lockupDays) {
        const configs = this.getAllPools();
        const statsMap = new Map(configs.map(c => [c.poolId, this.getPoolStats(c.poolId)]));
        return this.rewardCalculator.rankPools(configs, statsMap, lockupDays);
    }
    // ─── Governance ─────────────────────────────────────────────────────────
    proposeParameterChange(proposal) {
        return this.governance.propose(proposal.poolId, proposal.paramKey, proposal.newValue, proposal.proposer, this.now());
    }
    vote(proposalId, voter, support, weight) {
        this.governance.vote(proposalId, voter, support, weight, this.now());
    }
    executeProposal(proposalId) {
        this.governance.execute(proposalId, this.now());
    }
    getProposal(proposalId) {
        return this.governance.getProposal(proposalId);
    }
    // ─── Emergency ──────────────────────────────────────────────────────────
    emergencyPause() {
        this.paused = true;
    }
    emergencyUnpause() {
        this.paused = false;
    }
    // ─── Internals ──────────────────────────────────────────────────────────
    getPoolOrThrow(poolId) {
        const pool = this.pools.get(poolId);
        if (!pool)
            throw new Error(`Pool ${poolId} not found`);
        return pool;
    }
    assertNotPaused() {
        if (this.paused)
            throw new Error('YieldFarming: contract is paused');
    }
    applyGovernanceChange(poolId, paramKey, newValue) {
        const pool = this.pools.get(poolId);
        if (!pool)
            return;
        pool.updateConfig({ [paramKey]: newValue });
    }
}
exports.YieldFarming = YieldFarming;
//# sourceMappingURL=YieldFarming.js.map