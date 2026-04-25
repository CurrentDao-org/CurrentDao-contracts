import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnchainService } from '../../src/analytics/onchain/onchain.service';
import { TransactionExtractor } from '../../src/analytics/onchain/extractors/transaction.extractor';
import { TradingAnalyzer } from '../../src/analytics/onchain/analyzers/trading.analyzer';
import { TokenFlowAnalyzer } from '../../src/analytics/onchain/analyzers/token-flow.analyzer';
import { TransactionEntity, OperationEntity, TradingMetricEntity, TokenFlowEntity, GovernanceActivityEntity } from '../../src/analytics/onchain/entities/onchain-data.entity';

describe('OnchainAnalytics', () => {
  let service: OnchainService;
  let extractor: TransactionExtractor;
  let tradingAnalyzer: TradingAnalyzer;
  let tokenFlowAnalyzer: TokenFlowAnalyzer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnchainService,
        {
          provide: TransactionExtractor,
          useValue: {
            extractHistorical: jest.fn().mockResolvedValue([]),
            streamRealtime: jest.fn().mockImplementation(async function*() { yield []; }),
          },
        },
        {
          provide: TradingAnalyzer,
          useValue: {
            analyze: jest.fn().mockResolvedValue({
              total_volume: '1000000',
              avg_price: '0.5',
              trade_count: 100,
              volatility: 5.5,
              whale_trades: 10,
              patterns: { wash_trading_score: 0.1, velocity: 2.5 },
              trends: [],
            }),
          },
        },
        {
          provide: TokenFlowAnalyzer,
          useValue: {
            analyze: jest.fn().mockResolvedValue({
              top_inflows: [],
              top_outflows: [],
              net_flows: {},
              concentration: 0.5,
              velocity: 1.2,
              trends: [],
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OnchainService>(OnchainService);
    extractor = module.get<TransactionExtractor>(TransactionExtractor);
    tradingAnalyzer = module.get<TradingAnalyzer>(TradingAnalyzer);
    tokenFlowAnalyzer = module.get<TokenFlowAnalyzer>(TokenFlowAnalyzer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Trading Analytics', () => {
    it('should return trading metrics', async () => {
      const query = {
        asset_code: 'WATT',
        time_range: { start: '2024-01-01', end: '2024-12-31' },
        granularity: 'day',
      };
      
      const result = await service.getTradingMetrics(query as any);
      
      expect(tradingAnalyzer.analyze).toHaveBeenCalled();
      expect(result).toHaveProperty('total_volume');
      expect(result.total_volume).toBe('1000000');
    });
  });

  describe('Token Flow Analytics', () => {
    it('should return flow metrics', async () => {
      const query = {
        asset_code: 'WATT',
        time_range: { start: '2024-01-01', end: '2024-12-31' },
        threshold: 1000,
      };
      
      const result = await service.getTokenFlows(query as any);
      
      expect(tokenFlowAnalyzer.analyze).toHaveBeenCalled();
      expect(result).toHaveProperty('concentration');
    });
  });

  describe('Governance Analytics', () => {
    it('should return governance activity', async () => {
      const query = {
        time_range: { start: '2024-01-01', end: '2024-12-31' },
      };
      
      const result = await service.getGovernanceActivity(query as any);
      
      expect(result).toHaveProperty('proposal_count');
    });
  });

  describe('Real-time Metrics', () => {
    it('should return realtime dashboard data', async () => {
      const result = await service.getRealtimeMetrics();
      
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('volume_24h');
      expect(result).toHaveProperty('tx_count_24h');
    });
  });

  describe('Data Extraction', () => {
    it('should call historical extraction', async () => {
      await service.onModuleInit();
      expect(extractor.extractHistorical).toHaveBeenCalled();
    });
  });
});

