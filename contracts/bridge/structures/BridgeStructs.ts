export type Address = string;

export interface BridgeAsset {
  token: Address;
  chainId: number;
  liquidity: bigint;
}

export interface BridgeTx {
  id: string;
  from: Address;
  to: Address;
  token: Address;
  amount: bigint;
  fromChain: number;
  toChain: number;
  completed: boolean;
  approvals: Set<Address>;
}

export interface BridgeConfig {
  validators: Address[];
  minApprovals: number;
  feeBps: number; // basis points
  paused: boolean;
}