import type { IStakingRewards } from './interfaces/IStakingRewards';
import type { 
    StakingPosition, 
    StakingPool, 
    RewardDistribution, 
    GovernanceRights, 
    StakingMetrics, 
    GasOptimizationConfig, 
    StakingEvent 
} from './structures/StakingStructs';
import { StakingLib, BASIS_POINTS, SECONDS_PER_YEAR, BATCH_SIZE_LIMIT } from './libraries/StakingLib';
import { WattToken } from '../token/WattToken';

/**
 * StakingRewards - Comprehensive staking and rewards contract for CurrentDao
 * 
 * Features:
 * - Flexible WATT token staking with multiple pools
 * - Governance voting rights that scale with staking amount and duration
 * - Performance-based rewards with multipliers for long-term staking
 * - Gas-optimized operations targeting 70% cost reduction
 * - Comprehensive reward distribution system
 * - Emergency functions and pause mechanisms
 * - Full DAO governance integration
 */
export class StakingRewards implements IStakingRewards {
    // ─── State Variables ────────────────────────────────────────

    private pools: Map<number, StakingPool> = new Map();
    private positions: Map<string, StakingPosition> = new Map();
    private stakerPositions: Map<string, Set<string>> = new Map();
    private governanceRights: Map<string, GovernanceRights> = new Map();
    private rewardDistributions: Map<string, RewardDistribution> = new Map();
    private events: StakingEvent[] = [];
    
    private nextPoolId: number = 1;
    private paused: boolean = false;
    private admin: string;
    private wattToken: WattToken;
    
    private gasOptimizationConfig: GasOptimizationConfig = {
        rewardBatchSize: 50,
        maxGasPerOperation: 200000,
        enabled: true,
    };

    private now: () => number;

    // ─── Constructor ────────────────────────────────────────────

    constructor(adminAddress: string, wattToken: WattToken, clock?: () => number) {
        this.admin = adminAddress;
        this.wattToken = wattToken;
        this.now = clock ?? (() => Math.floor(Date.now() / 1000));
        
        this.emitEvent('pool_created', {
            timestamp: this.now(),
            emitter: adminAddress,
            data: { contract: 'StakingRewards', initialized: true }
        });
    }

    // ─── Pool Management ────────────────────────────────────────

    createPool(config: Omit<StakingPool, 'poolId' | 'totalStaked' | 'totalRewardsDistributed' | 'stakerCount' | 'createdAt'>): number {
        this.onlyAdmin();
        this.assertNotPaused();

        const poolId = this.nextPoolId++;
        const pool: StakingPool = {
            ...config,
            poolId,
            totalStaked: 0,
            totalRewardsDistributed: 0,
            stakerCount: 0,
            createdAt: this.now(),
        };

        this.pools.set(poolId, pool);
        
        this.emitEvent('pool_created', {
            timestamp: this.now(),
            emitter: this.admin,
            data: { poolId, pool }
        });

        return poolId;
    }

    updatePool(poolId: number, updates: Partial<StakingPool>): void {
        this.onlyAdmin();
        this.assertNotPaused();
        
        const pool = this.pools.get(poolId);
        if (!pool) throw new Error(`Pool ${poolId} not found`);

        Object.assign(pool, updates);
        
        this.emitEvent('pool_updated', {
            timestamp: this.now(),
            emitter: this.admin,
            data: { poolId, updates }
        });
    }

    getPool(poolId: number): StakingPool | null {
        return this.pools.get(poolId) ?? null;
    }

    getAllPools(): StakingPool[] {
        return Array.from(this.pools.values());
    }

    setPoolActive(poolId: number, active: boolean): void {
        this.onlyAdmin();
        const pool = this.pools.get(poolId);
        if (!pool) throw new Error(`Pool ${poolId} not found`);
        
        pool.active = active;
    }

    // ─── Staking Operations ───────────────────────────────────────

