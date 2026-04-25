import { Recipient, DistributionRecord } from '../interfaces/IDynamicFeeSwitch';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FeeDistributor {
  private recipients: Recipient[] = [];
  private balances: Map<string, number> = new Map();
  private history: DistributionRecord[] = [];

  configure(recipients: Recipient[]): void {
    const total = recipients.reduce((sum, r) => sum + r.allocationBps, 0);
    if (total !== 10000) {
      throw new ValidationError(
        `Recipient allocations must sum to 10000 bps (100%), but got ${total}`
      );
    }
    this.recipients = recipients;
    this.balances = new Map(recipients.map(r => [r.address, 0]));
  }

  distribute(amount: number): void {
    if (amount <= 0) {
      throw new ValidationError(
        `Distribution amount must be greater than 0, but got ${amount}`
      );
    }

    const perRecipient: Array<{ address: string; amount: number }> = [];

    for (const recipient of this.recipients) {
      const share = (amount * recipient.allocationBps) / 10000;
      const current = this.balances.get(recipient.address) ?? 0;
      this.balances.set(recipient.address, current + share);
      perRecipient.push({ address: recipient.address, amount: share });
    }

    const record: DistributionRecord = {
      timestamp: Date.now(),
      totalAmount: amount,
      recipients: perRecipient,
    };
    this.history.push(record);
  }

  getTreasuryBalance(): number {
    for (const recipient of this.recipients) {
      if (recipient.name.toLowerCase().includes('treasury')) {
        return this.balances.get(recipient.address) ?? 0;
      }
    }
    return 0;
  }

  getRewardsPoolBalance(): number {
    for (const recipient of this.recipients) {
      const nameLower = recipient.name.toLowerCase();
      if (nameLower.includes('reward')) {
        return this.balances.get(recipient.address) ?? 0;
      }
    }
    return 0;
  }

  getHistory(): DistributionRecord[] {
    return this.history;
  }
}
