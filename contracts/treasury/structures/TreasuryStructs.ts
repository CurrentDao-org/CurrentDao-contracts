export type Address = string;

export interface TreasuryAsset {
  token: Address; // address(0) for native
  balance: bigint;
}

export interface Allocation {
  id: string;
  recipient: Address;
  amount: bigint;
  token: Address;
  executed: boolean;
  approvals: Set<Address>;
}

export interface InvestmentPosition {
  id: string;
  protocol: Address;
  asset: Address;
  amount: bigint;
  active: boolean;
}

export interface TreasuryConfig {
  minSigners: number;
  signers: Address[];
}