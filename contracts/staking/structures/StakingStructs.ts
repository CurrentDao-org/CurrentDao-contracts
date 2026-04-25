/**
 * Staking structures for the CurrentDao staking and rewards system
 * Optimized for gas efficiency and comprehensive governance integration
 */

export interface StakingPosition {
    /** Unique identifier for the staking position */
    positionId: string;
    /** Address of the staker */
    staker: string;
    /** Amount of WATT tokens staked */
    amount: number;
    /** Timestamp when staking occurred */
    stakedAt: number;
    /** Timestamp when lock-up period ends */
    lockupEnd: number;
    /** Lock-up duration in seconds */
    lockupDuration: number;
    /** Accumulated rewards (in basis points) */
    accumulatedRewards: number;
    /** Last timestamp when rewards were calculated */
    lastRewardUpdate: number;
    /** Governance voting weight */
    votingWeight: number;
    /** Performance multiplier for long-term staking */
    performanceMultiplier: number;
    /** Whether position is active */
    active: boolean;
}

export interface StakingPool {
    /** Unique pool identifier */
    poolId: number;
    /** Pool name */
    name: string;
    /** Base APY in basis points (1000 = 10%) */
    baseAPY: number;
    /** Minimum staking amount */
    minStakeAmount: number;
    /** Maximum staking amount */
    maxStakeAmount: number;
    /** Total staked amount in pool */
    totalStaked: number;
    /** Pool capacity limit */
    maxCapacity: number;
    /** Lock-up period in seconds */
    lockupPeriod: number;
    /** Early withdrawal penalty in basis points */
    earlyWithdrawalPenalty: number;
    /** Performance bonus threshold (in seconds) */
    performanceThreshold: number;
    /** Performance bonus multiplier in basis points */
    performanceBonus: number;
    /** Whether pool is accepting new stakes */
    active: boolean;
    /** Pool creation timestamp */
    createdAt: number;
    /** Total rewards distributed */
    totalRewardsDistributed: number;
    /** Number of active stakers */
    stakerCount: number;
}

export interface RewardDistribution {
    /** Unique distribution identifier */
    distributionId: string;
    /** Pool ID */
    poolId: number;
    /** Total reward amount */
    totalAmount: number;
    /** Timestamp of distribution */
    timestamp: number;
    /** Reward per staked token (in basis points) */
    rewardPerToken: number;
    /** Number of stakers rewarded */
    stakerCount: number;
    /** Distribution type (performance, regular, bonus) */
    distributionType: 'performance' | 'regular' | 'bonus';
}

export interface GovernanceRights {
    /** Address of the staker */
    staker: string;
    /** Total voting weight across all pools */
    totalVotingWeight: number;
    /** Voting weight per pool */
    votingWeights: Map<number, number>;
    /** Delegated voting weight */
    delegatedWeight: number;
    /** Delegated to address */
    delegatedTo?: string;
    /** Last update timestamp */
    lastUpdate: number;
}

export interface StakingMetrics {
    /** Total value locked across all pools */
    totalValueLocked: number;
    /** Total number of stakers */
    totalStakers: number;
    /** Average lock-up duration */
    averageLockupDuration: number;
    /** Total rewards distributed */
    totalRewardsDistributed: number;
    /** Pool utilization metrics */
    poolUtilization: Map<number, number>;
    /** Performance metrics */
    performanceMetrics: {
        longTermStakers: number;
        averageMultiplier: number;
        retentionRate: number;
    };
}

export interface GasOptimizationConfig {
    /** Batch size for reward calculations */
    rewardBatchSize: number;
    /** Maximum gas per operation */
    maxGasPerOperation: number;
    /** Enable gas optimization features */
    enabled: boolean;
}

export interface StakingEvent {
    /** Event type */
    type: 'staked' | 'unstaked' | 'reward_claimed' | 'reward_distributed' | 'pool_created' | 'pool_updated';
    /** Timestamp */
    timestamp: number;
    /** Emitter address */
    emitter: string;
    /** Event data */
    data: any;
}

// Constants for gas optimization and calculations
export const STAKING_CONSTANTS = {
    BASIS_POINTS_PRECISION: 10000,
    SECONDS_PER_DAY: 86400,
    SECONDS_PER_YEAR: 31536000,
    MIN_LOCKUP_PERIOD: 86400, // 1 day
    MAX_LOCKUP_PERIOD: 31536000, // 1 year
    DEFAULT_PERFORMANCE_THRESHOLD: 2592000, // 30 days
    DEFAULT_PERFORMANCE_BONUS: 1500, // 15%
    MAX_BATCH_SIZE: 100,
    GAS_TARGET_REDUCTION: 70, // 70% reduction target
} as const;
