import { Address } from '../structures/TreasuryStructs';

export interface ITreasuryManagement {
  deposit(token: Address, amount: bigint): Promise<void>;
  createAllocation(
    recipient: Address,
    token: Address,
    amount: bigint
  ): Promise<string>;

  approveAllocation(id: string, signer: Address): Promise<void>;
  executeAllocation(id: string): Promise<void>;

  createInvestment(
    protocol: Address,
    asset: Address,
    amount: bigint
  ): Promise<string>;

  exitInvestment(id: string): Promise<void>;

  getBalance(token: Address): Promise<bigint>;
}