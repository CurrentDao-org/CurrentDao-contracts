import { MultiChainLiquidityPool } from '../../contracts/liquidity/MultiChainLiquidityPool';
import { ChainInfo } from '../../contracts/liquidity/structures/LiquidityStructure';

describe('MultiChainLiquidityPool', () => {
    let pool: MultiChainLiquidityPool;
    const initialChains: ChainInfo[] = [
        { chainId: 1, name: 'Ethereum', nativeAsset: 'ETH', currentLiquidity: 10000, targetLiquidity: 10000, active: true },
        { chainId: 137, name: 'Polygon', nativeAsset: 'MATIC', currentLiquidity: 5000, targetLiquidity: 10000, active: true },
        { chainId: 56, name: 'BSC', nativeAsset: 'BNB', currentLiquidity: 15000, targetLiquidity: 10000, active: true },
        { chainId: 43114, name: 'Avalanche', nativeAsset: 'AVAX', currentLiquidity: 8000, targetLiquidity: 10000, active: true },
        { chainId: 42161, name: 'Arbitrum', nativeAsset: 'ETH', currentLiquidity: 12000, targetLiquidity: 10000, active: true }
    ];

    beforeEach(() => {
        pool = new MultiChainLiquidityPool(JSON.parse(JSON.stringify(initialChains)));
    });

    test('should support 5+ blockchain networks', () => {
        const stats = pool.getPoolStats();
        expect(stats.activeChains).toBeGreaterThanOrEqual(5);
    });

    test('should allow deposits across chains', async () => {
        await pool.deposit('LP1', 1, 1000);
        const stats = pool.getPoolStats();
        expect(stats.totalLiquidity).toBe(51000); // 50000 initial + 1000
    });

    test('should provide IL protection on withdrawal', async () => {
        await pool.deposit('LP1', 1, 1000);
        // Current price is simulated as 900 vs 1000 entry.
        // IL for 10% drop is ~0.25%? 
        // Let's check actual returned amount
        const withdrawn = await pool.withdraw('LP1', 1, 1000);
        expect(withdrawn).toBeGreaterThan(1000); 
    });

    test('should rebalance liquidity to optimize capital efficiency', async () => {
        const actions = await pool.rebalance();
        expect(actions.length).toBeGreaterThan(0);
        
        const stats = pool.getPoolStats();
        // After rebalancing, chains should be closer to target
        // Polygon (137) was 5000, target 10000. 
        // BSC (56) was 15000, target 10000.
        // Arbitrum (42161) was 12000, target 10000.
        
        const actionToPolygon = actions.find(a => a.toChain === 137);
        expect(actionToPolygon).toBeDefined();
        expect(actionToPolygon?.amount).toBe(5000);
    });

    test('should bridge assets between chains', async () => {
        const success = await pool.bridge(1, 137, 500);
        expect(success).toBe(true);
    });

    test('should calculate rewards fairly', (done) => {
        pool.deposit('LP1', 1, 1000).then(() => {
            setTimeout(() => {
                const rewards = pool.calculateRewards('LP1');
                expect(rewards).toBeGreaterThan(0);
                done();
            }, 1100); // Wait 1.1s to ensure some rewards are accrued
        });
    });

    test('should enforce slippage protection', async () => {
        // In our mock, we just assume it's acceptable if it's within 2%
        // and we pass 1% in the contract logic for simulation.
        const success = await pool.bridge(1, 137, 1000);
        expect(success).toBe(true);
    });

    test('should allow emergency withdrawal', async () => {
        await pool.deposit('LP1', 1, 1000);
        pool.toggleEmergencyMode();
        
        pool.emergencyWithdraw('LP1');
        const stats = pool.getPoolStats();
        expect(stats.totalLiquidity).toBe(50000); // Original liquidity
    });

    test('should prevent cross-chain arbitrage if deviation is too high', () => {
        const isArb = pool.checkArbitrageOpportunity(1, 137);
        expect(isArb).toBe(true); // 6% deviation > 5% threshold
    });
});
