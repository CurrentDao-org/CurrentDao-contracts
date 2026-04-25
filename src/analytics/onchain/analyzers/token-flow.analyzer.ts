import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { OperationEntity, TokenFlowEntity } from '../entities/onchain-data.entity';
import { TimeRangeDto, TokenFlowQueryDto, TimeGranularity } from '../dto/analytics-query.dto';
import { Logger } from '@nestjs/common';

export interface FlowMetrics {
  top_inflows: { account: string; amount: string }[];
  top_outflows: { account: string; amount: string }[];
  net_flows: Record<string, string>; // account -> net (pos in, neg out)
  concentration: number; // Gini 0-1 (1=one holder)
  velocity: number; // total flow / holders
  trends: Array<{ time_bucket: string; net_flow: string; holders: number }>;
}

export class TokenFlowAnalyzer {
  private logger = new Logger(TokenFlowAnalyzer.name);

  constructor(
    @InjectRepository(OperationEntity)
    private opRepo: Repository<OperationEntity>,
    @InjectRepository(TokenFlowEntity)
    private flowRepo: Repository<TokenFlowEntity>,
  ) {}

  async analyze(query: TokenFlowQueryDto): Promise<FlowMetrics> {
    const timeRange = query.time_range;
    const assetCode = query.asset_code || 'WATT';
    const threshold = query.threshold || 0;

    const payments = await this.opRepo.find({
      where: {
        type: 'payment',
        amount: { currency: assetCode },
        created_at: timeRange ? Between(new Date(timeRange.start), new Date(timeRange.end)) : undefined,
        amount: { value: threshold ? { $gte: threshold.toString() } : undefined }, // Raw SQL needed for decimal
      },
    });

    if (payments.length === 0) {
      return this.emptyMetrics();
    }

    const netFlows: Record<string, bigint> = {};
    payments.forEach(p => {
      const amt = BigInt(p.amount.value || 0);
      netFlows[p.to_account] = (netFlows[p.to_account] || 0n) + amt;
      netFlows[p.from_account] = (netFlows[p.from_account] || 0n) - amt;
    });

    const inflows = Object.entries(netFlows)
      .filter(([, flow]) => flow > 0n)
      .sort(([, a], [, b]) => (b as bigint) > (a as bigint) ? 1 : -1)
      .slice(0, 10);

    const outflows = Object.entries(netFlows)
      .filter(([, flow]) => flow < 0n)
      .sort(([, a], [, b]) => (a as bigint) > (b as bigint) ? 1 : -1)
      .slice(0, 10);

    const balances = Object.values(netFlows).map(n => Number(n));
    const gini = this.calculateGini(balances); // Concentration

    const holders = Object.keys(netFlows).length;
    const totalFlow = Object.values(netFlows).reduce((sum, f) => sum + Number(f), 0);
    const velocity = Math.abs(totalFlow) / holders;

    // Save
    const timeBucket = this.getTimeBucket(query.granularity, new Date(timeRange.start));
    Object.entries(netFlows).forEach(([account, flow]) => {
      this.saveFlow({
        time_bucket: timeBucket,
        account,
        net_flow: flow.toString(),
        txn_count: payments.filter(p => p.from_account === account || p.to_account === account).length,
        asset_code: assetCode,
      });
    });

    const trends = await this.getTrends(timeRange, assetCode);

    return {
      top_inflows: inflows.map(([acc, f]) => ({ account: acc, amount: f.toString() })),
      top_outflows: outflows.map(([acc, f]) => ({ account: acc, amount: f.toString() })),
      net_flows: Object.fromEntries(Object.entries(netFlows).map(([k, v]) => [k, v.toString()])),
      concentration: gini,
      velocity,
      trends,
    };
  }

  private calculateGini(balances: number[]): number {
    if (balances.length < 2) return 0;
    const sorted = balances.sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < sorted.length; i++) {
      sum += sorted[i] * (2 * i + 1 - sorted.length);
    }
    return sum / (sorted.length * sorted.length * sorted.reduce((a, b) => a + b, 0));
  }

  async getTrends(timeRange: TimeRangeDto, assetCode: string): Promise<Array<{ time_bucket: string; net_flow: string; holders: number }>> {
    const flows = await this.flowRepo.find({
      where: {
        asset_code,
        created_at: Between(new Date(timeRange.start), new Date(timeRange.end)),
      },
    });

    const trends = flows.reduce((acc, f) => {
      const existing = acc.find(t => t.time_bucket === f.time_bucket);
      if (existing) {
        existing.net_flow = (BigInt(existing.net_flow) + BigInt(f.net_flow)).toString();
        existing.holders += 1;
      } else {
        acc.push({ time_bucket: f.time_bucket, net_flow: f.net_flow, holders: 1 });
      }
      return acc;
    }, [] as Array<{ time_bucket: string; net_flow: string; holders: number }>);

    return trends.sort((a, b) => a.time_bucket.localeCompare(b.time_bucket));
  }

  private emptyMetrics(): FlowMetrics {
    return {
      top_inflows: [],
      top_outflows: [],
      net_flows: {},
      concentration: 0,
      velocity: 0,
      trends: [],
    };
  }

  private async saveFlow(flow: Omit<TokenFlowEntity, 'id' | 'created_at'>) {
    const entity = this.flowRepo.create(flow);
    await this.flowRepo.save(entity);
  }

  private getTimeBucket(granularity: TimeGranularity, date: Date): string {
    // Reuse from trading
    const d = new Date(date);
    switch (granularity) {
      case 'hour': return d.toISOString().slice(0, 13);
      case 'day': return d.toISOString().slice(0, 10);
      case 'week': return `${d.getFullYear()}-W${Math.floor(d.getDate() / 7)}`;
      default: return d.toISOString().slice(0, 7);
    }
  }
}

