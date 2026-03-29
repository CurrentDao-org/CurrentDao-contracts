import { TradeRecord, VolumeMetrics, u64 } from '../interfaces/IVWAPOracle';

export class VolumeAnalyzer {
    classifyVolumeTrend(current: VolumeMetrics, previous: VolumeMetrics): 'surging' | 'rising' | 'stable' | 'cooling' {
        if (previous.totalVolume === 0n) {
            return 'stable';
        }

        const ratioBps = Number((current.totalVolume * 10000n) / previous.totalVolume);

        if (ratioBps >= 13000) return 'surging';
        if (ratioBps >= 10800) return 'rising';
        if (ratioBps <= 9000) return 'cooling';
        return 'stable';
    }

    detectMarketParticipation(trades: TradeRecord[], minimumTradesPerDay = 10000): boolean {
        return trades.length >= minimumTradesPerDay;
    }

    rollingMetrics(
        trades: TradeRecord[],
        nowTimestamp: u64,
        windowSeconds: u64
    ): { current: VolumeMetrics; previous: VolumeMetrics } {
        const currentStart = nowTimestamp - windowSeconds;
        const previousStart = currentStart - windowSeconds;

        const currentTrades = trades.filter((trade) => trade.timestamp >= currentStart && trade.timestamp <= nowTimestamp);
        const previousTrades = trades.filter((trade) => trade.timestamp >= previousStart && trade.timestamp < currentStart);

        const toMetrics = (set: TradeRecord[], fromTimestamp: u64, toTimestamp: u64): VolumeMetrics => {
            let totalVolume = 0n;
            for (let i = 0; i < set.length; i++) {
                totalVolume += set[i].volume;
            }

            return {
                market: set[0]?.market || '',
                fromTimestamp,
                toTimestamp,
                totalVolume,
                tradeCount: set.length,
                averageTradeSize: set.length ? totalVolume / BigInt(set.length) : 0n,
                buyPressureBps: 5000
            };
        };

        return {
            current: toMetrics(currentTrades, currentStart, nowTimestamp),
            previous: toMetrics(previousTrades, previousStart, currentStart)
        };
    }
}
