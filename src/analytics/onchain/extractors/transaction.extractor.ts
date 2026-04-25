import * as StellarSdk from '@stellar/stellar-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity, OperationEntity, OperationType, Amount } from '../entities/onchain-data.entity';
import { TimeRangeDto } from '../dto/analytics-query.dto';
import { Logger } from '@nestjs/common';

export interface ExtractedTxn {
  tx: any; // StellarSdk.Horizon.HorizonApi.TransactionResponse
  ops: any[]; // StellarSdk.Horizon.HorizonApi.OperationResponse[]
  isWattRelevant: boolean;
}

export class TransactionExtractor {
  private server: any; // StellarSdk.Horizon.Server
  private logger = new Logger(TransactionExtractor.name);
  private readonly WATT_CODE = process.env.WATT_CODE || 'WATT';
  private readonly WATT_ISSUER = process.env.WATT_ISSUER || '';

  constructor(
    @InjectRepository(TransactionEntity)
    private txRepo: Repository<TransactionEntity>,
    @InjectRepository(OperationEntity)
    private opRepo: Repository<OperationEntity>,
  ) {
    const network = process.env.STELLAR_NETWORK === 'testnet' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';
    this.server = new (StellarSdk.Horizon as any).Server(network, { allowHttp: false });
  }

  async extractHistorical({ start, end }: TimeRangeDto, assetCode: string = this.WATT_CODE, limit = 1000): Promise<ExtractedTxn[]> {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    // Query operations for asset (payments/trades)
    let ops = await this.server
      .operations()
      .forAsset(StellarSdk.Asset.native()) // Placeholder, filter WATT in callback
      .order('desc')
      .limit(limit)
      .call();

    const extracted: ExtractedTxn[] = [];
    const processedHashes = new Set<string>();

    for (const page of ops.records) {
      const relevantOps = page.filter((op: any) => this.isRelevantToAsset(op, assetCode));

      for (const op of relevantOps) {
        if (!op.transaction_hash || processedHashes.has(op.transaction_hash)) continue;

        try {
          const tx = await this.server.loadTransaction(op.transaction_hash);
          const allOps = await this.server
            .operations()
            .forTransaction(op.transaction_hash)
            .call()
            .then((res: any) => res.records);

          extracted.push({ tx, ops: allOps, isWattRelevant: true });
          processedHashes.add(op.transaction_hash);
        } catch (err: any) {
          this.logger.warn(`Failed to load tx ${op.transaction_hash}: ${err.message}`);
        }
      }
    }

    // Save to DB (batch)
    await this.saveBatch(extracted);

    return extracted;
  }

  async *streamRealtime(callback: (data: ExtractedTxn) => void): AsyncGenerator<ExtractedTxn> {
    const es = this.server
      .operations()
      .cursor('now')
      .stream({
        onmessage: async (op: any) => {
          if (this.isRelevantToAsset(op, this.WATT_CODE)) {
            try {
              const tx = await this.server.loadTransaction(op.transaction_hash);
              const allOps = await this.server
                .operations()
                .forTransaction(op.transaction_hash)
                .call()
                .then((res: any) => res.records);

              const data = { tx, ops: allOps, isWattRelevant: true };
              await this.saveRealtime(data);
              callback(data);
            } catch (err: any) {
              this.logger.error(`Stream process error: ${err.message}`);
            }
          }
        },
      });

    // Yield from stream events
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real impl, this would yield from event emitter
    }
  }

  private isRelevantToAsset(op: any, assetCode: string): boolean {
    // Payment
    if (op.type === 'payment' && op.amount_asset_code === assetCode) return true;

    // Trade
    if (op.type === 'trade' && (op.sold_asset_code === assetCode || op.bought_asset_code === assetCode)) return true;

    // Path payment, manage offer, etc.
    if (op.type === 'path_payment_strict_send' || op.type === 'manage_buy_offer' || op.type === 'manage_sell_offer') {
      // Parse changes for asset
      if (op.changes?.some((change: any) => change.asset?.code === assetCode)) return true;
    }

    // Gov: memo parse or custom source
    if (op.transaction_memo && op.transaction_memo.includes('proposal')) return true;

    return false;
  }

  private async saveBatch(extracted: ExtractedTxn[]) {
    const txEntities: TransactionEntity[] = [];
    const opEntities: OperationEntity[] = [];

    for (const { tx, ops } of extracted) {
      const txEntity = this.toTransactionEntity(tx);
      txEntities.push(txEntity);

      for (const op of ops) {
        const opEntity = this.toOperationEntity(txEntity.id, op);
        opEntities.push(opEntity);
      }
    }

    // Bulk insert
    await this.txRepo.manager.transaction(async (manager: any) => {
      await manager.save(TransactionEntity, txEntities);
      await manager.save(OperationEntity, opEntities);
    });
  }

  private async saveRealtime(data: ExtractedTxn) {
    // Upsert logic (hash unique)
    await this.saveBatch([data]);
  }

  private toTransactionEntity(tx: any): TransactionEntity {
    const entity = new TransactionEntity();
    entity.hash = tx.id;
    entity.ledger_sequence = tx.ledger;
    entity.created_at = new Date(tx.created_at);
    entity.source_account = tx.source_account;
    entity.memo = tx.memo;
    entity.max_fee = tx.max_fee;
    entity.fee_charged = tx.fee_charged || '0';
    entity.asset_code = this.WATT_CODE;
    return entity;
  }

  private toOperationEntity(txId: string, op: any): OperationEntity {
    const entity = new OperationEntity();
    entity.transaction_id = txId;
    entity.type = op.type as OperationType;
    entity.from_account = op.source_account;
    entity.to_account = op.account || '';
    entity.amount = {
      value: op.amount || '0',
      currency: op.amount_asset_code || 'XLM',
      issuer: op.amount_issuer || '',
    };

    if (op.type === 'trade') {
      entity.price = op.price;
      entity.base_amount = {
        value: op.base_amount || '0',
        currency: op.base_asset_code || '',
        issuer: op.base_asset_issuer || '',
      };
      entity.counter_amount = {
        value: op.counter_amount || '0',
        currency: op.counter_asset_code || '',
        issuer: op.counter_asset_issuer || '',
      };
    }

    // Gov parse example
    if (op.transaction_memo?.includes('proposal:')) {
      entity.proposal_id = op.transaction_memo.split('proposal:')[1];
    }

    return entity;
  }
}

