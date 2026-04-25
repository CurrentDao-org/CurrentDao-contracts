/**
 * Automated Market Making Library
 * Provides AMM algorithms for liquidity pools
 */

import {
  LiquidityPool,
  SwapParams,
  AddLiquidityParams,
  RemoveLiquidityParams,
  PoolMetrics,
  ImpermanentLossProtection
} from '../structures/LiquidityStructs';

export class AMMLib {
  // Constants for AMM calculations
  private static readonly MINIMUM_LIQUIDITY = 1000n;
  private static readonly BASIS_POINTS = 10000;
  private static readonly FEE_DENOMINATOR = 10000;
  
  /**
   * Calculate swap output amount using constant product formula
   * x * y = k (constant)
   */
  static getAmountOut(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeRate: number
  ): bigint {
    if (reserveIn === 0n || reserveOut === 0n) {
      throw new Error('Insufficient liquidity');
    }
    
    // Apply fee
    const feeAmount = (amountIn * BigInt(Math.floor(feeRate * 100))) / BigInt(this.FEE_DENOMINATOR);
    const amountInWithFee = amountIn - feeAmount;
    
    // Calculate output using constant product formula
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    const amountOut = numerator / denominator;
    
    if (amountOut >= reserveOut) {
      throw new Error('Insufficient liquidity for swap');
    }
    
    return amountOut;
  }
  
  /**
   * Calculate required input amount for desired output
   */
  static getAmountIn(
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeRate: number
  ): bigint {
    if (reserveOut === 0n || amountOut >= reserveOut) {
      throw new Error('Insufficient liquidity');
    }
    
    const numerator = reserveIn * amountOut;
    const denominator = reserveOut - amountOut;
    const amountInBeforeFee = (numerator / denominator) + 1n;
    
    // Add fee
    const feeRateBasisPoints = BigInt(Math.floor(feeRate * 100));
    const feeAmount = (amountInBeforeFee * feeRateBasisPoints) / (BigInt(this.FEE_DENOMINATOR) - feeRateBasisPoints);
    const amountIn = amountInBeforeFee + feeAmount;
    
    return amountIn;
  }
  
  /**
   * Calculate liquidity amounts when adding liquidity
   */
  static getLiquidityAmounts(
    amountA: bigint,
    amountB: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalLiquidity: bigint
  ): { liquidity: bigint; amountA: bigint; amountB: bigint } {
    if (reserveA === 0n && reserveB === 0n) {
      // First liquidity provider
      const liquidity = amountA * amountB;
      return {
        liquidity: liquidity > this.MINIMUM_LIQUIDITY ? liquidity : this.MINIMUM_LIQUIDITY,
        amountA,
        amountB
      };
    }
    
    // Calculate optimal amount B based on ratio
    const optimalAmountB = (amountA * reserveB) / reserveA;
    
    let finalAmountA = amountA;
    let finalAmountB = amountB;
    
    if (optimalAmountB <= amountB) {
      finalAmountB = optimalAmountB;
    } else {
      finalAmountA = (amountB * reserveA) / reserveB;
    }
    
    const liquidity = (finalAmountA * totalLiquidity) / reserveA;
    
    return {
      liquidity: liquidity > this.MINIMUM_LIQUIDITY ? liquidity : this.MINIMUM_LIQUIDITY,
      amountA: finalAmountA,
      amountB: finalAmountB
    };
  }
  
  /**
   * Calculate token amounts when removing liquidity
   */
  static getRemoveLiquidityAmounts(
    liquidity: bigint,
    totalLiquidity: bigint,
    reserveA: bigint,
    reserveB: bigint
  ): { amountA: bigint; amountB: bigint } {
    const amountA = (liquidity * reserveA) / totalLiquidity;
    const amountB = (liquidity * reserveB) / totalLiquidity;
    
    return { amountA, amountB };
  }
  
