import { ChainInfo } from '../structures/LiquidityStructure';
export declare class CrossChainBridge {
    private chains;
    constructor(chains: Map<number, ChainInfo>);
    /**
     * Bridges an asset from one chain to another.
     */
    bridgeAsset(fromChainId: number, toChainId: number, amount: number): Promise<boolean>;
    /**
     * Estimates bridging costs between chains.
     */
    estimateBridgingCosts(fromChainId: number, toChainId: number, amount: number): number;
}
//# sourceMappingURL=CrossChainBridge.d.ts.map