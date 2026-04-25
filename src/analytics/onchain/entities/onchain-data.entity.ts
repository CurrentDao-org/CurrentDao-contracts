import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum OperationType {
  PAYMENT = 'payment',
  TRADE = 'trade',
  CREATE_ACCOUNT = 'create_account',
  // Add more Stellar ops: path_payment, manage_sell_offer, etc.
}

export class Amount {
  @Column('decimal', { precision: 30, scale: 7 }) // Stroops: 10^7 XLM
  value: string;

  @Column()
  currency: string;

  @Column()
  issuer: string;
}

@Entity('transactions')
@Index(['ledger_sequence', 'hash'])
@Index(['created_at'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @ApiProperty()
  hash: string;

  @Column()
  @ApiProperty()
  ledger_sequence: number;

  @Column('timestamp')
  @ApiProperty()
  created_at: Date;

  @Column()
  @ApiProperty()
  source_account: string;

  @Column('simple-json')
  @ApiProperty()
  memo: any;

  @Column()
  @ApiProperty()
  max_fee: string;

  @Column()
  fee_charged: string;

  @Column()
  @Index()
  asset_code?: string; // Filter for $WATT

  @OneToMany(() => OperationEntity, op => op.transaction, { cascade: true })
  operations: OperationEntity[];

  @CreateDateColumn()
  indexed_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('operations')
@Index(['transaction_id', 'type'])
@Index(['from_account', 'to_account'])
@Index(['created_at'])
export class OperationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  transaction_id: string;

  @ManyToOne(() => TransactionEntity, tx => tx.operations)
  @JoinColumn({ name: 'transaction_id' })
  transaction: TransactionEntity;

  @Column()
  @ApiProperty()
  type: OperationType;

  @Column()
  @Index()
  from_account: string;

  @Column()
  @Index()
  to_account: string;

  @Column('simple-json')
  amount: Amount;

  @Column()
  @ApiProperty()
  starting_balance?: string;

  // Trade specific
  @Column({ nullable: true })
  price?: any; // {n: string, d: string}

  @Column({ nullable: true })
  base_amount?: Amount;

  @Column({ nullable: true })
  counter_amount?: Amount;

  // Gov proxy (parse memo?)
  @Column({ nullable: true })
  proposal_id?: string;

  @Column({ nullable: true })
  vote_type?: string; // 'for/against/abstain'

  @CreateDateColumn()
  indexed_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// Aggregated views for analytics (separate entities or queries)
@Entity('trading_metrics')
@Index(['time_bucket', 'asset_code'])
export class TradingMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  time_bucket: string; // YYYY-MM-DD/HH

  @Column()
  asset_code: string;

  @Column('decimal', { precision: 30, scale: 7 })
  volume: string;

  @Column('decimal', { precision: 20, scale: 10 })
  avg_price: string;

  @Column('int')
  trade_count: number;

  @Column()
  @Index()
  account?: string; // Whale filter

  @CreateDateColumn()
  created_at: Date;
}

@Entity('token_flows')
@Index(['time_bucket', 'account'])
export class TokenFlowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  time_bucket: string;

  @Column()
  @Index()
  account: string;

  @Column('decimal', { precision: 30, scale: 7 })
  net_flow: string; // Positive in, negative out

  @Column('int')
  txn_count: number;

  @Column()
  asset_code: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('governance_activity')
@Index(['time_bucket', 'proposal_id'])
export class GovernanceActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  proposal_id: string;

  @Column()
  time_bucket: string;

  @Column('int')
  votes_for: number;

  @Column('int')
  votes_against: number;

  @Column('int')
  voters_unique: number;

  @Column('decimal', { precision: 10, scale: 2 })
  participation_rate: string; // %

  @CreateDateColumn()
  created_at: Date;
}

