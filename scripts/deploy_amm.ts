import { EnergyAMM } from '../contracts/amm/EnergyAMM';

async function main() {
    console.log("Deploying Energy AMM...");
    
    // Initialize with a price of 1.0 (e.g., 1 TokenA = 1 TokenB)
    const amm = new EnergyAMM(1.0);
    
    console.log("Adding initial liquidity range...");
    const posId = await amm.addLiquidity(
        'tokenA',
        'tokenB',
        10000,
        10000,
        -500,
        500
    );
    
    const stats = amm.getPoolStats();
    console.log("AMM Deployed Successfully.");
    console.log("Initial Stats:", {
        reserveA: stats.reserveA,
        reserveB: stats.reserveB,
        currentPrice: stats.currentPrice,
        initialPositionId: posId
    });
}

main().catch(error => {
    console.error("Deployment failed:", error);
    process.exit(1);
});