  /**
   * Calculate slippage for a swap
   */
  static calculateSlippage(
    amountIn: bigint,
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    if (reserveIn === 0n || reserveOut === 0n) return 0;
    
    // Calculate theoretical price without slippage
    const theoreticalPrice = Number(reserveIn) / Number(reserveOut);
    
    // Calculate actual price with slippage
    const actualPrice = Number(amountIn) / Number(amountOut);
    
    // Calculate slippage percentage
    const slippage = Math.abs((actualPrice - theoreticalPrice) / theoreticalPrice) * 100;
    
    return slippage;
  }
  
  /**
   * Calculate impermanent loss
   */
  static calculateImpermanentLoss(
    initialPrice: number,
    currentPrice: number
  ): number {
    if (initialPrice === 0) return 0;
    
    const priceRatio = currentPrice / initialPrice;
    const sqrtPriceRatio = Math.sqrt(priceRatio);
    
    // Impermanent loss formula: 2 * sqrt(r) / (1 + r) - 1
    const impermanentLoss = (2 * sqrtPriceRatio) / (1 + priceRatio) - 1;
    
    return impermanentLoss < 0 ? Math.abs(impermanentLoss) : 0;
  }
  
  /**
   * Calculate pool metrics
   */
  static calculatePoolMetrics(
    pool: LiquidityPool,
    volume24h: bigint,
    fees24h: bigint
  ): PoolMetrics {
    const tvl = pool.reserveA + pool.reserveB;
    const utilizationRate = volume24h > 0n ? Number(volume24h) / Number(tvl) : 0;
    const apr = fees24h > 0n && tvl > 0n ? (Number(fees24h) * 365 * 100) / Number(tvl) : 0;
    
    // Calculate average slippage (simplified)
    const slippage = this.calculateSlippage(
      pool.reserveA / 100n, // 1% of reserve A
      this.getAmountOut(pool.reserveA / 100n, pool.reserveA, pool.reserveB, pool.feeRate),
      pool.reserveA,
      pool.reserveB
    );
    
    return {
      volume24h,
      fees24h,
      tvl,
      apr,
      utilizationRate,
      slippage
    };
  }
  
  /**
   * Validate K invariant (x * y = k)
   */
  static validateKInvariant(
    reserveA: bigint,
    reserveB: bigint,
    k: bigint
  ): boolean {
    const currentK = reserveA * reserveB;
    // Allow small deviation due to rounding
    const deviation = currentK > k ? currentK - k : k - currentK;
    const maxDeviation = k / 1000n; // 0.1% tolerance
    
    return deviation <= maxDeviation;
  }
  
  /**
   * Calculate optimal fee rate based on pool volatility
   */
  static calculateOptimalFeeRate(
    volatility: number,
    volume24h: bigint,
    tvl: bigint
  ): number {
    // Base fee rate
    let feeRate = 0.3; // 0.3% standard
    
    // Adjust for volatility
    if (volatility > 0.1) { // High volatility
      feeRate = Math.min(feeRate * 2, 1.0); // Cap at 1%
    } else if (volatility < 0.02) { // Low volatility
      feeRate = Math.max(feeRate * 0.5, 0.05); // Minimum 0.05%
    }
    
    // Adjust for volume to TVL ratio
    const volumeToTVL = Number(volume24h) / Number(tvl);
    if (volumeToTVL > 0.5) { // High volume
      feeRate = Math.max(feeRate * 0.8, 0.05);
    }
    
    return Math.round(feeRate * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Calculate impermanent loss protection amount
   */
  static calculateProtectionAmount(
    positionValue: bigint,
    impermanentLoss: number,
    protectionRate: number
  ): bigint {
    if (impermanentLoss <= 0 || protectionRate <= 0) return 0n;
    
    const lossAmount = (positionValue * BigInt(Math.floor(impermanentLoss * 10000))) / 10000n;
    const protectionAmount = (lossAmount * BigInt(Math.floor(protectionRate * 10000))) / 10000n;
    
    return protectionAmount;
  }
}
