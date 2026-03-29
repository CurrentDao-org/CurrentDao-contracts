/**
 * @title IAssetWrapper
 * @dev Interface for the Asset Wrapper Contract
 * @notice Enables representation of external assets on the Stellar network
 */
export interface IAssetWrapper {
    wrapAsset(caller: string, assetAddress: string, amount: number, assetType: AssetType): Promise<boolean>;
    unwrapAsset(caller: string, wrappedTokenId: string, amount: number): Promise<boolean>;
    depositCollateral(caller: string, wrappedTokenId: string, amount: number): Promise<boolean>;
    withdrawCollateral(caller: string, wrappedTokenId: string, amount: number): Promise<boolean>;
    verifyAsset(assetAddress: string, assetType: AssetType): Promise<boolean>;
    isAssetSupported(assetAddress: string): boolean;
    calculateWrapFee(assetType: AssetType, amount: number): number;
    calculateUnwrapFee(wrappedTokenId: string, amount: number): number;
    getAssetPrice(assetAddress: string): number;
    getCollateralRatio(wrappedTokenId: string): number;
    addSupportedAsset(caller: string, assetAddress: string, assetType: AssetType): Promise<boolean>;
    removeSupportedAsset(caller: string, assetAddress: string): Promise<boolean>;
    updateFeeStructure(caller: string, assetType: AssetType, wrapFee: number, unwrapFee: number): Promise<boolean>;
    getWrappedTokenInfo(wrappedTokenId: string): WrappedTokenInfo | null;
    getUserWrappedTokens(user: string): string[];
    getTotalCollateral(wrappedTokenId: string): number;
    onAssetWrapped(callback: (event: AssetWrappedEvent) => void): void;
    onAssetUnwrapped(callback: (event: AssetUnwrappedEvent) => void): void;
    onCollateralDeposited(callback: (event: CollateralDepositedEvent) => void): void;
    onCollateralWithdrawn(callback: (event: CollateralWithdrawnEvent) => void): void;
}
export declare enum AssetType {
    ERC20 = "ERC20",
    ERC721 = "ERC721",
    ERC1155 = "ERC1155",
    NATIVE = "NATIVE",
    STABLECOIN = "STABLECOIN"
}
export interface WrappedTokenInfo {
    id: string;
    originalAssetAddress: string;
    assetType: AssetType;
    totalSupply: number;
    totalCollateral: number;
    collateralRatio: number;
    wrapFee: number;
    unwrapFee: number;
    isActive: boolean;
    createdAt: number;
}
export interface AssetWrappedEvent {
    user: string;
    originalAssetAddress: string;
    wrappedTokenId: string;
    amount: number;
    fee: number;
    timestamp: number;
}
export interface AssetUnwrappedEvent {
    user: string;
    wrappedTokenId: string;
    originalAssetAddress: string;
    amount: number;
    fee: number;
    timestamp: number;
}
export interface CollateralDepositedEvent {
    user: string;
    wrappedTokenId: string;
    amount: number;
    timestamp: number;
}
export interface CollateralWithdrawnEvent {
    user: string;
    wrappedTokenId: string;
    amount: number;
    timestamp: number;
}
//# sourceMappingURL=IAssetWrapper.d.ts.map