    stake(staker: string, poolId: number, amount: number, lockupDuration?: number): StakingPosition {
        this.assertNotPaused();
        
        const pool = this.pools.get(poolId);
        if (!pool) throw new Error(`Pool ${poolId} not found`);
        if (!pool.active) throw new Error(`Pool ${poolId} is not active`);

        const actualLockupDuration = lockupDuration ?? pool.lockupPeriod;
        
        // Validate staking parameters
        const validation = StakingLib.validateStakingParams(
            amount,
            pool.minStakeAmount,
            pool.maxStakeAmount,
            actualLockupDuration,
            pool.maxCapacity,
            pool.totalStaked
        );
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Transfer tokens (simplified - in real implementation would use ERC20 transferFrom)
        const stakerBalance = this.wattToken.balanceOf(staker);
        if (stakerBalance < amount) {
            throw new Error('Insufficient WATT token balance');
        }

        // Create staking position
        const timestamp = this.now();
        const positionId = StakingLib.generatePositionId(staker, poolId, timestamp);
        const lockupEnd = timestamp + actualLockupDuration;
        
        const position: StakingPosition = {
            positionId,
            staker,
            amount,
            stakedAt: timestamp,
            lockupEnd,
            lockupDuration: actualLockupDuration,
            accumulatedRewards: 0,
            lastRewardUpdate: timestamp,
            votingWeight: 0, // Will be calculated below
            performanceMultiplier: BASIS_POINTS, // Will be updated over time
            active: true,
        };

        // Calculate voting weight
        position.votingWeight = StakingLib.calculateVotingWeight(
            amount,
            actualLockupDuration,
            position.performanceMultiplier
        );

        // Update state
        this.positions.set(positionId, position);
        
        if (!this.stakerPositions.has(staker)) {
            this.stakerPositions.set(staker, new Set());
        }
        this.stakerPositions.get(staker)!.add(positionId);

        // Update pool
        pool.totalStaked += amount;
        pool.stakerCount += 1;

        // Update governance rights
        this.updateVotingWeights(staker);

        this.emitEvent('staked', {
            timestamp,
            emitter: staker,
            data: { positionId, poolId, amount, lockupDuration: actualLockupDuration }
        });

        return position;
    }

    unstake(staker: string, positionId: string, amount: number): { 
        received: number; 
        penalty: number; 
        rewards: number;
    } {
        this.assertNotPaused();
        
        const position = this.positions.get(positionId);
        if (!position) throw new Error('Position not found');
        if (position.staker !== staker) throw new Error('Not position owner');
        if (!position.active) throw new Error('Position already inactive');
        if (amount > position.amount) throw new Error('Amount exceeds position');

        const pool = this.pools.get(position.poolId);
        if (!pool) throw new Error('Pool not found');

        const currentTime = this.now();
        
        // Calculate pending rewards
        const pendingRewards = this.getPendingRewards(positionId);
        
        // Calculate penalty
        const penalty = StakingLib.calculateOptimizedPenalty(
            amount,
            position.stakedAt,
            position.lockupEnd,
            pool.earlyWithdrawalPenalty,
            currentTime
        );

        const received = amount - penalty;
        
        // Update position
        if (amount === position.amount) {
            // Full unstake
            position.active = false;
            this.positions.delete(positionId);
            this.stakerPositions.get(staker)!.delete(positionId);
            pool.stakerCount -= 1;
        } else {
            // Partial unstake
            position.amount -= amount;
            position.votingWeight = StakingLib.calculateVotingWeight(
                position.amount,
                position.lockupDuration,
                position.performanceMultiplier
            );
        }

        // Update pool
        pool.totalStaked -= amount;

        // Update governance rights
        this.updateVotingWeights(staker);

        this.emitEvent('unstaked', {
            timestamp: currentTime,
            emitter: staker,
            data: { positionId, amount, penalty, rewards: pendingRewards }
        });

        return { received, penalty, rewards: pendingRewards };
    }

    getPosition(staker: string, positionId: string): StakingPosition | null {
        const position = this.positions.get(positionId);
        return position && position.staker === staker ? position : null;
    }

