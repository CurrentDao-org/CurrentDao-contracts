import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min, IsPositive, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export enum AnalyticsType {
  TRADING = 'trading',
  TOKEN_FLOW = 'token_flow',
  GOVERNANCE = 'governance',
}

export enum TimeGranularity {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class TimeRangeDto {
  @ApiProperty()
  @IsDateString()
  start: string;

  @ApiProperty()
  @IsDateString()
  end: string;
}

export class PaginationDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ default: 50, maximum: 1000 })
  @IsOptional()
  @IsPositive()
  limit?: number = 50;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asset_code?: string = 'WATT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  account?: string;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  time_range?: TimeRangeDto;

  @ApiPropertyOptional({ enum: TimeGranularity })
  @IsOptional()
  @IsEnum(TimeGranularity)
  granularity?: TimeGranularity = TimeGranularity.DAY;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination?: PaginationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  min_volume?: number; // Lumens or asset units

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accounts?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  realtime?: boolean = false;
}

export class TradingQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pair?: string; // BASE:COUNTER e.g. WATT:XLM
}

export class TokenFlowQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number; // Flow threshold
}

export class GovernanceQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposal_id?: string;
}

export class RealtimeMetricsDto {
  @ApiProperty()
  timestamp: number;

  @ApiProperty()
  volume_24h: string;

  @ApiProperty()
  tx_count_24h: number;

  @ApiProperty()
  top_holders_change: number; // %

  @ApiProperty()
  participation_rate: number; // %
}

export class HistoricalTrendDto {
  @ApiProperty()
  time_bucket: string;

  @ApiProperty()
  volume: string;

  @ApiProperty()
  avg_price: string;

  @ApiProperty()
  velocity: number; // turnover rate
}

