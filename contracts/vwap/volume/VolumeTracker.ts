import { Address, TradeRecord, VolumeMetrics, u64 } from '../interfaces/IVWAPOracle';

export class VolumeTracker {
    private readonly tradesByMarket: Map<Address, TradeRecord[]> = new Map();

    recordTrade(trade: TradeRecord): void {
        const existing = this.tradesByMarket.get(trade.market) || [];
        existing.push(trade);
        this.tradesByMarket.set(trade.market, existing);
    }

    pruneMarket(market: Address, nowTimestamp: u64, retainSeconds: u64): void {
        const trades = this.tradesByMarket.get(market) || [];
        const cutoff = nowTimestamp - retainSeconds;
        this.tradesByMarket.set(
            market,
            cutoff <= 0 ? trades : trades.filter((trade) => trade.timestamp >= cutoff)
        );
    }

    getTradesInRange(market: Address, fromTimestamp: u64, toTimestamp: u64): TradeRecord[] {
        const trades = this.tradesByMarket.get(market) || [];
        return trades.filter((trade) => trade.timestamp >= fromTimestamp && trade.timestamp <= toTimestamp);
    }

    getVolumeMetrics(market: Address, fromTimestamp: u64, toTimestamp: u64): VolumeMetrics {
        const trades = this.getTradesInRange(market, fromTimestamp, toTimestamp);
        let totalVolume = 0n;
        let buySideDepth = 0n;
        let sellSideDepth = 0n;

        for (let i = 0; i < trades.length; i++) {
            totalVolume += trades[i].volume;
            buySideDepth += trades[i].bidDepth;
            sellSideDepth += trades[i].askDepth;
        }

        const averageTradeSize = trades.length > 0 ? totalVolume / BigInt(trades.length) : 0n;
        const totalDepth = buySideDepth + sellSideDepth;
        const buyPressureBps = totalDepth > 0n ? Number((buySideDepth * 10000n) / totalDepth) : 5000;

        return {
            market,
            fromTimestamp,
            toTimestamp,
            totalVolume,
            tradeCount: trades.length,
            averageTradeSize,
            buyPressureBps
        };
    }

    getTotalTrades(market: Address): number {
        return (this.tradesByMarket.get(market) || []).length;
    }
}
