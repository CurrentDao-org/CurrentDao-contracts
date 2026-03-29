import { IEnergyAMM, LiquidityPosition, PoolStats, SwapResult } from './interfaces/IEnergyAMM';
import { AMMLib } from './libraries/AMMLib';
import { ConcentratedLiquidity } from './liquidity/ConcentratedLiquidity';
import { DynamicFeeCalculator } from './fees/DynamicFeeCalculator';
import { AMMOracle } from './oracles/AMMOracle';

export class EnergyAMM implements IEnergyAMM {
    private reserveA: number = 0;
    private reserveB: number = 0;
    private totalLiquidity: number = 0;
    private currentPrice: number = 1.0;
    private volume24h: number = 0;
    private fees24h: number = 0;

    private cl: ConcentratedLiquidity;
    private feeCalculator: DynamicFeeCalculator;
    private oracle: AMMOracle;

    private isFlashLoanActive: boolean = false;

    constructor(initialPrice: number = 1.0) {
        this.cl = new ConcentratedLiquidity();
        this.feeCalculator = new DynamicFeeCalculator();
        this.oracle = new AMMOracle();
        this.currentPrice = initialPrice;
        this.oracle.updatePrice(initialPrice);
    }

    /**
     * Executes a swap with dynamic fees and price impact modeling.
     */
    async swap(tokenIn: string, tokenOut: string, amountIn: number, minAmountOut: number): Promise<SwapResult> {
        if (this.isFlashLoanActive) throw new Error("Swaps disabled during flash loan.");
        
        // Oracle sanity check to prevent price manipulation
        if (!this.oracle.isPriceStable(this.currentPrice)) {
            throw new Error("Price instability detected by oracle.");
        }

        const isTokenA = tokenIn === 'tokenA';
        const reserveIn = isTokenA ? this.reserveA : this.reserveB;
        const reserveOut = isTokenA ? this.reserveB : this.reserveA;

        if (reserveIn === 0 || reserveOut === 0) throw new Error("Insufficient liquidity.");

        const fee = this.feeCalculator.calculateFee(this.currentPrice);
        const amountOut = AMMLib.calculateAmountOut(reserveIn, reserveOut, amountIn, fee);
        
        if (amountOut < minAmountOut) throw new Error("Slippage tolerance exceeded.");

        const priceImpact = AMMLib.calculatePriceImpact(reserveIn, amountIn);
        
        // Update reserves
        if (isTokenA) {
            this.reserveA += amountIn;
            this.reserveB -= amountOut;
        } else {
            this.reserveB += amountIn;
            this.reserveA -= amountOut;
        }

        this.currentPrice = this.reserveB / this.reserveA;
        this.volume24h += amountIn;
        this.fees24h += amountIn * fee;

        return {
            amountOut,
            fee: amountIn * fee,
            priceImpact,
            newPrice: this.currentPrice
        };
    }

    /**
     * Adds liquidity within a concentrated range.
     */
    async addLiquidity(
        tokenA: string,
        tokenB: string,
        amountA: number,
        amountB: number,
        tickLower: number,
        tickUpper: number
    ): Promise<string> {
        const position = this.cl.addPosition(
            'provider-address', // Hardcoded for simulation
            tickLower,
            tickUpper,
            amountA,
            amountB,
            this.currentPrice
        );

        this.reserveA += amountA;
        this.reserveB += amountB;
        this.totalLiquidity += position.liquidity;
        
        // Update price based on initial liquidity if reserves were zero
        if (this.reserveA > 0) {
            this.currentPrice = this.reserveB / this.reserveA;
        }

        return position.id;
    }

    /**
     * Removes liquidity from a specific position.
     */
    async removeLiquidity(positionId: string, amount: number): Promise<{ amountA: number; amountB: number }> {
        const { amountA, amountB } = this.cl.removePosition(positionId, amount);
        
        this.reserveA -= amountA;
        this.reserveB -= amountB;
        
        // This is a simple IL tracking mechanism
        const pos = this.cl.getPosition(positionId);
        if (pos) {
            this.totalLiquidity -= amount;
        }

        return { amountA, amountB };
    }

    getAmountOut(tokenIn: string, amountIn: number): number {
        const isTokenA = tokenIn === 'tokenA';
        const reserveIn = isTokenA ? this.reserveA : this.reserveB;
        const reserveOut = isTokenA ? this.reserveB : this.reserveA;
        const fee = this.feeCalculator.calculateFee(this.currentPrice);
        
        return AMMLib.calculateAmountOut(reserveIn, reserveOut, amountIn, fee);
    }

    getPriceImpact(tokenIn: string, amountIn: number): number {
        const isTokenA = tokenIn === 'tokenA';
        const reserveIn = isTokenA ? this.reserveA : this.reserveB;
        return AMMLib.calculatePriceImpact(reserveIn, amountIn);
    }

    getImpermanentLoss(provider: string): number {
        const positions = this.cl.getPositionsByProvider(provider);
        let totalIL = 0;
        
        positions.forEach(p => {
            totalIL += AMMLib.calculateImpermanentLoss(p.entryPrice, this.currentPrice);
        });

        return positions.length > 0 ? totalIL / positions.length : 0;
    }

    /**
     * Flash loan protection: ensures no price manipulation during loan.
     */
    async flashLoan(receiver: (amount: number) => Promise<void>, token: string, amount: number): Promise<void> {
        this.isFlashLoanActive = true;
        const isTokenA = token === 'tokenA';
        
        if (isTokenA) {
            if (this.reserveA < amount) throw new Error("Insufficient reserve for flash loan.");
            this.reserveA -= amount;
        } else {
            if (this.reserveB < amount) throw new Error("Insufficient reserve for flash loan.");
            this.reserveB -= amount;
        }

        const reserveBefore = isTokenA ? this.reserveA + amount : this.reserveB + amount;

        try {
            await receiver(amount);
            
            // Repayment check (must be at least reserveBefore to cover original reserve)
            const reserveAfter = isTokenA ? this.reserveA : this.reserveB;
            if (reserveAfter < reserveBefore) {
                throw new Error("Flash loan not repaid.");
            }
        } finally {
            this.isFlashLoanActive = false;
        }
    }

    getPoolStats(): PoolStats {
        return {
            reserveA: this.reserveA,
            reserveB: this.reserveB,
            totalLiquidity: this.totalLiquidity,
            currentPrice: this.currentPrice,
            volume24h: this.volume24h,
            fees24h: this.fees24h
        };
    }

    updateOraclePrice(price: number): void {
        this.oracle.updatePrice(price);
    }
}
