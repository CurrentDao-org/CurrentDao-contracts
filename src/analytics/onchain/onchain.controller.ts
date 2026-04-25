import { Controller, Get, Query, Post, Body, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OnchainService } from './onchain.service';
import { TradingQueryDto, TokenFlowQueryDto, GovernanceQueryDto, RealtimeMetricsDto } from './dto/analytics-query.dto';

@ApiTags('onchain-analytics')
@Controller('analytics')
export class OnchainController {
  constructor(private readonly onchainService: OnchainService) {}

  @Get('trading')
  @ApiOperation({ summary: 'Get trading metrics and patterns' })
  @ApiResponse({ status: 200, description: 'Trading analytics data' })
  async getTradingMetrics(@Query(new ValidationPipe({ transform: true })) query: TradingQueryDto) {
    return this.onchainService.getTradingMetrics(query);
  }

  @Get('flows')
  @ApiOperation({ summary: 'Get token flow analysis' })
  @ApiResponse({ status: 200, description: 'Token flow analytics data' })
  async getTokenFlows(@Query(new ValidationPipe({ transform: true })) query: TokenFlowQueryDto) {
    return this.onchainService.getTokenFlows(query);
  }

  @Get('governance')
  @ApiOperation({ summary: 'Get governance activity metrics' })
  @ApiResponse({ status: 200, description: 'Governance analytics data' })
  async getGovernanceActivity(@Query(new ValidationPipe({ transform: true })) query: GovernanceQueryDto) {
    return this.onchainService.getGovernanceActivity(query);
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics', type: RealtimeMetricsDto })
  async getRealtimeMetrics(): Promise<RealtimeMetricsDto> {
    return this.onchainService.getRealtimeMetrics();
  }

  @Post('backfill')
  @ApiOperation({ summary: 'Trigger historical data backfill' })
  async triggerBackfill(@Body('start_ledger') startLedger: number, @Body('end_ledger') endLedger: number) {
    return this.onchainService.backfillLargeDataset(startLedger, endLedger);
  }
}

