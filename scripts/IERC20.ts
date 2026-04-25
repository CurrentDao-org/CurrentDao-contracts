export interface IERC20 {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
    balanceOf: (owner: string) => number;
    transfer: (to: string, amount: number) => boolean;
    approve: (spender: string, amount: number) => boolean;
    transferFrom: (from: string, to: string, amount: number) => boolean;
    allowance: (owner: string, spender: string) => number;
}

export interface ERC20Contract {
    name(): Promise<string>;
    symbol(): Promise<string>;
    decimals(): Promise<number>;
    totalSupply(): Promise<number>;
    balanceOf(account: string): Promise<number>;
    transfer(to: string, amount: number): Promise<boolean>;
    approve(spender: string, amount: number): Promise<boolean>;
    transferFrom(from: string, to: string, amount: number): Promise<boolean>;
    allowance(owner: string, spender: string): Promise<number>;
}

export interface TokenMetadata {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
    owner: string;
    mintable: boolean;
    burnable: boolean;
    pausable: boolean;
}

export interface TransferEvent {
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    transactionHash: string;
}

export interface ApprovalEvent {
    owner: string;
    spender: string;
    amount: number;
    timestamp: number;
    transactionHash: string;
}
