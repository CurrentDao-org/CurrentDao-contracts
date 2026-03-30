import {
    AccuracyReport,
    Address,
    IVWAPOracle,
    MarketDepthSnapshot,
    TradeRecord,
    TrendMetrics,
    VWAPPoint,
    u64
} from './interfaces/IVWAPOracle';
import { VWAPLib } from './libraries/VWAPLib';
import { VolumeTracker } from './volume/VolumeTracker';
import { VolumeAnalyzer } from './analysis/VolumeAnalyzer';
import { TrendAnalyzer } from './trends/TrendAnalyzer';

export class VWAPOracle implements IVWAPOracle {
    private readonly volumeTracker = new VolumeTracker();
    private readonly volumeAnalyzer = new VolumeAnalyzer();
    private readonly trendAnalyzer = new TrendAnalyzer();

    private readonly historyByMarket: Map<Address, VWAPPoint[]> = new Map();
    private readonly depthByMarket: Map<Address, MarketDepthSnapshot> = new Map();
    private readonly errorsByMarketPeriod: Map<string, number[]> = new Map();

    private readonly retainSeconds = 90 * 24 * 60 * 60;

    recordTrade(trade: TradeRecord): void {
        if (trade.price <= 0n || trade.volume <= 0n) {
            throw new Error('Trade price and volume must be positive');
        }

        this.volumeTracker.recordTrade(trade);
        this.volumeTracker.pruneMarket(trade.market, trade.timestamp, this.retainSeconds);

        const depthTotal = trade.bidDepth + trade.askDepth;
        const imbalanceBps = depthTotal > 0n ? Number(((trade.bidDepth - trade.askDepth) * 10000n) / depthTotal) : 0;

        this.depthByMarket.set(trade.market, {
            market: trade.market,
            timestamp: trade.timestamp,
            bidDepth: trade.bidDepth,
            askDepth: trade.askDepth,
            imbalanceBps
        });
    }

    getVWAP(market: Address, periodSeconds: u64, nowTimestamp: u64 = Math.floor(Date.now() / 1000)): VWAPPoint {
        VWAPLib.enforcePeriod(periodSeconds);

        const fromTimestamp = nowTimestamp - periodSeconds;
        const trades = this.volumeTracker.getTradesInRange(market, fromTimestamp, nowTimestamp);
        const base = VWAPLib.calculateVWAP(trades);
        const depth = this.getMarketDepth(market);
        const adjusted = VWAPLib.applyDepthAdjustment(base.vwap, depth.bidDepth, depth.askDepth);

        const previousMetrics = this.volumeTracker.getVolumeMetrics(market, fromTimestamp - periodSeconds, fromTimestamp);
        const currentMetrics = this.volumeTracker.getVolumeMetrics(market, fromTimestamp, nowTimestamp);
        const volumeTrend = this.volumeAnalyzer.classifyVolumeTrend(currentMetrics, previousMetrics);

        const reference = base.vwap === 0n ? adjusted : base.vwap;
        const errorBps = VWAPLib.calculateErrorBps(adjusted, reference);
        this.recordError(market, periodSeconds, errorBps);

        const point: VWAPPoint = {
            market,
            periodSeconds,
            timestamp: nowTimestamp,
            vwap: adjusted,
            totalVolume: base.totalVolume,
            tradeCount: base.tradeCount,
            errorBps,
            momentumBps: 0,
            volumeTrend
        };

        this.storeHistoricalPoint(point);
        return point;
    }

    getHistoricalVWAP(market: Address, periodSeconds: u64, fromTimestamp: u64, toTimestamp: u64): VWAPPoint[] {
        return (this.historyByMarket.get(market) || []).filter(
            (point) =>
                point.periodSeconds === periodSeconds &&
                point.timestamp >= fromTimestamp &&
                point.timestamp <= toTimestamp
        );
    }

    getVolumeMetrics(market: Address, fromTimestamp: u64, toTimestamp: u64) {
        return this.volumeTracker.getVolumeMetrics(market, fromTimestamp, toTimestamp);
    }

    getTrendMetrics(market: Address): TrendMetrics {
        const now = Math.floor(Date.now() / 1000);
        const shortPoint = this.getVWAP(market, 300, now);
        const longPoint = this.getVWAP(market, 3600, now);
        const trend = this.trendAnalyzer.analyzeMomentum(market, shortPoint, longPoint);
        shortPoint.momentumBps = trend.momentumBps;
        return trend;
    }

    getMarketDepth(market: Address): MarketDepthSnapshot {
        return this.depthByMarket.get(market) || {
            market,
            timestamp: 0,
            bidDepth: 0n,
            askDepth: 0n,
            imbalanceBps: 0
        };
    }

    getAccuracyReport(market: Address, periodSeconds: u64): AccuracyReport {
        const key = this.errorKey(market, periodSeconds);
        const errors = this.errorsByMarketPeriod.get(key) || [];

        let sum = 0;
        let maxError = 0;
        for (let i = 0; i < errors.length; i++) {
            sum += errors[i];
            if (errors[i] > maxError) {
                maxError = errors[i];
            }
        }

        const averageErrorBps = errors.length ? Math.floor(sum / errors.length) : 0;

        return {
            market,
            periodSeconds,
            averageErrorBps,
            maxErrorBps: maxError,
            withinThreshold: averageErrorBps <= VWAPLib.MAX_ERROR_BPS
        };
    }

    supportsDailyTradeCapacity(market: Address, minimumTrades = 10000): boolean {
        const now = Math.floor(Date.now() / 1000);
        const trades = this.volumeTracker.getTradesInRange(market, now - 86400, now);
        return this.volumeAnalyzer.detectMarketParticipation(trades, minimumTrades);
    }

    private storeHistoricalPoint(point: VWAPPoint): void {
        const history = this.historyByMarket.get(point.market) || [];
        history.push(point);
        const pruned = VWAPLib.retainWindow(history, point.timestamp, this.retainSeconds);
        this.historyByMarket.set(point.market, pruned);
    }

    private recordError(market: Address, periodSeconds: u64, errorBps: number): void {
        const key = this.errorKey(market, periodSeconds);
        const errors = this.errorsByMarketPeriod.get(key) || [];
        errors.push(errorBps);

        // Keep only recent samples to mimic bounded on-chain storage/gas discipline.
        if (errors.length > 5000) {
            errors.splice(0, errors.length - 5000);
        }

        this.errorsByMarketPeriod.set(key, errors);
    }

    private errorKey(market: Address, periodSeconds: u64): string {
        return `${market}:${periodSeconds}`;
    }
}
