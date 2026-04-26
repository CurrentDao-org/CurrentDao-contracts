import crypto from 'crypto';
import {
  BridgeTx,
  BridgeConfig,
  BridgeAsset,
  Address,
} from './structures/BridgeStructs';

import { IMultiCurrencyBridge } from './interfaces/IMultiCurrencyBridge';
import { BridgeLib } from './libraries/BridgeLib';

export class MultiCurrencyBridge implements IMultiCurrencyBridge {
  private txs: Map<string, BridgeTx> = new Map();
  private liquidity: Map<string, BridgeAsset> = new Map();

  private config: BridgeConfig;

  constructor(config: BridgeConfig) {
    if (config.minApprovals > config.validators.length) {
      throw new Error('Invalid validator config');
    }
    this.config = config;
  }

  private ensureActive() {
    if (this.config.paused) throw new Error('Bridge paused');
  }

  private isValidator(addr: Address) {
    if (!this.config.validators.includes(addr)) {
      throw new Error('Not validator');
    }
  }

  private assetKey(token: Address, chainId: number) {
    return `${token}-${chainId}`;
  }

  async deposit(
    from: Address,
    token: Address,
    amount: bigint,
    targetChain: number
  ) {
    this.ensureActive();

    const fee = BridgeLib.calculateFee(amount, this.config.feeBps);
    const net = amount - fee;

    const id = crypto.randomUUID();

    this.txs.set(id, {
      id,
      from,
      to: from,
      token,
      amount: net,
      fromChain: 1, // simulate
      toChain: targetChain,
      completed: false,
      approvals: new Set(),
    });

    // increase liquidity on source chain
    const key = this.assetKey(token, 1);
    const asset = this.liquidity.get(key) || {
      token,
      chainId: 1,
      liquidity: 0n,
    };

    asset.liquidity += amount;
    this.liquidity.set(key, asset);

    return id;
  }

  async validateTx(id: string, validator: Address) {
    this.ensureActive();
    this.isValidator(validator);

    const tx = this.txs.get(id);
    if (!tx) throw new Error('Tx not found');

    BridgeLib.ensureNotCompleted(tx);

    tx.approvals.add(validator);
  }

  async claim(id: string, recipient: Address) {
    this.ensureActive();

    const tx = this.txs.get(id);
    if (!tx) throw new Error('Tx not found');

    BridgeLib.ensureNotCompleted(tx);

    if (
      !BridgeLib.hasEnoughApprovals(
        tx,
        this.config.minApprovals
      )
    ) {
      throw new Error('Not enough approvals');
    }

    // check liquidity on destination
    const key = this.assetKey(tx.token, tx.toChain);
    const asset = this.liquidity.get(key);

    if (!asset || asset.liquidity < tx.amount) {
      throw new Error('Insufficient liquidity');
    }

    asset.liquidity -= tx.amount;

    tx.completed = true;

    // simulate token mint/unlock
    return {
      recipient,
      amount: tx.amount,
    };
  }

  async emergencyPause() {
    this.config.paused = true;
  }

  async resume() {
    this.config.paused = false;
  }
}