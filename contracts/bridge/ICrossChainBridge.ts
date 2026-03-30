import { BridgeTransaction, ValidationProof } from './BridgeStructure';

export interface ICrossChainBridge {
    wrapAsset(
        caller: string,
        destinationChain: string,
        tokenAddress: string,
        amount: number,
        recipient: string,
        minOut: number
    ): BridgeTransaction;

    unwrapAsset(
        originChain: string,
        tokenAddress: string,
        amount: number,
        recipient: string,
        proof: ValidationProof
    ): boolean;

    initiateBridge(transaction: BridgeTransaction): string;
    finalizeBridge(transaction: BridgeTransaction, proof: ValidationProof): boolean;
}
