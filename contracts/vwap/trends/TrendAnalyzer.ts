import { TrendMetrics, VWAPPoint, u64 } from '../interfaces/IVWAPOracle';

export class TrendAnalyzer {
    analyzeMomentum(market: string, shortPoint: VWAPPoint, longPoint: VWAPPoint): TrendMetrics {
        if (shortPoint.vwap === 0n || longPoint.vwap === 0n) {
            return {
                market,
                shortPeriodSeconds: shortPoint.periodSeconds,
                longPeriodSeconds: longPoint.periodSeconds,
                momentumBps: 0,
                slopePerMinuteBps: 0,
                isBullish: false,
                confidenceBps: 0
            };
        }

        const momentumBps = Number(((shortPoint.vwap - longPoint.vwap) * 10000n) / longPoint.vwap);
        const minutes = Math.max(Math.floor((shortPoint.timestamp - longPoint.timestamp) / 60), 1);
        const slopePerMinuteBps = momentumBps / minutes;
        const confidenceBps = Math.min(10000, Math.abs(momentumBps) * 40 + shortPoint.tradeCount * 5);

        return {
            market,
            shortPeriodSeconds: shortPoint.periodSeconds,
            longPeriodSeconds: longPoint.periodSeconds,
            momentumBps,
            slopePerMinuteBps,
            isBullish: momentumBps > 0,
            confidenceBps
        };
    }

    isTrendHealthy(momentumBps: number, averageErrorBps: u64): boolean {
        return Math.abs(momentumBps) >= 10 && averageErrorBps <= 50;
    }
}
