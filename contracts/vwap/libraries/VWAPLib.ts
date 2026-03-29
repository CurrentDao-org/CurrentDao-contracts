import { TradeRecord, u128, u64 } from '../interfaces/IVWAPOracle';

export class VWAPLib {
    static readonly GAS_TARGET = 40000;
    static readonly MAX_ERROR_BPS = 50;

    static calculateVWAP(trades: TradeRecord[]): { vwap: u128; totalVolume: u128; tradeCount: u64 } {
        if (trades.length === 0) {
            return { vwap: 0n, totalVolume: 0n, tradeCount: 0 };
        }

        let weightedPriceVolume = 0n;
        let totalVolume = 0n;

        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            if (trade.volume <= 0n || trade.price <= 0n) {
                continue;
            }

            weightedPriceVolume += trade.price * trade.volume;
            totalVolume += trade.volume;
        }

        if (totalVolume === 0n) {
            return { vwap: 0n, totalVolume: 0n, tradeCount: 0 };
        }

        return {
            vwap: weightedPriceVolume / totalVolume,
            totalVolume,
            tradeCount: trades.length
        };
    }

    static applyDepthAdjustment(vwap: u128, bidDepth: u128, askDepth: u128): u128 {
        const depthTotal = bidDepth + askDepth;
        if (depthTotal === 0n) {
            return vwap;
        }

        // +/- 0.25% cap from market depth imbalance
        const imbalance = ((bidDepth - askDepth) * 10000n) / depthTotal;
        const clamped = imbalance > 25n ? 25n : imbalance < -25n ? -25n : imbalance;

        return vwap + (vwap * clamped) / 10000n;
    }

    static calculateErrorBps(observed: u128, reference: u128): u64 {
        if (observed === 0n || reference === 0n) {
            return 0;
        }

        const diff = observed > reference ? observed - reference : reference - observed;
        return Number((diff * 10000n) / reference);
    }

    static enforcePeriod(periodSeconds: u64): void {
        if (periodSeconds < 300 || periodSeconds > 86400) {
            throw new Error('VWAP period must be between 5 minutes and 24 hours');
        }
    }

    static retainWindow<T extends { timestamp: u64 }>(records: T[], nowTimestamp: u64, retainSeconds: u64): T[] {
        const cutoff = nowTimestamp - retainSeconds;
        if (cutoff <= 0) {
            return records;
        }
        return records.filter((record) => record.timestamp >= cutoff);
    }
}
