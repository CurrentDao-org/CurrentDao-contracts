import { AMMLib } from '../libraries/AMMLib';
import { LiquidityPosition } from '../interfaces/IEnergyAMM';

export class ConcentratedLiquidity {
    private positions: Map<string, LiquidityPosition> = new Map();
    private ticks: Map<number, number> = new Map(); // tick -> liquidity delta

    /**
     * Adds a liquidity position within a tick range.
     */
    addPosition(
        provider: string,
        tickLower: number,
        tickUpper: number,
        amountA: number,
        amountB: number,
        currentPrice: number
    ): LiquidityPosition {
        const id = `${provider}-${tickLower}-${tickUpper}-${Date.now()}`;
        const sqrtPrice = Math.sqrt(currentPrice);
        const sqrtPL = Math.sqrt(AMMLib.tickToPrice(tickLower));
        const sqrtPU = Math.sqrt(AMMLib.tickToPrice(tickUpper));

        let liquidity = 0;
        if (sqrtPrice <= sqrtPL) {
            liquidity = AMMLib.calculateLiquidityForAmountA(sqrtPL, sqrtPU, amountA);
        } else if (sqrtPrice < sqrtPU) {
            const liqA = AMMLib.calculateLiquidityForAmountA(sqrtPrice, sqrtPU, amountA);
            const liqB = AMMLib.calculateLiquidityForAmountB(sqrtPL, sqrtPrice, amountB);
            liquidity = Math.min(liqA, liqB);
        } else {
            liquidity = AMMLib.calculateLiquidityForAmountB(sqrtPL, sqrtPU, amountB);
        }

        const position: LiquidityPosition = {
            id,
            provider,
            tickLower,
            tickUpper,
            liquidity,
            amountA,
            amountB,
            entryPrice: currentPrice,
            timestamp: Date.now()
        };

        this.positions.set(id, position);
        this.updateTick(tickLower, liquidity);
        this.updateTick(tickUpper, -liquidity);

        return position;
    }

    /**
     * Removes liquidity from a position.
     */
    removePosition(id: string, amount: number): { amountA: number; amountB: number } {
        const position = this.positions.get(id);
        if (!position) throw new Error("Position not found");
        if (amount > position.liquidity) throw new Error("Insufficient liquidity");

        // Simple calculation for return (ignoring current price for now)
        const share = amount / position.liquidity;
        const amountA = position.amountA * share;
        const amountB = position.amountB * share;

        position.liquidity -= amount;
        if (position.liquidity === 0) {
            this.positions.delete(id);
        }

        return { amountA, amountB };
    }

    private updateTick(tick: number, delta: number) {
        const current = this.ticks.get(tick) || 0;
        this.ticks.set(tick, current + delta);
    }

    getPositionsByProvider(provider: string): LiquidityPosition[] {
        return Array.from(this.positions.values()).filter(p => p.provider === provider);
    }

    getPosition(id: string): LiquidityPosition | undefined {
        return this.positions.get(id);
    }
}
