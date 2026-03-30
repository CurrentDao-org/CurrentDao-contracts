import { VWAPOracle } from '../contracts/vwap/VWAPOracle';
import { TradeRecord } from '../contracts/vwap/interfaces/IVWAPOracle';

async function deployVWAP(): Promise<void> {
    console.log('🚀 Deploying VWAP Oracle...');

    const oracle = new VWAPOracle();

    // Seed with bootstrap market activity for sanity checks.
    const now = Math.floor(Date.now() / 1000);
    const bootstrapTrades: TradeRecord[] = [
        {
            tradeId: 'bootstrap-1',
            market: '0xEnergyMarket',
            price: 1000n,
            volume: 50n,
            timestamp: now - 120,
            bidDepth: 10000n,
            askDepth: 9000n
        },
        {
            tradeId: 'bootstrap-2',
            market: '0xEnergyMarket',
            price: 1010n,
            volume: 45n,
            timestamp: now - 60,
            bidDepth: 12000n,
            askDepth: 11000n
        }
    ];

    for (const trade of bootstrapTrades) {
        oracle.recordTrade(trade);
    }

    const vwap = oracle.getVWAP('0xEnergyMarket', 300, now);
    const accuracy = oracle.getAccuracyReport('0xEnergyMarket', 300);

    console.log('✅ VWAP Oracle deployed and initialized');
    console.log(`📊 Initial VWAP: ${vwap.vwap.toString()}`);
    console.log(`📈 Volume trend: ${vwap.volumeTrend}`);
    console.log(`🎯 Accuracy avg error (bps): ${accuracy.averageErrorBps}`);
    console.log(`⛽ Estimated VWAP gas target: < 40000`);
}

deployVWAP().catch((error) => {
    console.error('❌ VWAP deployment failed:', error);
    process.exit(1);
});
