import { VWAPOracle } from '../../contracts/vwap/VWAPOracle';
import { TradeRecord } from '../../contracts/vwap/interfaces/IVWAPOracle';

describe('VWAPOracle', () => {
    const market = '0xEnergyMarket';
    let oracle: VWAPOracle;

    beforeEach(() => {
        oracle = new VWAPOracle();
    });

    const makeTrade = (idx: number, timestamp: number, price = 1000n, volume = 10n): TradeRecord => ({
        tradeId: `trade-${idx}`,
        market,
        price,
        volume,
        timestamp,
        bidDepth: 1000n + BigInt(idx),
        askDepth: 900n + BigInt(idx)
    });

    test('calculates standard VWAP formula price*volume/sum(volume)', () => {
        const now = 1_000_000;
        oracle.recordTrade(makeTrade(1, now - 10, 1000n, 5n));
        oracle.recordTrade(makeTrade(2, now - 9, 2000n, 10n));

        const point = oracle.getVWAP(market, 300, now);
        const expected = ((1000n * 5n) + (2000n * 10n)) / (5n + 10n);

        expect(point.vwap).toBeGreaterThanOrEqual(expected - 5n);
        expect(point.vwap).toBeLessThanOrEqual(expected + 5n);
        expect(point.totalVolume).toBe(15n);
        expect(point.tradeCount).toBe(2);
    });

    test('supports period constraints 5 minutes to 24 hours', () => {
        const now = 1_000_000;
        oracle.recordTrade(makeTrade(1, now - 20));

        expect(() => oracle.getVWAP(market, 60, now)).toThrow('VWAP period must be between 5 minutes and 24 hours');
        expect(() => oracle.getVWAP(market, 100_000, now)).toThrow('VWAP period must be between 5 minutes and 24 hours');

        expect(() => oracle.getVWAP(market, 300, now)).not.toThrow();
        expect(() => oracle.getVWAP(market, 86_400, now)).not.toThrow();
    });

    test('tracks and reports historical VWAP samples for 90-day retention', () => {
        const now = 2_000_000;
        oracle.recordTrade(makeTrade(1, now - 350));
        oracle.recordTrade(makeTrade(2, now - 250, 1010n, 12n));
        oracle.recordTrade(makeTrade(3, now - 150, 1020n, 11n));

        oracle.getVWAP(market, 300, now - 100);
        oracle.getVWAP(market, 300, now);

        const history = oracle.getHistoricalVWAP(market, 300, now - 1000, now + 1);
        expect(history.length).toBe(2);
    });

    test('volume tracking can handle 10,000+ trades daily', () => {
        const now = 3_000_000;
        for (let i = 0; i < 10_050; i++) {
            oracle.recordTrade(makeTrade(i, now - (i % 86_400), 1000n + BigInt(i % 25), 1n + BigInt(i % 10)));
        }

        expect(oracle.supportsDailyTradeCapacity(market)).toBe(true);

        const metrics = oracle.getVolumeMetrics(market, now - 86_400, now);
        expect(metrics.tradeCount).toBeGreaterThanOrEqual(10_000);
    });

    test('accuracy report stays within configured 0.5% threshold (< 50 bps)', () => {
        const now = 4_000_000;
        oracle.recordTrade(makeTrade(1, now - 100, 1000n, 10n));
        oracle.recordTrade(makeTrade(2, now - 80, 1002n, 11n));
        oracle.recordTrade(makeTrade(3, now - 60, 1001n, 10n));

        oracle.getVWAP(market, 300, now);
        const report = oracle.getAccuracyReport(market, 300);

        expect(report.averageErrorBps).toBeLessThanOrEqual(50);
        expect(report.withinThreshold).toBe(true);
    });

    test('trend analysis provides momentum direction', () => {
        const base = Math.floor(Date.now() / 1000);

        for (let i = 0; i < 40; i++) {
            oracle.recordTrade({
                tradeId: `trend-${i}`,
                market,
                price: 900n + BigInt(i),
                volume: 10n,
                timestamp: base - 4000 + i * 60,
                bidDepth: 5000n,
                askDepth: 4500n
            });
        }

        const trend = oracle.getTrendMetrics(market);
        expect(typeof trend.momentumBps).toBe('number');
        expect(trend.confidenceBps).toBeGreaterThanOrEqual(0);
    });

    test('market depth integration affects VWAP with bounded adjustment', () => {
        const now = 5_000_000;
        oracle.recordTrade({
            tradeId: 'depth-1',
            market,
            price: 1000n,
            volume: 100n,
            timestamp: now - 5,
            bidDepth: 10000n,
            askDepth: 100n
        });

        const point = oracle.getVWAP(market, 300, now);
        expect(point.vwap).toBeGreaterThan(1000n);
    });
});
