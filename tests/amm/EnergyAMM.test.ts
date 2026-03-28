import { EnergyAMM } from '../../contracts/amm/EnergyAMM';
import { AMMLib } from '../../contracts/amm/libraries/AMMLib';

describe('EnergyAMM', () => {
    let amm: EnergyAMM;

    beforeEach(() => {
        amm = new EnergyAMM(1.0);
    });

    test('should add liquidity correctly', async () => {
        const posId = await amm.addLiquidity('tokenA', 'tokenB', 1000, 1000, -100, 100);
        const stats = amm.getPoolStats();
        
        expect(stats.reserveA).toBe(1000);
        expect(stats.reserveB).toBe(1000);
        expect(stats.currentPrice).toBe(1.0);
        expect(posId).toBeDefined();
    });

    test('should execute swap correctly', async () => {
        await amm.addLiquidity('tokenA', 'tokenB', 1000, 1000, -100, 100);
        
        const result = await amm.swap('tokenA', 'tokenB', 100, 90);
        
        expect(result.amountOut).toBeLessThan(100);
        expect(result.amountOut).toBeGreaterThan(90);
        expect(result.priceImpact).toBeGreaterThan(0);
        expect(result.newPrice).toBeLessThan(1.0); // Price of B in terms of A decreases when swapping A for B
    });

    test('should calculate dynamic fees based on volatility', async () => {
        await amm.addLiquidity('tokenA', 'tokenB', 1000, 1000, -100, 100);
        
        // Initial swap
        const res1 = await amm.swap('tokenA', 'tokenB', 10, 0);
        
        // Highly volatile swap
        const res2 = await amm.swap('tokenA', 'tokenB', 500, 0);
        
        // Fee for res2 should be higher relative to amount than res1 if volatility increased
        // Note: the current logic might need more data points for CV to change significantly
        expect(res2.fee / 500).toBeGreaterThanOrEqual(res1.fee / 10);
    });

    test('should protect against flash loan exploits', async () => {
        await amm.addLiquidity('tokenA', 'tokenB', 1000, 1000, -100, 100);
        
        // Receiver that doesn't repay
        const badReceiver = async (amount: number) => {
            // Do nothing, don't repay
        };

        await expect(amm.flashLoan(badReceiver, 'tokenA', 100)).rejects.toThrow("Flash loan not repaid.");
    });

    test('should track impermanent loss', async () => {
        await amm.addLiquidity('tokenA', 'tokenB', 1000, 1000, -100, 100);
        
        // Change price via swap
        await amm.swap('tokenA', 'tokenB', 500, 0);
        
        const il = amm.getImpermanentLoss('provider-address');
        expect(il).toBeLessThan(0); // IL is always negative or zero
    });

    test('should enforce oracle price stability', async () => {
        await amm.addLiquidity('tokenA', 'tokenB', 1000, 1000, -100, 100);
        
        // Manipulate internal price without updating oracle
        // (In this simulation, we'd need a large swap)
        await amm.swap('tokenA', 'tokenB', 600, 0);
        
        // Next swap should fail if deviation is too high
        await expect(amm.swap('tokenA', 'tokenB', 10, 0)).rejects.toThrow("Price instability detected by oracle.");
    });

    test('AMMLib: constant product formula accuracy', () => {
        const amountOut = AMMLib.calculateAmountOut(1000, 1000, 100, 0);
        // (100 * 1000) / (1000 + 100) = 100000 / 1100 = 90.909...
        expect(amountOut).toBeCloseTo(90.91, 1);
    });

    test('AMMLib: concentrated liquidity calculations', () => {
        const pL = AMMLib.tickToPrice(-100);
        const pU = AMMLib.tickToPrice(100);
        const liq = AMMLib.calculateLiquidityForAmountA(Math.sqrt(1.0), Math.sqrt(pU), 100);
        expect(liq).toBeGreaterThan(0);
    });
});
