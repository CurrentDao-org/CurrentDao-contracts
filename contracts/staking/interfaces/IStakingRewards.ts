import type {
    StakingPosition,
    StakingPool,
    RewardDistribution,
    GovernanceRights,
    StakingMetrics,
    GasOptimizationConfig,
    StakingEvent
} from '../structures/StakingStructs';

/**
 * Interface for the CurrentDao Staking and Rewards system
 * Provides comprehensive staking, rewards, and governance functionality
 */
export interface IStakingRewards {
    // ─── Pool Management ────────────────────────────────────────

    /**
     * Creates a new staking pool with specified parameters
     * @param config Pool configuration parameters
     */
    createPool(config: Omit<StakingPool, 'poolId' | 'totalStaked' | 'totalRewardsDistributed' | 'stakerCount' | 'createdAt'>): number;

    /**
     * Updates an existing staking pool configuration
     * @param poolId Pool identifier
     * @param updates Configuration updates
     */
    updatePool(poolId: number, updates: Partial<StakingPool>): void;

    /**
     * Retrieves pool configuration
     * @param poolId Pool identifier
     */
    getPool(poolId: number): StakingPool | null;

    /**
     * Retrieves all active pools
     */
    getAllPools(): StakingPool[];

    /**
     * Activates or deactivates a pool
     * @param poolId Pool identifier
     * @param active Pool status
     */
    setPoolActive(poolId: number, active: boolean): void;

    // ─── Staking Operations ───────────────────────────────────────

    /**
     * Stakes WATT tokens in a specified pool
     * @param staker Address of the staker
     * @param poolId Pool identifier
     * @param amount Amount to stake
     * @param lockupDuration Lock-up duration in seconds
     */
    stake(staker: string, poolId: number, amount: number, lockupDuration?: number): StakingPosition;

    /**
     * Unstakes WATT tokens from a specified pool
     * @param staker Address of the staker
     * @param positionId Position identifier
     * @param amount Amount to unstake
     */
    unstake(staker: string, positionId: string, amount: number): { 
        received: number; 
        penalty: number; 
        rewards: number;
    };

    /**
     * Retrieves staking position information
     * @param staker Address of the staker
     * @param positionId Position identifier
     */
    getPosition(staker: string, positionId: string): StakingPosition | null;

    /**
     * Retrieves all positions for a staker
     * @param staker Address of the staker
     */
    getStakerPositions(staker: string): StakingPosition[];

    /**
     * Retrieves all positions in a pool
     * @param poolId Pool identifier
     */
    getPoolPositions(poolId: number): StakingPosition[];

    // ─── Rewards Management ───────────────────────────────────────

    /**
     * Claims pending rewards for a position
     * @param staker Address of the staker
     * @param positionId Position identifier
     */
    claimRewards(staker: string, positionId: string): number;

    /**
     * Claims rewards for all positions of a staker
     * @param staker Address of the staker
     */
    claimAllRewards(staker: string): number;

    /**
     * Calculates pending rewards for a position
     * @param positionId Position identifier
     */
    getPendingRewards(positionId: string): number;

    /**
     * Distributes rewards to a pool
     * @param poolId Pool identifier
     * @param amount Reward amount
     * @param distributionType Type of distribution
     */
    distributeRewards(poolId: number, amount: number, distributionType: 'performance' | 'regular' | 'bonus'): RewardDistribution;

    /**
     * Retrieves reward distribution history
     * @param poolId Pool identifier
     * @param limit Maximum number of records
     */
    getRewardHistory(poolId: number, limit?: number): RewardDistribution[];

    // ─── Governance Integration ───────────────────────────────────

    /**
     * Calculates voting weight for a staker
     * @param staker Address of the staker
     */
    calculateVotingWeight(staker: string): GovernanceRights;

    /**
     * Delegates voting weight to another address
     * @param delegator Address delegating weight
     * @param delegatee Address receiving delegation
     */
    delegateVotingWeight(delegator: string, delegatee: string): void;

    /**
     * Retrieves governance rights for a staker
     * @param staker Address of the staker
     */
    getGovernanceRights(staker: string): GovernanceRights;

    /**
     * Updates voting weights after position changes
     * @param staker Address of the staker
     */
    updateVotingWeights(staker: string): void;

    // ─── Performance Tracking ─────────────────────────────────────

    /**
     * Calculates performance multiplier for long-term staking
     * @param lockupDuration Lock-up duration in seconds
     * @param stakedAt Timestamp when staked
     */
    calculatePerformanceMultiplier(lockupDuration: number, stakedAt: number): number;

    /**
     * Retrieves performance metrics for a pool
     * @param poolId Pool identifier
     */
    getPoolPerformanceMetrics(poolId: number): {
        longTermStakers: number;
        averageMultiplier: number;
        retentionRate: number;
    };

    /**
     * Awards performance bonuses to eligible stakers
     * @param poolId Pool identifier
     */
    awardPerformanceBonuses(poolId: number): RewardDistribution[];

    // ─── Gas Optimization ─────────────────────────────────────────

    /**
     * Configures gas optimization settings
     * @param config Gas optimization configuration
     */
    configureGasOptimization(config: GasOptimizationConfig): void;

    /**
     * Batch processes multiple reward calculations
     * @param positionIds Array of position identifiers
     */
    batchCalculateRewards(positionIds: string[]): Map<string, number>;

    /**
     * Batch processes multiple unstaking operations
     * @param unstakes Array of unstaking operations
     */
    batchUnstake(unstakes: Array<{ staker: string; positionId: string; amount: number }>): Array<{
        received: number;
        penalty: number;
        rewards: number;
    }>;

    /**
     * Estimates gas cost for operations
     * @param operation Type of operation
     * @param params Operation parameters
     */
    estimateGasCost(operation: 'stake' | 'unstake' | 'claim' | 'distribute', params: any): number;

    // ─── Analytics and Reporting ──────────────────────────────────

    /**
     * Retrieves comprehensive staking metrics
     */
    getStakingMetrics(): StakingMetrics;

    /**
     * Retrieves pool statistics
     * @param poolId Pool identifier
     */
    getPoolStats(poolId: number): {
        totalStaked: number;
        utilization: number;
        currentAPY: number;
        averageLockup: number;
        stakerCount: number;
    };

    /**
     * Retrieves staker statistics
     * @param staker Address of the staker
     */
    getStakerStats(staker: string): {
        totalStaked: number;
        totalEarned: number;
        averageLockup: number;
        votingWeight: number;
        positionCount: number;
    };

    // ─── Emergency Functions ───────────────────────────────────────

    /**
     * Pauses all staking operations
     */
    emergencyPause(): void;

    /**
     * Unpauses all staking operations
     */
    emergencyUnpause(): void;

    /**
     * Emergency unstake with reduced penalties
     * @param staker Address of the staker
     * @param positionId Position identifier
     */
    emergencyUnstake(staker: string, positionId: string): { received: number; penalty: number; rewards: number };

    /**
     * Retrieves contract status
     */
    getContractStatus(): {
        paused: boolean;
        totalPools: number;
        totalStakers: number;
        totalValueLocked: number;
    };

    // ─── Events ────────────────────────────────────────────────────

    /**
     * Retrieves recent events
     * @param limit Maximum number of events
     */
    getRecentEvents(limit?: number): StakingEvent[];

    /**
     * Subscribes to staking events (for integration with external systems)
     * @param eventType Event type to subscribe to
     * @param callback Callback function
     */
    subscribeToEvents(eventType: string, callback: (event: StakingEvent) => void): void;
}
