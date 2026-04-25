import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionExtractor } from './extractors/transaction.extractor';
import { TradingAnalyzer } from './analyzers/trading.analyzer';
import { TokenFlowAnalyzer } from './analyzers/token-flow.analyzer';
import { AnalyticsQueryDto, TradingQueryDto, TokenFlowQueryDto, GovernanceQueryDto, RealtimeMetricsDto } from './dto/analytics-query.dto';
import { TradingMetrics, FlowMetrics } from './analyzers/token-flow.analyzer'; // Adjust imports
import { Logger } from '@nestjs/common';

@Injectable()
export class OnchainService implements OnModuleInit {
  private logger = new Logger(OnchainService.name);
  private realtimeMetrics: RealtimeMetricsDto = {
    timestamp: Date.now(),
    volume_24h: '0',
    tx_count_24h: 0,
    top_holders_change: 0,
    participation_rate: 0,
  };

  constructor(
    private extractor: TransactionExtractor,
    private tradingAnalyzer: TradingAnalyzer,
    private tokenFlowAnalyzer: TokenFlowAnalyzer,
  ) {}

  async onModuleInit() {
    this.logger.log('OnchainService initialized. Starting historical sync...');
    await this.historicalSync();
    this.startRealtimeStream();
  }

  // Trading
  async getTradingMetrics(query: TradingQueryDto): Promise<TradingMetrics> {
    // Extract fresh if needed
    if (query.realtime) {
      await this.extractRealtime();
    }
    return this.tradingAnalyzer.analyze(query);
  }

  // Token Flows
  async getTokenFlows(query: TokenFlowQueryDto): Promise<FlowMetrics> {
    if (query.realtime) {
      await this.extractRealtime();
    }
    return this.tokenFlowAnalyzer.analyze(query);
  }

  // Governance (extend existing + on-chain votes via memos)
  async getGovernanceActivity(query: GovernanceQueryDto): Promise<any> {
    // TODO: Integrate contracts/analytics/GovernanceAnalytics
    // Proxy: extract ops with proposal memos
    const data = await this.extractor.extractHistorical(query.time_range || { start: '2024-01-01', end: new Date().toISOString() });
    const govOps = data.filter(d => d.tx.memo?.includes('proposal'));
    return {
      proposal_count: govOps.length,
      avg_participation: 42.5, // Mock from analysis
      trends: [], // Compute
    };
  }

  // Realtime dashboard
  async getRealtimeMetrics(): Promise<RealtimeMetricsDto> {
    return this.realtimeMetrics;
  }

  // Historical backfill cron
  @Cron(CronExpression.EVERY_HOUR)
  async historicalSync() {
    this.logger.log('Running historical sync...');
    try {
      const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString();
      await this.extractor.extractHistorical({ start: yesterday, end: new Date().toISOString() });
      await this.updateRealtimeMetrics();
    } catch (err) {
      this.logger.error('Historical sync failed', err);
    }
  }

  private async extractRealtime() {
    // Stream last batch
    const recent: any[] = [];
    for await (const data of this.extractor.streamRealtime((d) => recent.push(d))) {
      // Limit to recent
      if (recent.length > 1000) break;
    }
    // Trigger analysis update
  }

  private async startRealtimeStream() {
    this.extractor.streamRealtime(async (data) => {
      // Update realtime metrics
      await this.updateRealtimeMetrics();
      this.logger.debug('Realtime data processed');
    }).catch(err => this.logger.error('Stream error', err));
  }

  private async updateRealtimeMetrics() {
    // Aggregate last 24h from DB or cache
    // Mock for now
    this.realtimeMetrics = {
      ...this.realtimeMetrics,
      timestamp: Date.now(),
      volume_24h: (Math.random() * 1000000).toString(),
      tx_count_24h: Math.floor(Math.random() * 5000),
      top_holders_change: (Math.random() - 0.5) * 10,
      participation_rate: 35 + Math.random() * 20,
    };
  }

  // Bulk process 1M+ txns
  async backfillLargeDataset(startLedger: number, endLedger: number) {
    // Paginate ledgers, batch extract
    let cursor = ` ${startLedger}`;
    while (cursor < endLedger) {
      const txns = await this.server
        .transactions()
        .ledger(cursor)
        .limit(200)
        .order('asc')
        .call();
      // Process batch
      await this.extractor.saveBatch(/* parsed */);
      cursor = txns.paging_token;
    }
  }
}

