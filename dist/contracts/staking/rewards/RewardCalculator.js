"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardCalculator = void 0;
const StakingLib_1 = require("../libraries/StakingLib");
class RewardCalculator {
    /**
     * Projects rewards for a given stake over the lockup period.
     */
    projectRewards(config, stats, principal, lockupDays) {
        const dynamicAPY = StakingLib_1.StakingLib.getDynamicAPY(config, stats);
        const lockupSeconds = lockupDays * 86_400;
        const rewardRate = dynamicAPY / StakingLib_1.BASIS_POINTS;
        const estimatedReward = principal * rewardRate * (lockupSeconds / StakingLib_1.SECONDS_PER_YEAR);
        // Compounding boost: 15% annual boost applied monthly
        const periods = Math.floor(lockupDays / 30);
        const withCompounding = config.compoundingEnabled
            ? StakingLib_1.StakingLib.applyCompoundBoost(estimatedReward, periods)
            : estimatedReward;
        return {
            poolId: config.poolId,
            principal,
            lockupDays,
            estimatedReward,
            effectiveAPY: dynamicAPY,
            withCompounding,
        };
    }
    /**
     * Compares APY across all pools to find the best option for a given lockup.
     */
    rankPools(configs, statsMap, lockupDays) {
        return configs
            .filter(c => c.active)
            .map(c => {
            const stats = statsMap.get(c.poolId) ?? {
                poolId: c.poolId,
                totalStaked: 0,
                utilization: 0,
                currentAPY: c.baseAPY,
                totalRewardsDistributed: 0,
                stakerCount: 0,
            };
            return this.projectRewards(c, stats, 1000, lockupDays);
        })
            .sort((a, b) => b.withCompounding - a.withCompounding);
    }
    /**
     * Calculates the break-even point for early withdrawal given penalty.
     * Returns the minimum days to stake before penalty is offset by rewards.
     */
    breakEvenDays(config, stats) {
        const dynamicAPY = StakingLib_1.StakingLib.getDynamicAPY(config, stats);
        const rewardRate = dynamicAPY / StakingLib_1.BASIS_POINTS;
        const penaltyRate = config.earlyWithdrawalPenalty / StakingLib_1.BASIS_POINTS;
        if (rewardRate <= 0)
            return Infinity;
        // days until rewards >= penalty on full amount
        return Math.ceil((penaltyRate / rewardRate) * 365);
    }
    /**
     * Calculates gas-efficient batch reward totals for multiple stakers.
     * Aggregates in a single pass to minimize computation.
     */
    batchPendingRewards(entries, currentAPY, now) {
        return entries.reduce((total, e) => {
            const elapsed = now - e.lastCompoundAt;
            const accrued = elapsed > 0
                ? e.amount * (currentAPY / StakingLib_1.BASIS_POINTS) * (elapsed / StakingLib_1.SECONDS_PER_YEAR)
                : 0;
            return total + e.pendingRewards + accrued;
        }, 0);
    }
}
exports.RewardCalculator = RewardCalculator;
//# sourceMappingURL=RewardCalculator.js.map