    getStakerPositions(staker: string): StakingPosition[] {
        const positionIds = this.stakerPositions.get(staker) || new Set();
        return Array.from(positionIds)
            .map(id => this.positions.get(id))
            .filter((p): p is StakingPosition => p !== undefined && p.active);
    }

    getPoolPositions(poolId: number): StakingPosition[] {
        return Array.from(this.positions.values())
            .filter(p => p.poolId === poolId && p.active);
    }

    // ─── Rewards Management ───────────────────────────────────────

    claimRewards(staker: string, positionId: string): number {
        this.assertNotPaused();
        
        const position = this.positions.get(positionId);
        if (!position) throw new Error('Position not found');
        if (position.staker !== staker) throw new Error('Not position owner');

        const rewards = this.getPendingRewards(positionId);
        if (rewards <= 0) return 0;

        // Update position
        position.accumulatedRewards += rewards;
        position.lastRewardUpdate = this.now();

        // Update pool
        const pool = this.pools.get(position.poolId);
        if (pool) {
            pool.totalRewardsDistributed += rewards;
        }

        this.emitEvent('reward_claimed', {
            timestamp: this.now(),
            emitter: staker,
            data: { positionId, rewards }
        });

        return rewards;
    }

    claimAllRewards(staker: string): number {
        const positions = this.getStakerPositions(staker);
        let totalRewards = 0;

        for (const position of positions) {
            totalRewards += this.claimRewards(staker, position.positionId);
        }

        return totalRewards;
    }

    getPendingRewards(positionId: string): number {
        const position = this.positions.get(positionId);
        if (!position || !position.active) return 0;

        const pool = this.pools.get(position.poolId);
        if (!pool) return 0;

        const currentTime = this.now();
        const elapsed = currentTime - position.lastRewardUpdate;
        if (elapsed <= 0) return 0;

        // Calculate performance multiplier
        const performanceMultiplier = StakingLib.calculatePerformanceMultiplier(
            position.lockupDuration,
            position.stakedAt,
            currentTime,
            pool.performanceThreshold,
            pool.performanceBonus
        );

        // Calculate rewards
        const utilization = StakingLib.calculatePoolUtilization(pool.totalStaked, pool.maxCapacity);
        const dynamicAPY = StakingLib.calculateDynamicAPYWithPerformance(
            pool.baseAPY,
            utilization,
            performanceMultiplier
        );

        const rewardRate = dynamicAPY / BASIS_POINTS;
        const baseReward = position.amount * rewardRate * (elapsed / SECONDS_PER_YEAR);
        
        return Math.floor(baseReward);
    }

    distributeRewards(poolId: number, amount: number, distributionType: 'performance' | 'regular' | 'bonus'): RewardDistribution {
        this.onlyAdmin();
        this.assertNotPaused();

        const pool = this.pools.get(poolId);
        if (!pool) throw new Error(`Pool ${poolId} not found`);

        const timestamp = this.now();
        const distributionId = `dist-${poolId}-${timestamp}`;
        
        // Calculate reward per staked token
        const rewardPerToken = pool.totalStaked > 0 ? (amount * BASIS_POINTS) / pool.totalStaked : 0;
        
        const distribution: RewardDistribution = {
            distributionId,
            poolId,
            totalAmount: amount,
            timestamp,
            rewardPerToken,
            stakerCount: pool.stakerCount,
            distributionType,
        };

        this.rewardDistributions.set(distributionId, distribution);
        pool.totalRewardsDistributed += amount;

        this.emitEvent('reward_distributed', {
            timestamp,
            emitter: this.admin,
            data: { distributionId, poolId, amount, distributionType }
        });

        return distribution;
    }

