import { BridgeTx } from '../structures/BridgeStructs';

export class BridgeLib {
  static ensureNotCompleted(tx: BridgeTx) {
    if (tx.completed) throw new Error('Already completed');
  }

  static hasEnoughApprovals(
    tx: BridgeTx,
    min: number
  ): boolean {
    return tx.approvals.size >= min;
  }

  static calculateFee(amount: bigint, feeBps: number): bigint {
    return (amount * BigInt(feeBps)) / 10000n;
  }
}