import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OnchainService } from './onchain.service';
import { TransactionExtractor } from './extractors/transaction.extractor';
import { TradingAnalyzer } from './analyzers/trading.analyzer';
import { TokenFlowAnalyzer } from './analyzers/token-flow.analyzer';
import {
  TransactionEntity,
  OperationEntity,
  TradingMetricEntity,
  TokenFlowEntity,
  GovernanceActivityEntity,
} from './entities/onchain-data.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      OperationEntity,
      TradingMetricEntity,
      TokenFlowEntity,
      GovernanceActivityEntity,
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    OnchainService,
    TransactionExtractor,
    TradingAnalyzer,
    TokenFlowAnalyzer,
  ],
  exports: [OnchainService],
})
export class OnchainModule {}