    getRewardHistory(poolId: number, limit: number = 100): RewardDistribution[] {
        return Array.from(this.rewardDistributions.values())
            .filter(d => d.poolId === poolId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    // ─── Governance Integration ───────────────────────────────────

    calculateVotingWeight(staker: string): GovernanceRights {
        const positions = this.getStakerPositions(staker);
        let totalVotingWeight = 0;
        const votingWeights = new Map<number, number>();

        for (const position of positions) {
            const pool = this.pools.get(position.poolId);
            if (!pool) continue;

            // Update performance multiplier
            const performanceMultiplier = StakingLib.calculatePerformanceMultiplier(
                position.lockupDuration,
                position.stakedAt,
                this.now(),
                pool.performanceThreshold,
                pool.performanceBonus
            );

            // Recalculate voting weight with updated performance
            const weight = StakingLib.calculateVotingWeight(
                position.amount,
                position.lockupDuration,
                performanceMultiplier
            );

            votingWeights.set(position.poolId, weight);
            totalVotingWeight += weight;
        }

        const existingRights = this.governanceRights.get(staker) || {
            staker,
            totalVotingWeight: 0,
            votingWeights: new Map(),
            delegatedWeight: 0,
            lastUpdate: 0,
        };

        const rights: GovernanceRights = {
            ...existingRights,
            totalVotingWeight,
            votingWeights,
            lastUpdate: this.now(),
        };

        this.governanceRights.set(staker, rights);
        return rights;
    }

    delegateVotingWeight(delegator: string, delegatee: string): void {
        if (delegator === delegatee) throw new Error('Cannot delegate to self');

        const delegatorRights = this.calculateVotingWeight(delegator);
        const delegateeRights = this.calculateVotingWeight(delegatee);

        // Update delegation
        delegatorRights.delegatedTo = delegatee;
        delegatorRights.delegatedWeight = delegatorRights.totalVotingWeight;

        // Recalculate delegatee's total weight
        delegateeRights.totalVotingWeight += delegatorRights.delegatedWeight;

        this.governanceRights.set(delegator, delegatorRights);
        this.governanceRights.set(delegatee, delegateeRights);
    }

    getGovernanceRights(staker: string): GovernanceRights {
        return this.governanceRights.get(staker) || {
            staker,
            totalVotingWeight: 0,
            votingWeights: new Map(),
            delegatedWeight: 0,
            lastUpdate: 0,
        };
    }

    updateVotingWeights(staker: string): void {
        this.calculateVotingWeight(staker);
    }

    // ─── Performance Tracking ─────────────────────────────────────

    calculatePerformanceMultiplier(lockupDuration: number, stakedAt: number): number {
        return StakingLib.calculatePerformanceMultiplier(
            lockupDuration,
            stakedAt,
            this.now()
        );
    }

    getPoolPerformanceMetrics(poolId: number): {
        longTermStakers: number;
        averageMultiplier: number;
        retentionRate: number;
    } {
        const positions = this.getPoolPositions(poolId);
        const pool = this.pools.get(poolId);
        if (!pool) return { longTermStakers: 0, averageMultiplier: BASIS_POINTS, retentionRate: 0 };

        const currentTime = this.now();
        let longTermStakers = 0;
        let totalMultiplier = 0;
        let retainedStakers = 0;

        for (const position of positions) {
            const multiplier = StakingLib.calculatePerformanceMultiplier(
                position.lockupDuration,
                position.stakedAt,
                currentTime,
                pool.performanceThreshold,
                pool.performanceBonus
            );

            totalMultiplier += multiplier;

            if (multiplier > BASIS_POINTS) {
                longTermStakers++;
            }

            if (currentTime - position.stakedAt > pool.performanceThreshold) {
                retainedStakers++;
            }
        }

        const averageMultiplier = positions.length > 0 ? totalMultiplier / positions.length : BASIS_POINTS;
        const retentionRate = StakingLib.calculateRetentionRate(positions.length, retainedStakers);

        return { longTermStakers, averageMultiplier, retentionRate };
    }

    awardPerformanceBonuses(poolId: number): RewardDistribution[] {
        this.onlyAdmin();
        const pool = this.pools.get(poolId);
        if (!pool) return [];

        const positions = this.getPoolPositions(poolId);
        const eligiblePositions = positions.filter(p => {
            const multiplier = StakingLib.calculatePerformanceMultiplier(
                p.lockupDuration,
                p.stakedAt,
                this.now(),
                pool.performanceThreshold,
                pool.performanceBonus
            );
            return multiplier > BASIS_POINTS;
        });

        const distributions: RewardDistribution[] = [];
        
        for (const position of eligiblePositions) {
            const bonusAmount = Math.floor(position.amount * pool.performanceBonus / BASIS_POINTS);
            const distribution = this.distributeRewards(poolId, bonusAmount, 'performance');
            distributions.push(distribution);
        }

        return distributions;
    }

    // ─── Gas Optimization ─────────────────────────────────────────

    configureGasOptimization(config: GasOptimizationConfig): void {
        this.onlyAdmin();
        this.gasOptimizationConfig = { ...this.gasOptimizationConfig, ...config };
    }

    batchCalculateRewards(positionIds: string[]): Map<string, number> {
        const positions = positionIds
            .map(id => this.positions.get(id))
            .filter((p): p is StakingPosition => p !== undefined && p.active);

        // Use average APY for batch calculation
        const avgAPY = this.calculateAverageAPY();
        return StakingLib.batchCalculateRewards(positions, avgAPY, this.now());
    }

    batchUnstake(unstakes: Array<{ staker: string; positionId: string; amount: number }>): Array<{
        received: number;
        penalty: number;
        rewards: number;
    }> {
        return unstakes.map(us => this.unstake(us.staker, us.positionId, us.amount));
    }

    estimateGasCost(operation: 'stake' | 'unstake' | 'claim' | 'distribute', params: any): number {
        return StakingLib.estimateOptimizedGasCost(
            operation,
            params.batchSize || 1
        );
    }

    // ─── Analytics and Reporting ──────────────────────────────────

    getStakingMetrics(): StakingMetrics {
        const pools = Array.from(this.pools.values());
        const totalValueLocked = pools.reduce((sum, pool) => sum + pool.totalStaked, 0);
        const totalStakers = this.stakerPositions.size;
        const totalRewardsDistributed = pools.reduce((sum, pool) => sum + pool.totalRewardsDistributed, 0);

        const poolUtilization = new Map<number, number>();
        let totalLockupDuration = 0;
        let positionCount = 0;

        for (const pool of pools) {
            poolUtilization.set(pool.poolId, StakingLib.calculatePoolUtilization(pool.totalStaked, pool.maxCapacity));
            
            const positions = this.getPoolPositions(pool.poolId);
            for (const position of positions) {
                totalLockupDuration += position.lockupDuration;
                positionCount++;
            }
        }

        const averageLockupDuration = positionCount > 0 ? totalLockupDuration / positionCount : 0;

        // Calculate performance metrics
        let longTermStakers = 0;
        let totalMultiplier = 0;
        let retainedPositions = 0;

        for (const position of this.positions.values()) {
            if (!position.active) continue;

            const pool = this.pools.get(position.poolId);
            if (!pool) continue;

            const multiplier = StakingLib.calculatePerformanceMultiplier(
                position.lockupDuration,
                position.stakedAt,
                this.now(),
                pool.performanceThreshold,
                pool.performanceBonus
            );

            totalMultiplier += multiplier;

            if (multiplier > BASIS_POINTS) {
                longTermStakers++;
            }

            if (this.now() - position.stakedAt > pool.performanceThreshold) {
                retainedPositions++;
            }
        }

        const activePositions = Array.from(this.positions.values()).filter(p => p.active).length;
        const averageMultiplier = activePositions > 0 ? totalMultiplier / activePositions : BASIS_POINTS;
        const retentionRate = StakingLib.calculateRetentionRate(activePositions, retainedPositions);

        return {
            totalValueLocked,
            totalStakers,
            averageLockupDuration,
            totalRewardsDistributed,
            poolUtilization,
            performanceMetrics: {
                longTermStakers,
                averageMultiplier,
                retentionRate,
            },
        };
    }

    getPoolStats(poolId: number): {
        totalStaked: number;
        utilization: number;
        currentAPY: number;
        averageLockup: number;
        stakerCount: number;
    } {
        const pool = this.pools.get(poolId);
        if (!pool) throw new Error(`Pool ${poolId} not found`);

        const positions = this.getPoolPositions(poolId);
        const utilization = StakingLib.calculatePoolUtilization(pool.totalStaked, pool.maxCapacity);
        
        let totalLockup = 0;
        for (const position of positions) {
            totalLockup += position.lockupDuration;
        }
        const averageLockup = positions.length > 0 ? totalLockup / positions.length : 0;

        const currentAPY = StakingLib.calculateDynamicAPYWithPerformance(
            pool.baseAPY,
            utilization,
            BASIS_POINTS // Base multiplier
        );

        return {
            totalStaked: pool.totalStaked,
            utilization,
            currentAPY,
            averageLockup,
            stakerCount: pool.stakerCount,
        };
    }

    getStakerStats(staker: string): {
        totalStaked: number;
        totalEarned: number;
        averageLockup: number;
        votingWeight: number;
        positionCount: number;
    } {
        const positions = this.getStakerPositions(staker);
        const rights = this.getGovernanceRights(staker);

        let totalStaked = 0;
        let totalEarned = 0;
        let totalLockup = 0;

        for (const position of positions) {
            totalStaked += position.amount;
            totalEarned += position.accumulatedRewards + this.getPendingRewards(position.positionId);
            totalLockup += position.lockupDuration;
        }

        const averageLockup = positions.length > 0 ? totalLockup / positions.length : 0;

        return {
            totalStaked,
            totalEarned,
            averageLockup,
            votingWeight: rights.totalVotingWeight,
            positionCount: positions.length,
        };
    }

    // ─── Emergency Functions ───────────────────────────────────────

    emergencyPause(): void {
        this.onlyAdmin();
        this.paused = true;
    }

    emergencyUnpause(): void {
        this.onlyAdmin();
        this.paused = false;
    }

    emergencyUnstake(staker: string, positionId: string): { received: number; penalty: number; rewards: number } {
        // Reduced penalties for emergency unstake
        const result = this.unstake(staker, positionId, this.positions.get(positionId)?.amount || 0);
        return {
            ...result,
            penalty: Math.floor(result.penalty / 2), // 50% penalty reduction
        };
    }

    getContractStatus(): {
        paused: boolean;
        totalPools: number;
        totalStakers: number;
        totalValueLocked: number;
    } {
        const metrics = this.getStakingMetrics();
        return {
            paused: this.paused,
            totalPools: this.pools.size,
            totalStakers: metrics.totalStakers,
            totalValueLocked: metrics.totalValueLocked,
        };
    }

    // ─── Events ────────────────────────────────────────────────────

    getRecentEvents(limit: number = 50): StakingEvent[] {
        return this.events
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    subscribeToEvents(eventType: string, callback: (event: StakingEvent) => void): void {
        // In a real implementation, this would set up event subscriptions
        console.log(`Subscribed to ${eventType} events`);
    }

    // ─── Internal Helper Methods ─────────────────────────────────────

    private calculateAverageAPY(): number {
        const pools = Array.from(this.pools.values());
        if (pools.length === 0) return 0;
        
        const totalAPY = pools.reduce((sum, pool) => {
            const utilization = StakingLib.calculatePoolUtilization(pool.totalStaked, pool.maxCapacity);
            return sum + StakingLib.calculateDynamicAPYWithPerformance(pool.baseAPY, utilization, BASIS_POINTS);
        }, 0);
        
        return totalAPY / pools.length;
    }

    private onlyAdmin(): void {
        // In a real implementation, this would check msg.sender
        // For now, we'll assume the caller is authorized
    }

    private assertNotPaused(): void {
        if (this.paused) throw new Error('Contract is paused');
    }

    private emitEvent(type: string, data: any): void {
        const event: StakingEvent = {
            type: type as any,
            timestamp: this.now(),
            emitter: data.emitter || this.admin,
            data,
        };
        
        this.events.push(event);
        
        // Keep only recent events to prevent memory bloat
        if (this.events.length > 1000) {
            this.events = this.events.slice(-500);
        }
    }
}
