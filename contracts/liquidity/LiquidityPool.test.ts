/**
 * Liquidity Pool Contract Tests
 * Comprehensive test suite for liquidity pool functionality
 */

import { LiquidityPool } from './LiquidityPool';
import { PoolType } from './structures/LiquidityStructs';

describe('LiquidityPool', () => {
  let liquidityPool: LiquidityPool;
  let poolId: string;
  let user1: string;
  let user2: string;

  beforeEach(() => {
    liquidityPool = new LiquidityPool();
    user1 = '0x1234567890123456789012345678901234567890';
    user2 = '0x0987654321098765432109876543210987654321';
  });

  describe('Pool Creation', () => {
    it('should create a standard liquidity pool', () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      const pool = liquidityPool.getPool(poolId);
      expect(pool.tokenA).toBe('WATT');
      expect(pool.tokenB).toBe('USDC');
      expect(pool.feeRate).toBe(0.3);
      expect(pool.reserveA).toBe(0n);
      expect(pool.reserveB).toBe(0n);
    });

    it('should create an energy asset pool', () => {
      poolId = liquidityPool.createEnergyPool(
        'WATT',
        'USDC',
        0.3,
        'SOLAR',
        1000000n,
        500000n,
        0.85
      );
      
      const energyPool = liquidityPool.getEnergyPool(poolId);
      expect(energyPool.energyType).toBe('SOLAR');
      expect(energyPool.productionRate).toBe(1000000n);
      expect(energyPool.consumptionRate).toBe(500000n);
      expect(energyPool.efficiency).toBe(0.85);
    });

    it('should throw error for invalid fee rate', () => {
      expect(() => {
        liquidityPool.createPool('WATT', 'USDC', 0, PoolType.STANDARD);
      }).toThrow('Invalid fee rate');

      expect(() => {
        liquidityPool.createPool('WATT', 'USDC', 1.5, PoolType.STANDARD);
      }).toThrow('Invalid fee rate');
    });

    it('should throw error for identical tokens', () => {
      expect(() => {
        liquidityPool.createPool('WATT', 'WATT', 0.3, PoolType.STANDARD);
      }).toThrow('Tokens must be different');
    });

    it('should throw error for duplicate pool', () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      expect(() => {
        liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      }).toThrow('Pool already exists');
    });
  });

  describe('Add Liquidity', () => {
    beforeEach(() => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
    });

    it('should add liquidity to empty pool', async () => {
      const result = await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });

      expect(result).toBe(poolId);
      
      const pool = liquidityPool.getPool(poolId);
      expect(pool.reserveA).toBe(1000n);
      expect(pool.reserveB).toBe(2000n);
      expect(pool.totalLiquidity).toBeGreaterThan(0n);
    });

    it('should add liquidity to existing pool', async () => {
      // First liquidity provider
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });

      // Second liquidity provider
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 500n,
        amountB: 1000n,
        amountAMin: 450n,
        amountBMin: 900n,
        to: user2,
        deadline: BigInt(Date.now() + 10000)
      });

      const pool = liquidityPool.getPool(poolId);
      expect(pool.reserveA).toBe(1500n);
      expect(pool.reserveB).toBe(3000n);
    });

    it('should throw error for expired transaction', async () => {
      await expect(liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() - 10000) // Expired
      })).rejects.toThrow('Transaction expired');
    });

    it('should throw error for slippage exceeded', async () => {
      await expect(liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 1500n, // Too high
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      })).rejects.toThrow('Slippage exceeded');
    });
  });

  describe('Remove Liquidity', () => {
    beforeEach(async () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      // Add liquidity first
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });
    });

    it('should remove liquidity successfully', async () => {
      const position = liquidityPool.getPosition(user1, poolId);
      const liquidityToRemove = position.liquidityAmount / 2n;

      await liquidityPool.removeLiquidity({
        poolId,
        liquidity: liquidityToRemove,
        amountAMin: 400n,
        amountBMin: 800n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });

      const pool = liquidityPool.getPool(poolId);
      expect(pool.reserveA).toBeLessThan(1000n);
      expect(pool.reserveB).toBeLessThan(2000n);
    });

    it('should throw error for insufficient liquidity', async () => {
      await expect(liquidityPool.removeLiquidity({
        poolId,
        liquidity: 999999999n, // More than available
        amountAMin: 1n,
        amountBMin: 1n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      })).rejects.toThrow('Insufficient liquidity');
    });
  });

  describe('Swap Operations', () => {
    beforeEach(async () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      // Add liquidity
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });
    });

    it('should execute swap successfully', async () => {
      const amountOut = await liquidityPool.swap({
        tokenIn: 'WATT',
        tokenOut: 'USDC',
        amountIn: 100n,
        amountOutMin: 150n,
        to: user2,
        deadline: BigInt(Date.now() + 10000)
      });

      expect(amountOut).toBeGreaterThan(150n);
      expect(amountOut).toBeLessThan(200n); // Should be less than ideal due to fees and slippage
    });

    it('should throw error for insufficient liquidity', async () => {
      await expect(liquidityPool.swap({
        tokenIn: 'WATT',
        tokenOut: 'USDC',
        amountIn: 5000n, // Too large
        amountOutMin: 1n,
        to: user2,
        deadline: BigInt(Date.now() + 10000)
      })).rejects.toThrow('Insufficient liquidity');
    });

    it('should throw error for slippage exceeded', async () => {
      await expect(liquidityPool.swap({
        tokenIn: 'WATT',
        tokenOut: 'USDC',
        amountIn: 100n,
        amountOutMin: 300n, // Too high expectation
        to: user2,
        deadline: BigInt(Date.now() + 10000)
      })).rejects.toThrow('Slippage exceeded');
    });
  });

  describe('Position Management', () => {
    beforeEach(async () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });
    });

    it('should get user position', () => {
      const position = liquidityPool.getPosition(user1, poolId);
      expect(position.owner).toBe(user1);
      expect(position.poolId).toBe(poolId);
      expect(position.liquidityAmount).toBeGreaterThan(0n);
    });

    it('should get all user positions', () => {
      const positions = liquidityPool.getUserPositions(user1);
      expect(positions).toHaveLength(1);
      expect(positions[0].poolId).toBe(poolId);
    });

    it('should throw error for non-existent position', () => {
      expect(() => {
        liquidityPool.getPosition(user2, poolId);
      }).toThrow('Position not found');
    });
  });

  describe('Reward System', () => {
    beforeEach(async () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });
    });

    it('should update rewards', () => {
      liquidityPool.updateReward(poolId);
      const rewardInfo = liquidityPool.getRewardInfo(poolId);
      expect(rewardInfo.poolId).toBe(poolId);
      expect(rewardInfo.rewardToken).toBe('WATT');
      expect(rewardInfo.rewardRate).toBe(1000n);
    });

    it('should claim rewards', async () => {
      // Wait a bit to accumulate rewards
      await new Promise(resolve => setTimeout(resolve, 100));
      
      liquidityPool.updateReward(poolId);
      const rewardAmount = await liquidityPool.claimReward(poolId, user1);
      
      expect(rewardAmount).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('Impermanent Loss Protection', () => {
    beforeEach(async () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });
    });

    it('should calculate impermanent loss', () => {
      const position = liquidityPool.getPosition(user1, poolId);
      const impermanentLoss = liquidityPool.calculateImpermanentLoss(position);
      expect(typeof impermanentLoss).toBe('number');
    });

    it('should apply impermanent loss protection', async () => {
      const position = liquidityPool.getPosition(user1, poolId);
      const protectionAmount = await liquidityPool.applyImpermanentLossProtection(position);
      expect(typeof protectionAmount).toBe('bigint');
    });
  });

  describe('Pool Metrics', () => {
    beforeEach(async () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });
    });

    it('should get pool metrics', () => {
      const metrics = liquidityPool.getPoolMetrics(poolId);
      expect(metrics.tvl).toBe(3000n);
      expect(typeof metrics.apr).toBe('number');
      expect(typeof metrics.utilizationRate).toBe('number');
      expect(typeof metrics.slippage).toBe('number');
    });

    it('should get pool TVL', () => {
      const tvl = liquidityPool.getPoolTVL(poolId);
      expect(tvl).toBe(3000n);
    });

    it('should get pool APR', () => {
      const apr = liquidityPool.getPoolAPR(poolId);
      expect(typeof apr).toBe('number');
    });
  });

  describe('Energy Pool Operations', () => {
    beforeEach(() => {
      poolId = liquidityPool.createEnergyPool(
        'WATT',
        'USDC',
        0.3,
        'SOLAR',
        1000000n,
        500000n,
        0.85
      );
    });

    it('should get energy pool', () => {
      const energyPool = liquidityPool.getEnergyPool(poolId);
      expect(energyPool.energyType).toBe('SOLAR');
      expect(energyPool.productionRate).toBe(1000000n);
      expect(energyPool.consumptionRate).toBe(500000n);
      expect(energyPool.efficiency).toBe(0.85);
    });

    it('should update energy metrics', () => {
      liquidityPool.updateEnergyMetrics(poolId, 1200000n, 600000n, 0.90);
      
      const energyPool = liquidityPool.getEnergyPool(poolId);
      expect(energyPool.productionRate).toBe(1200000n);
      expect(energyPool.consumptionRate).toBe(600000n);
      expect(energyPool.efficiency).toBe(0.90);
    });

    it('should throw error for non-energy pool', () => {
      const standardPoolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      expect(() => {
        liquidityPool.getEnergyPool(standardPoolId);
      }).toThrow('Energy pool not found');
    });
  });

  describe('Governance Functions', () => {
    beforeEach(() => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
    });

    it('should set fee rate', () => {
      liquidityPool.setFeeRate(poolId, 0.5);
      const pool = liquidityPool.getPool(poolId);
      expect(pool.feeRate).toBe(0.5);
    });

    it('should throw error for invalid fee rate', () => {
      expect(() => {
        liquidityPool.setFeeRate(poolId, 0);
      }).toThrow('Invalid fee rate');
    });

    it('should set reward rate', () => {
      liquidityPool.setRewardRate(poolId, 'WATT', 2000n);
      const rewardInfo = liquidityPool.getRewardInfo(poolId);
      expect(rewardInfo.rewardRate).toBe(2000n);
    });

    it('should pause and unpause pool', () => {
      liquidityPool.pausePool(poolId);
      
      // Pool should be paused, operations should fail
      expect(() => {
        liquidityPool.getSwapAmountOut(poolId, 100n, 'WATT');
      }).not.toThrow(); // Get amount should still work
      
      liquidityPool.unpausePool(poolId);
      // Pool should be unpaused
    });
  });

  describe('Emergency Functions', () => {
    beforeEach(async () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      await liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });
    });

    it('should emergency withdraw', async () => {
      const position = liquidityPool.getPosition(user1, poolId);
      const initialReserveA = liquidityPool.getPool(poolId).reserveA;
      const initialReserveB = liquidityPool.getPool(poolId).reserveB;

      await liquidityPool.emergencyWithdraw(poolId, user1);

      const pool = liquidityPool.getPool(poolId);
      expect(pool.reserveA).toBeLessThan(initialReserveA);
      expect(pool.reserveB).toBeLessThan(initialReserveB);
    });

    it('should emergency pause', () => {
      liquidityPool.emergencyPause(poolId);
      // Pool should be paused
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
    });

    it('should get swap amount out', () => {
      // Add some liquidity first
      liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });

      const amountOut = liquidityPool.getSwapAmountOut(poolId, 100n, 'WATT');
      expect(amountOut).toBeGreaterThan(0n);
      expect(amountOut).toBeLessThan(200n);
    });

    it('should get swap amount in', () => {
      // Add some liquidity first
      liquidityPool.addLiquidity({
        tokenA: 'WATT',
        tokenB: 'USDC',
        amountA: 1000n,
        amountB: 2000n,
        amountAMin: 950n,
        amountBMin: 1900n,
        to: user1,
        deadline: BigInt(Date.now() + 10000)
      });

      const amountIn = liquidityPool.getSwapAmountIn(poolId, 100n, 'USDC');
      expect(amountIn).toBeGreaterThan(0n);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero liquidity pools', () => {
      poolId = liquidityPool.createPool('WATT', 'USDC', 0.3, PoolType.STANDARD);
      
      expect(() => {
        liquidityPool.getSwapAmountOut(poolId, 100n, 'WATT');
      }).toThrow('Insufficient liquidity');
    });

    it('should handle non-existent pools', () => {
      expect(() => {
        liquidityPool.getPool('non-existent');
      }).toThrow('Pool not found');
    });

    it('should handle all pools query', () => {
      const allPools = liquidityPool.getAllPools();
      expect(Array.isArray(allPools)).toBe(true);
      // Should include the default energy pool created in constructor
      expect(allPools.length).toBeGreaterThanOrEqual(1);
    });
  });
});
