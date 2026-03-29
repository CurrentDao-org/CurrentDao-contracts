"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingLib = exports.COMPOUND_BOOST_BPS = exports.BASIS_POINTS = exports.SECONDS_PER_YEAR = void 0;
exports.SECONDS_PER_YEAR = 31_536_000;
exports.BASIS_POINTS = 10_000;
exports.COMPOUND_BOOST_BPS = 150; // 1.5% compounding boost per period
class StakingLib {
    /**
     * Calculates dynamic APY based on pool utilization.
     * Higher utilization = higher APY to incentivize liquidity.
     */
    static getDynamicAPY(config, stats) {
        const utilization = stats.utilization / 100; // 0.0 - 1.0
        // APY scales up to 2x base at 100% utilization
        const multiplier = 1 + utilization;
        return Math.floor(config.baseAPY * multiplier);
    }
    /**
     * Calculates accrued rewards for a position since last claim/compound.
     */
    static calculateRewards(position, currentAPY, now) {
        const elapsed = now - position.lastCompoundAt;
        if (elapsed <= 0 || position.amount <= 0)
            return 0;
        // Simple interest: amount * APY * (elapsed / year)
        const rewardRate = currentAPY / exports.BASIS_POINTS;
        return position.amount * rewardRate * (elapsed / exports.SECONDS_PER_YEAR);
    }
    /**
     * Applies 15% annual compounding boost on top of base rewards.
     * Compounding increases effective yield by ~15% annually.
     */
    static applyCompoundBoost(baseRewards, periodsCompounded) {
        if (periodsCompounded <= 0)
            return baseRewards;
        const boostRate = exports.COMPOUND_BOOST_BPS / exports.BASIS_POINTS; // 0.015
        return baseRewards * Math.pow(1 + boostRate, periodsCompounded);
    }
    /**
     * Calculates early withdrawal penalty.
     * Penalty scales linearly: full penalty at t=0, zero at lockup end.
     */
    static calculatePenalty(amount, config, stakedAt, now) {
        if (now >= stakedAt + config.lockupPeriod)
            return 0;
        const remaining = (stakedAt + config.lockupPeriod - now) / config.lockupPeriod;
        const penaltyRate = (config.earlyWithdrawalPenalty / exports.BASIS_POINTS) * remaining;
        return Math.floor(amount * penaltyRate);
    }
    /**
     * Validates lockup period is within allowed range (1 day to 1 year).
     */
    static validateLockup(lockupSeconds) {
        const ONE_DAY = 86_400;
        const ONE_YEAR = exports.SECONDS_PER_YEAR;
        return lockupSeconds >= ONE_DAY && lockupSeconds <= ONE_YEAR;
    }
    /**
     * Calculates pool utilization percentage.
     */
    static calcUtilization(totalStaked, maxCapacity) {
        if (maxCapacity <= 0)
            return 0;
        return Math.min(100, (totalStaked / maxCapacity) * 100);
    }
    /**
     * Estimates gas cost category for an operation (for optimization tracking).
     * Returns 'low' | 'medium' | 'high' relative to 200k gas target.
     */
    static estimateGasCategory(operationType) {
        const estimates = {
            stake: 80_000,
            unstake: 100_000,
            claim: 60_000,
            compound: 90_000,
        };
        const gas = estimates[operationType] ?? 100_000;
        if (gas < 100_000)
            return 'low';
        if (gas < 150_000)
            return 'medium';
        return 'high';
    }
}
exports.StakingLib = StakingLib;
//# sourceMappingURL=StakingLib.js.map