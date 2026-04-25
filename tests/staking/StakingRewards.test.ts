import { StakingRewards } from './StakingRewards';
import { WattToken } from '../token/WattToken';
import { StakingLib, BASIS_POINTS, SECONDS_PER_YEAR } from './libraries/StakingLib';
import type { StakingPool } from './structures/StakingStructs';

describe('StakingRewards', () => {
    let stakingRewards: StakingRewards;
    let wattToken: WattToken;
    let admin: string;
    let staker1: string;
    let staker2: string;
    let mockTime: number;

    beforeEach(() => {
        // Setup mock addresses
        admin = '0xAdmin';
        staker1 = '0xStaker1';
        staker2 = '0xStaker2';
        mockTime = Math.floor(Date.now() / 1000);

        // Create WATT token
        wattToken = new WattToken(admin);
        wattToken.grantMinterRole(admin, admin);
        
        // Mint tokens to stakers
        wattToken.mint(admin, staker1, 10000);
        wattToken.mint(admin, staker2, 10000);

        // Create staking rewards contract
        stakingRewards = new StakingRewards(admin, wattToken, () => mockTime);
    });

    describe('Pool Management', () => {
        it('should create a new staking pool', () => {
            const poolConfig: Omit<StakingPool, 'poolId' | 'totalStaked' | 'totalRewardsDistributed' | 'stakerCount' | 'createdAt'> = {
                name: 'Test Pool',
                baseAPY: 1000, // 10%
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400, // 30 days
                earlyWithdrawalPenalty: 1000, // 10%
                performanceThreshold: 2592000, // 30 days
                performanceBonus: 1500, // 15%
                active: true,
            };

            const poolId = stakingRewards.createPool(poolConfig);
            
            expect(poolId).toBe(1);
            
            const pool = stakingRewards.getPool(poolId);
            expect(pool).toBeTruthy();
            expect(pool!.name).toBe('Test Pool');
            expect(pool!.baseAPY).toBe(1000);
            expect(pool!.totalStaked).toBe(0);
            expect(pool!.stakerCount).toBe(0);
        });

        it('should update pool configuration', () => {
            const poolId = stakingRewards.createPool({
                name: 'Test Pool',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });

            stakingRewards.updatePool(poolId, { baseAPY: 1500, active: false });
            
            const pool = stakingRewards.getPool(poolId);
            expect(pool!.baseAPY).toBe(1500);
            expect(pool!.active).toBe(false);
        });

        it('should retrieve all pools', () => {
            stakingRewards.createPool({
                name: 'Pool 1',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });

            stakingRewards.createPool({
                name: 'Pool 2',
                baseAPY: 1200,
                minStakeAmount: 200,
                maxStakeAmount: 20000,
                maxCapacity: 200000,
                lockupPeriod: 60 * 86400,
                earlyWithdrawalPenalty: 1500,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });

            const pools = stakingRewards.getAllPools();
            expect(pools).toHaveLength(2);
            expect(pools[0].name).toBe('Pool 1');
            expect(pools[1].name).toBe('Pool 2');
        });
    });

    describe('Staking Operations', () => {
        let poolId: number;

        beforeEach(() => {
            poolId = stakingRewards.createPool({
                name: 'Test Pool',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });
        });

        it('should stake tokens successfully', () => {
            const stakeAmount = 1000;
            const position = stakingRewards.stake(staker1, poolId, stakeAmount);

            expect(position.staker).toBe(staker1);
            expect(position.amount).toBe(stakeAmount);
            expect(position.active).toBe(true);
            expect(position.votingWeight).toBeGreaterThan(0);

            const stakerPositions = stakingRewards.getStakerPositions(staker1);
            expect(stakerPositions).toHaveLength(1);
            expect(stakerPositions[0].positionId).toBe(position.positionId);

            const pool = stakingRewards.getPool(poolId);
            expect(pool!.totalStaked).toBe(stakeAmount);
            expect(pool!.stakerCount).toBe(1);
        });

        it('should validate staking parameters', () => {
            // Test minimum amount
            expect(() => stakingRewards.stake(staker1, poolId, 50)).toThrow('Amount below minimum');

            // Test maximum amount
            expect(() => stakingRewards.stake(staker1, poolId, 20000)).toThrow('Amount above maximum');

            // Test insufficient balance
            expect(() => stakingRewards.stake(staker1, poolId, 15000)).toThrow('Insufficient WATT token balance');
        });

        it('should unstake tokens with penalty', () => {
            const stakeAmount = 1000;
            const position = stakingRewards.stake(staker1, poolId, stakeAmount);

            // Unstake immediately (should incur penalty)
            const result = stakingRewards.unstake(staker1, position.positionId, stakeAmount);

            expect(result.received).toBeLessThan(stakeAmount);
            expect(result.penalty).toBeGreaterThan(0);
            expect(result.rewards).toBeGreaterThanOrEqual(0);

            // Position should be inactive
            expect(stakingRewards.getPosition(staker1, position.positionId)).toBeNull();
        });

        it('should unstake tokens without penalty after lockup', () => {
            const stakeAmount = 1000;
            const lockupPeriod = 30 * 86400;
            const position = stakingRewards.stake(staker1, poolId, stakeAmount);

            // Fast forward past lockup period
            mockTime += lockupPeriod + 1;

            const result = stakingRewards.unstake(staker1, position.positionId, stakeAmount);

            expect(result.received).toBe(stakeAmount); // No penalty
            expect(result.penalty).toBe(0);
        });

        it('should handle partial unstaking', () => {
            const stakeAmount = 1000;
            const position = stakingRewards.stake(staker1, poolId, stakeAmount);

            const unstakeAmount = 400;
            const result = stakingRewards.unstake(staker1, position.positionId, unstakeAmount);

            expect(result.received).toBeLessThan(unstakeAmount); // Penalty applied

            // Position should still be active with reduced amount
            const updatedPosition = stakingRewards.getPosition(staker1, position.positionId);
            expect(updatedPosition).toBeTruthy();
            expect(updatedPosition!.amount).toBe(stakeAmount - unstakeAmount);
            expect(updatedPosition!.active).toBe(true);
        });
    });

    describe('Rewards Management', () => {
        let poolId: number;

        beforeEach(() => {
            poolId = stakingRewards.createPool({
                name: 'Test Pool',
                baseAPY: 1000, // 10%
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });
        });

        it('should calculate pending rewards', () => {
            const stakeAmount = 1000;
            const position = stakingRewards.stake(staker1, poolId, stakeAmount);

            // Fast forward 30 days
            mockTime += 30 * 86400;

            const pendingRewards = stakingRewards.getPendingRewards(position.positionId);
            
            // Expected: 1000 * 10% * (30/365) ≈ 82
            expect(pendingRewards).toBeGreaterThan(80);
            expect(pendingRewards).toBeLessThan(85);
        });

        it('should claim rewards successfully', () => {
            const stakeAmount = 1000;
            const position = stakingRewards.stake(staker1, poolId, stakeAmount);

            // Fast forward 30 days
            mockTime += 30 * 86400;

            const claimedRewards = stakingRewards.claimRewards(staker1, position.positionId);
            expect(claimedRewards).toBeGreaterThan(80);

            // Pending rewards should be reset
            const pendingRewards = stakingRewards.getPendingRewards(position.positionId);
            expect(pendingRewards).toBe(0);
        });

        it('should claim all rewards for staker', () => {
            // Create multiple positions
            const position1 = stakingRewards.stake(staker1, poolId, 500);
            const position2 = stakingRewards.stake(staker1, poolId, 300);

            // Fast forward 30 days
            mockTime += 30 * 86400;

            const totalRewards = stakingRewards.claimAllRewards(staker1);
            expect(totalRewards).toBeGreaterThan(0);

            // All pending rewards should be claimed
            const pending1 = stakingRewards.getPendingRewards(position1.positionId);
            const pending2 = stakingRewards.getPendingRewards(position2.positionId);
            expect(pending1).toBe(0);
            expect(pending2).toBe(0);
        });

        it('should distribute rewards to pool', () => {
            stakingRewards.stake(staker1, poolId, 1000);
            stakingRewards.stake(staker2, poolId, 2000);

            const distributionAmount = 500;
            const distribution = stakingRewards.distributeRewards(poolId, distributionAmount, 'regular');

            expect(distribution.poolId).toBe(poolId);
            expect(distribution.totalAmount).toBe(distributionAmount);
            expect(distribution.distributionType).toBe('regular');
            expect(distribution.stakerCount).toBe(2);

            const history = stakingRewards.getRewardHistory(poolId);
            expect(history).toHaveLength(1);
            expect(history[0].distributionId).toBe(distribution.distributionId);
        });
    });

    describe('Governance Integration', () => {
        let poolId: number;

        beforeEach(() => {
            poolId = stakingRewards.createPool({
                name: 'Governance Pool',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 90 * 86400, // 90 days for higher governance weight
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });
        });

        it('should calculate voting weight based on stake and lockup', () => {
            const stakeAmount = 1000;
            const lockupDuration = 90 * 86400; // 90 days
            
            const position = stakingRewards.stake(staker1, poolId, stakeAmount, lockupDuration);
            const rights = stakingRewards.getGovernanceRights(staker1);

            expect(rights.totalVotingWeight).toBeGreaterThan(0);
            expect(rights.votingWeights.get(poolId)).toBe(position.votingWeight);
        });

        it('should delegate voting weight', () => {
            stakingRewards.stake(staker1, poolId, 1000);
            stakingRewards.stake(staker2, poolId, 500);

            const delegatorRightsBefore = stakingRewards.getGovernanceRights(staker1);
            const delegateeRightsBefore = stakingRewards.getGovernanceRights(staker2);

            stakingRewards.delegateVotingWeight(staker1, staker2);

            const delegatorRightsAfter = stakingRewards.getGovernanceRights(staker1);
            const delegateeRightsAfter = stakingRewards.getGovernanceRights(staker2);

            expect(delegatorRightsAfter.delegatedTo).toBe(staker2);
            expect(delegatorRightsAfter.delegatedWeight).toBe(delegatorRightsBefore.totalVotingWeight);
            expect(delegateeRightsAfter.totalVotingWeight).toBe(
                delegateeRightsBefore.totalVotingWeight + delegatorRightsBefore.totalVotingWeight
            );
        });

        it('should update voting weights after position changes', () => {
            const stakeAmount = 1000;
            stakingRewards.stake(staker1, poolId, stakeAmount);

            const initialRights = stakingRewards.getGovernanceRights(staker1);
            expect(initialRights.totalVotingWeight).toBeGreaterThan(0);

            // Unstake partially
            const positions = stakingRewards.getStakerPositions(staker1);
            stakingRewards.unstake(staker1, positions[0].positionId, 400);

            const updatedRights = stakingRewards.getGovernanceRights(staker1);
            expect(updatedRights.totalVotingWeight).toBeLessThan(initialRights.totalVotingWeight);
        });
    });

    describe('Performance Tracking', () => {
        let poolId: number;

        beforeEach(() => {
            poolId = stakingRewards.createPool({
                name: 'Performance Pool',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000, // 30 days
                performanceBonus: 1500, // 15%
                active: true,
            });
        });

        it('should calculate performance multiplier for long-term stakers', () => {
            const stakeAmount = 1000;
            const longLockup = 60 * 86400; // 60 days
            const shortLockup = 15 * 86400; // 15 days

            const longPosition = stakingRewards.stake(staker1, poolId, stakeAmount, longLockup);
            const shortPosition = stakingRewards.stake(staker2, poolId, stakeAmount, shortLockup);

            // Fast forward past performance threshold
            mockTime += 35 * 86400; // 35 days

            const longMultiplier = stakingRewards.calculatePerformanceMultiplier(
                longPosition.lockupDuration,
                longPosition.stakedAt
            );

            const shortMultiplier = stakingRewards.calculatePerformanceMultiplier(
                shortPosition.lockupDuration,
                shortPosition.stakedAt
            );

            expect(longMultiplier).toBeGreaterThan(BASIS_POINTS); // Should have bonus
            expect(shortMultiplier).toBe(BASIS_POINTS); // No bonus for short-term
        });

        it('should provide pool performance metrics', () => {
            // Create mixed positions
            stakingRewards.stake(staker1, poolId, 1000, 60 * 86400); // Long-term
            stakingRewards.stake(staker2, poolId, 500, 15 * 86400);  // Short-term

            // Fast forward to make some long-term
            mockTime += 35 * 86400;

            const metrics = stakingRewards.getPoolPerformanceMetrics(poolId);

            expect(metrics.longTermStakers).toBeGreaterThanOrEqual(0);
            expect(metrics.averageMultiplier).toBeGreaterThanOrEqual(BASIS_POINTS);
            expect(metrics.retentionRate).toBeGreaterThanOrEqual(0);
        });

        it('should award performance bonuses', () => {
            stakingRewards.stake(staker1, poolId, 1000, 60 * 86400);

            // Fast forward to qualify for performance bonus
            mockTime += 35 * 86400;

            const bonuses = stakingRewards.awardPerformanceBonuses(poolId);

            expect(bonuses.length).toBeGreaterThan(0);
            expect(bonuses[0].distributionType).toBe('performance');
        });
    });

    describe('Gas Optimization', () => {
        let poolId: number;

        beforeEach(() => {
            poolId = stakingRewards.createPool({
                name: 'Gas Optimized Pool',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });
        });

        it('should estimate gas costs for operations', () => {
            const stakeCost = stakingRewards.estimateGasCost('stake', { batchSize: 1 });
            const unstakeCost = stakingRewards.estimateGasCost('unstake', { batchSize: 1 });
            const claimCost = stakingRewards.estimateGasCost('claim', { batchSize: 1 });
            const batchCost = stakingRewards.estimateGasCost('unstake', { batchSize: 50 });

            expect(stakeCost).toBeGreaterThan(0);
            expect(unstakeCost).toBeGreaterThan(0);
            expect(claimCost).toBeGreaterThan(0);
            expect(batchCost).toBeLessThan(unstakeCost * 50); // Batch discount
        });

        it('should batch calculate rewards', () => {
            const position1 = stakingRewards.stake(staker1, poolId, 1000);
            const position2 = stakingRewards.stake(staker2, poolId, 500);

            // Fast forward
            mockTime += 30 * 86400;

            const batchRewards = stakingRewards.batchCalculateRewards([
                position1.positionId,
                position2.positionId,
            ]);

            expect(batchRewards.size).toBe(2);
            expect(batchRewards.get(position1.positionId)).toBeGreaterThan(0);
            expect(batchRewards.get(position2.positionId)).toBeGreaterThan(0);
        });

        it('should batch unstake operations', () => {
            const position1 = stakingRewards.stake(staker1, poolId, 1000);
            const position2 = stakingRewards.stake(staker2, poolId, 500);

            const batchResults = stakingRewards.batchUnstake([
                { staker: staker1, positionId: position1.positionId, amount: 500 },
                { staker: staker2, positionId: position2.positionId, amount: 250 },
            ]);

            expect(batchResults).toHaveLength(2);
            expect(batchResults[0].received).toBeLessThan(500); // Penalty applied
            expect(batchResults[1].received).toBeLessThan(250); // Penalty applied
        });
    });

    describe('Analytics and Reporting', () => {
        let poolId: number;

        beforeEach(() => {
            poolId = stakingRewards.createPool({
                name: 'Analytics Pool',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });
        });

        it('should provide comprehensive staking metrics', () => {
            stakingRewards.stake(staker1, poolId, 1000);
            stakingRewards.stake(staker2, poolId, 500);

            const metrics = stakingRewards.getStakingMetrics();

            expect(metrics.totalValueLocked).toBe(1500);
            expect(metrics.totalStakers).toBe(2);
            expect(metrics.totalRewardsDistributed).toBe(0);
            expect(metrics.poolUtilization.has(poolId)).toBe(true);
            expect(metrics.performanceMetrics.longTermStakers).toBeGreaterThanOrEqual(0);
        });

        it('should provide pool statistics', () => {
            stakingRewards.stake(staker1, poolId, 1000, 60 * 86400);

            const stats = stakingRewards.getPoolStats(poolId);

            expect(stats.totalStaked).toBe(1000);
            expect(stats.utilization).toBeGreaterThan(0);
            expect(stats.currentAPY).toBeGreaterThan(0);
            expect(stats.averageLockup).toBe(60 * 86400);
            expect(stats.stakerCount).toBe(1);
        });

        it('should provide staker statistics', () => {
            const position = stakingRewards.stake(staker1, poolId, 1000);

            // Fast forward and claim rewards
            mockTime += 30 * 86400;
            stakingRewards.claimRewards(staker1, position.positionId);

            const stats = stakingRewards.getStakerStats(staker1);

            expect(stats.totalStaked).toBe(1000);
            expect(stats.totalEarned).toBeGreaterThan(0);
            expect(stats.averageLockup).toBe(position.lockupDuration);
            expect(stats.votingWeight).toBeGreaterThan(0);
            expect(stats.positionCount).toBe(1);
        });
    });

    describe('Emergency Functions', () => {
        let poolId: number;

        beforeEach(() => {
            poolId = stakingRewards.createPool({
                name: 'Emergency Pool',
                baseAPY: 1000,
                minStakeAmount: 100,
                maxStakeAmount: 10000,
                maxCapacity: 100000,
                lockupPeriod: 30 * 86400,
                earlyWithdrawalPenalty: 1000,
                performanceThreshold: 2592000,
                performanceBonus: 1500,
                active: true,
            });
        });

        it('should pause and unpause contract', () => {
            stakingRewards.emergencyPause();

            expect(() => stakingRewards.stake(staker1, poolId, 1000)).toThrow('Contract is paused');

            stakingRewards.emergencyUnpause();
            
            expect(() => stakingRewards.stake(staker1, poolId, 1000)).not.toThrow();
        });

        it('should provide emergency unstake with reduced penalties', () => {
            const position = stakingRewards.stake(staker1, poolId, 1000);

            const normalResult = stakingRewards.unstake(staker1, position.positionId, 1000);
            
            // Stake again for emergency test
            const position2 = stakingRewards.stake(staker1, poolId, 1000);
            const emergencyResult = stakingRewards.emergencyUnstake(staker1, position2.positionId);

            expect(emergencyResult.penalty).toBeLessThan(normalResult.penalty);
        });

        it('should provide contract status', () => {
            stakingRewards.stake(staker1, poolId, 1000);

            const status = stakingRewards.getContractStatus();

            expect(status.paused).toBe(false);
            expect(status.totalPools).toBe(1);
            expect(status.totalStakers).toBe(1);
            expect(status.totalValueLocked).toBe(1000);
        });
    });

    describe('Library Functions', () => {
        it('should validate staking parameters correctly', () => {
            const validParams = StakingLib.validateStakingParams(
                1000, // amount
                100,  // minStake
                10000, // maxStake
                30 * 86400, // lockupDuration
                100000, // poolCapacity
                50000 // currentStaked
            );

            expect(validParams.valid).toBe(true);

            const invalidParams = StakingLib.validateStakingParams(
                50, // amount below minimum
                100,
                10000,
                30 * 86400,
                100000,
                50000
            );

            expect(invalidParams.valid).toBe(false);
            expect(invalidParams.error).toBe('Amount below minimum');
        });

        it('should calculate performance multiplier correctly', () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const stakedAt = currentTime - 35 * 86400; // 35 days ago
            const lockupDuration = 60 * 86400; // 60 days

            const multiplier = StakingLib.calculatePerformanceMultiplier(
                lockupDuration,
                stakedAt,
                currentTime
            );

            expect(multiplier).toBeGreaterThan(BASIS_POINTS);
        });

        it('should calculate voting weight correctly', () => {
            const amount = 1000;
            const lockupDuration = 90 * 86400; // 90 days
            const performanceMultiplier = BASIS_POINTS + 500; // 5% bonus

            const weight = StakingLib.calculateVotingWeight(
                amount,
                lockupDuration,
                performanceMultiplier
            );

            expect(weight).toBeGreaterThan(0);
            expect(weight).toBeLessThan(amount * 2); // Should be reasonable
        });
    });
});
