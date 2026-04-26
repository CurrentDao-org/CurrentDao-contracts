import { Allocation } from '../structures/TreasuryStructs';

export class TreasuryLib {
  static hasEnoughApprovals(
    allocation: Allocation,
    minSigners: number
  ): boolean {
    return allocation.approvals.size >= minSigners;
  }

  static ensureNotExecuted(allocation: Allocation) {
    if (allocation.executed) {
      throw new Error('Allocation already executed');
    }
  }
}