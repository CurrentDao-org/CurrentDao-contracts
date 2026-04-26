import {
  Allocation,
  InvestmentPosition,
  TreasuryConfig,
  Address,
} from './structures/TreasuryStructs';

import { ITreasuryManagement } from './interfaces/ITreasuryManagement';
import { TreasuryLib } from './libraries/TreasuryLib';
import crypto from 'crypto';

export class TreasuryManagement implements ITreasuryManagement {
  private balances: Map<Address, bigint> = new Map();
  private allocations: Map<string, Allocation> = new Map();
  private investments: Map<string, InvestmentPosition> = new Map();

  private config: TreasuryConfig;

  constructor(config: TreasuryConfig) {
    if (config.minSigners > config.signers.length) {
      throw new Error('Invalid signer configuration');
    }
    this.config = config;
  }

  // 🔐 SECURITY: signer check
  private isSigner(addr: Address) {
    if (!this.config.signers.includes(addr)) {
      throw new Error('Not authorized signer');
    }
  }

  async deposit(token: Address, amount: bigint) {
    const current = this.balances.get(token) || 0n;
    this.balances.set(token, current + amount);
  }

  async getBalance(token: Address) {
    return this.balances.get(token) || 0n;
  }

  async createAllocation(
    recipient: Address,
    token: Address,
    amount: bigint
  ) {
    const balance = await this.getBalance(token);

    if (balance < amount) {
      throw new Error('Insufficient treasury balance');
    }

    const id = crypto.randomUUID();

    const allocation: Allocation = {
      id,
      recipient,
      amount,
      token,
      executed: false,
      approvals: new Set(),
    };

    this.allocations.set(id, allocation);
    return id;
  }

  async approveAllocation(id: string, signer: Address) {
    this.isSigner(signer);

    const allocation = this.allocations.get(id);
    if (!allocation) throw new Error('Allocation not found');

    TreasuryLib.ensureNotExecuted(allocation);

    allocation.approvals.add(signer);
  }

  async executeAllocation(id: string) {
    const allocation = this.allocations.get(id);
    if (!allocation) throw new Error('Allocation not found');

    TreasuryLib.ensureNotExecuted(allocation);

    if (
      !TreasuryLib.hasEnoughApprovals(
        allocation,
        this.config.minSigners
      )
    ) {
      throw new Error('Not enough approvals');
    }

    const balance = await this.getBalance(allocation.token);

    if (balance < allocation.amount) {
      throw new Error('Insufficient funds at execution');
    }

    // Deduct
    this.balances.set(
      allocation.token,
      balance - allocation.amount
    );

    allocation.executed = true;
  }

  async createInvestment(
    protocol: Address,
    asset: Address,
    amount: bigint
  ) {
    const balance = await this.getBalance(asset);

    if (balance < amount) {
      throw new Error('Insufficient funds');
    }

    const id = crypto.randomUUID();

    this.investments.set(id, {
      id,
      protocol,
      asset,
      amount,
      active: true,
    });

    this.balances.set(asset, balance - amount);

    return id;
  }

  async exitInvestment(id: string) {
    const inv = this.investments.get(id);
    if (!inv || !inv.active) {
      throw new Error('Invalid investment');
    }

    inv.active = false;

    const balance = await this.getBalance(inv.asset);
    this.balances.set(inv.asset, balance + inv.amount);
  }
}