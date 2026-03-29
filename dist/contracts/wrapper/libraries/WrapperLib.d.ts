/**
 * @title WrapperLib
 * @dev Library for Asset Wrapper operations
 */
import { AssetType, FeeStructure } from '../structures/WrapperStructure';
export declare class WrapperLib {
    static readonly BASIS_POINTS = 10000;
    static readonly DEFAULT_MIN_COLLATERAL_RATIO = 15000;
    static readonly LIQUIDATION_THRESHOLD = 12000;
    static readonly MAX_FEE = 1000;
    static readonly MIN_FEE = 10;
    /**
     * @dev Calculate wrap fee based on asset type and amount
     */
    static calculateWrapFee(assetType: AssetType, amount: number, feeStructure: FeeStructure): number;
    /**
     * @dev Calculate unwrap fee
     */
    static calculateUnwrapFee(amount: number, feeStructure: FeeStructure): number;
    /**
     * @dev Calculate collateral ratio
     */
    static calculateCollateralRatio(totalCollateral: number, totalSupply: number, collateralPrice: number): number;
    /**
     * @dev Check if position is healthy
     */
    static isPositionHealthy(collateralRatio: number, minRatio: number): boolean;
    /**
     * @dev Calculate liquidation price
     */
    static calculateLiquidationPrice(totalSupply: number, totalCollateral: number, minRatio: number): number;
    /**
     * @dev Validate asset address format
     */
    static isValidAssetAddress(address: string): boolean;
    /**
     * @dev Validate amount
     */
    static isValidAmount(amount: number): boolean;
    /**
     * @dev Calculate health factor
     */
    static calculateHealthFactor(collateralRatio: number, minRatio: number): number;
    /**
     * @dev Apply protocol fee
     */
    static applyProtocolFee(amount: number, protocolFeeBps: number): number;
    /**
     * @dev Calculate max withdrawable amount
     */
    static calculateMaxWithdrawable(totalCollateral: number, totalSupply: number, collateralPrice: number, minRatio: number): number;
    /**
     * @dev Generate wrapped token ID
     */
    static generateWrappedTokenId(originalAsset: string, assetType: AssetType): string;
    /**
     * @dev Simple hash function for ID generation
     */
    private static simpleHash;
    /**
     * @dev Validate fee structure
     */
    static validateFeeStructure(feeStructure: FeeStructure): boolean;
    /**
     * @dev Calculate risk score
     */
    static calculateRiskScore(collateralRatio: number, assetType: AssetType, volatility: number): number;
    /**
     * @dev Format amount for display
     */
    static formatAmount(amount: number, decimals?: number): string;
    /**
     * @dev Parse amount from string
     */
    static parseAmount(amountStr: string, decimals?: number): number;
}
//# sourceMappingURL=WrapperLib.d.ts.map