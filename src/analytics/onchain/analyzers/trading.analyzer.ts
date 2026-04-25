import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { OperationEntity, TradingMetricEntity } from '../entities/onchain-data.entity';
import { TimeRangeDto, TradingQueryDto, TimeGranularity, HistoricalTrendDto } from '../dto/analytics-query.dto';
import { Logger } from '@nestjs/common';

export interface TradingMetrics {
  total_volume: string; // stroops or asset units
  avg_price: string;
  trade_count: number;
  volatility: number; // std dev %
  whale_trades: number; // >1% total vol
  patterns: {
    wash_trading_score: number; // 0-1 risk
    velocity: number; // trades/holder/day
  };
  trends: HistoricalTrendDto[];
}

export class TradingAnalyzer {
  private logger = new Logger(TradingAnalyzer.name);

  constructor(
    @InjectRepository(OperationEntity)
    private opRepo: Repository<OperationEntity>,
    @InjectRepository(TradingMetricEntity)
    private metricRepo: Repository<TradingMetricEntity>,
  ) {}

  async analyze(query: TradingQueryDto): Promise<TradingMetrics> {
    const timeRange = query.time_range;
    const assetCode = query.asset_code || 'WATT';

    // Extract relevant trades (type=trade or payments proxying trades)
    const trades = await this.opRepo.find({
      where: {
        type: 'trade', // Or payment with WATT
        amount: { currency: assetCode },
        created_at: timeRange ? Between(new Date(timeRange.start), new Date(timeRange.end)) : undefined,
      },
    });

    if (trades.length === 0) {
      return this.emptyMetrics(assetCode);
    }

    const volume = trades.reduce((sum, t) => (sum + BigInt(t.amount.value || 0)), 0n).toString();
    const prices = trades.map(t => parseFloat(t.price?.n || '0') / parseFloat(t.price?.d || '1'));
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sumsq, p) => sumsq + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / avgPrice * 100;

    // Whale detection: top 10% vol by account
    const accountVols = trades.reduce((acc, t) => {
      acc[t.from_account] = (BigInt(acc[t.from_account] || 0) + BigInt(t.amount.value || 0)).toString();
      return acc;
    }, {} as Record<string, string>);
    const sortedVols = Object.values(accountVols).map(v => BigInt(v)).sort((a, b) => b > a ? 1 : -1);
    const whaleVolThreshold = BigInt(sortedVols[Math.floor(sortedVols.length * 0.9)] || 0);
    const whaleTrades = trades.filter(t => BigInt(t.amount.value || 0) > whaleVolThreshold).length;

    // Patterns
    const washScore = this.calculateWashTrading(trades); // Same acc roundtrip
    const velocity = trades.length / new Set(trades.map(t => t.from_account)).size / (Math.abs(new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()) / (24*60*60*1000));

    // Save metrics
    await this.saveMetrics({
      time_bucket: this.getTimeBucket(query.granularity, new Date(timeRange.start)),
      asset_code: assetCode,
      volume,
      avg_price: avgPrice.toString(),
      trade_count: trades.length,
      account: '', // Aggregate
    });

    // Trends
    const trends = await this.getTrends(timeRange, assetCode, query.granularity);

    return {
      total_volume: volume,
      avg_price: avgPrice.toString(),
      trade_count: trades.length,
      volatility,
      whale_trades: whaleTrades,
      patterns: { wash_trading_score: washScore, velocity },
      trends,
    };
  }

  private calculateWashTrading(trades: OperationEntity[]): number {
    // Simple: % trades where buyer=seller within short window
    const wash = trades.filter(t => t.from_account === t.to_account).length / trades.length;
    return Math.min(wash * 10, 1); // Scale risk
  }

  async getTrends(timeRange: TimeRangeDto, assetCode: string, granularity: TimeGranularity): Promise<HistoricalTrendDto[]> {
    const buckets = this.generateBuckets(timeRange, granularity);
    const trends: HistoricalTrendDto[] = [];

    for (const bucket of buckets) {
      const metric = await this.metricRepo.findOne({ where: { time_bucket: bucket, asset_code: assetCode } });
      if (metric) {
        trends.push({
          time_bucket: bucket,
          volume: metric.volume,
          avg_price: metric.avg_price,
          velocity: metric.trade_count / 24, // proxy
        });
      }
    }

    return trends;
  }

  private emptyMetrics(assetCode: string): TradingMetrics {
    return {
      total_volume: '0',
      avg_price: '0',
      trade_count: 0,
      volatility: 0,
      whale_trades: 0,
      patterns: { wash_trading_score: 0, velocity: 0 },
      trends: [],
    };
  }

  private async saveMetrics(metric: Omit<TradingMetricEntity, 'id' | 'created_at'>) {
    const entity = this.metricRepo.create(metric);
    await this.metricRepo.save(entity);
  }

  private getTimeBucket(granularity: TimeGranularity, date: Date): string {
    const d = new Date(date);
    switch (granularity) {
      case TimeGranularity.HOUR: return d.toISOString().slice(0, 13);
      case TimeGranularity.DAY: return d.toISOString().slice(0, 10);
      case TimeGranularity.WEEK: return `${d.getFullYear()}-W${Math.floor(d.getDate() / 7)}`;
      case TimeGranularity.MONTH: return d.toISOString().slice(0, 7);
      default: return d.toISOString().slice(0, 10);
    }
  }

  private generateBuckets({ start, end }: TimeRangeDto, granularity: TimeGranularity): string[] {
    // Impl simple hourly buckets for demo; prod: date-fns interval
    const startDate = new Date(start);
    const buckets = [];
    let current = new Date(startDate);
    const endDate = new Date(end);
    while (current < endDate) {
      buckets.push(this.getTimeBucket(granularity, current));
      current.setHours(current.getHours() + 1); // Adjust per gran
    }
    return buckets;
  }
}

