export interface BridgeTransaction {
    nonce: number;
    originChain: string;
    destinationChain: string;
    tokenAddress: string;
    sender: string;
    recipient: string;
    amount: number;
    fee: number;
}

export interface WrappedAsset {
    originalTokenAddress: string;
    originalChain: string;
    wrappedTokenAddress: string;
}

export interface LiquidityPool {
    chain: string;
    tokenAddress: string;
    balance: number;
}

export interface ChainConfig {
    chainId: string;
    isActive: boolean;
    requiredSignatures: number;
}

export interface ValidationProof {
    signatures: string[];
    relayer: string;
    txHash: string;
}
