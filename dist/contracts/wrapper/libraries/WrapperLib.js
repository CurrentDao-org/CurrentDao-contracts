"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WrapperLib = void 0;
/**
 * @title WrapperLib
 * @dev Library for Asset Wrapper operations
 */
const WrapperStructure_1 = require("../structures/WrapperStructure");
const SafeMath_1 = require("../../token/libraries/SafeMath");
class WrapperLib {
    // Constants
    static BASIS_POINTS = 10000;
    static DEFAULT_MIN_COLLATERAL_RATIO = 15000; // 150%
    static LIQUIDATION_THRESHOLD = 12000; // 120%
    static MAX_FEE = 1000; // 10%
    static MIN_FEE = 10; // 0.1%
    /**
     * @dev Calculate wrap fee based on asset type and amount
     */
    static calculateWrapFee(assetType, amount, feeStructure) {
        let baseFee = feeStructure.wrapFee;
        // Apply asset type specific adjustments
        switch (assetType) {
            case WrapperStructure_1.AssetType.STABLECOIN:
                baseFee = Math.floor(baseFee * 0.5); // 50% discount for stablecoins
                break;
            case WrapperStructure_1.AssetType.NATIVE:
                baseFee = Math.floor(baseFee * 0.8); // 20% discount for native assets
                break;
            case WrapperStructure_1.AssetType.ERC721:
            case WrapperStructure_1.AssetType.ERC1155:
                baseFee = Math.max(baseFee, 100); // Minimum 1% for NFTs
                break;
        }
        return SafeMath_1.SafeMath.mul(amount, baseFee).div(this.BASIS_POINTS);
    }
    /**
     * @dev Calculate unwrap fee
     */
    static calculateUnwrapFee(amount, feeStructure) {
        return SafeMath_1.SafeMath.mul(amount, feeStructure.unwrapFee).div(this.BASIS_POINTS);
    }
    /**
     * @dev Calculate collateral ratio
     */
    static calculateCollateralRatio(totalCollateral, totalSupply, collateralPrice) {
        if (totalSupply === 0)
            return this.BASIS_POINTS * 2; // 200% if no supply
        const collateralValue = SafeMath_1.SafeMath.mul(totalCollateral, collateralPrice);
        const supplyValue = totalSupply;
        return SafeMath_1.SafeMath.mul(collateralValue, this.BASIS_POINTS).div(supplyValue);
    }
    /**
     * @dev Check if position is healthy
     */
    static isPositionHealthy(collateralRatio, minRatio) {
        return collateralRatio >= minRatio;
    }
    /**
     * @dev Calculate liquidation price
     */
    static calculateLiquidationPrice(totalSupply, totalCollateral, minRatio) {
        if (totalCollateral === 0)
            return 0;
        const requiredCollateralValue = SafeMath_1.SafeMath.mul(totalSupply, minRatio);
        return SafeMath_1.SafeMath.div(requiredCollateralValue, SafeMath_1.SafeMath.mul(totalCollateral, this.BASIS_POINTS));
    }
    /**
     * @dev Validate asset address format
     */
    static isValidAssetAddress(address) {
        // Basic validation for Stellar addresses
        return /^G[0-9A-Z]{55}$/.test(address) || address.length >= 32;
    }
    /**
     * @dev Validate amount
     */
    static isValidAmount(amount) {
        return amount > 0 && amount <= Number.MAX_SAFE_INTEGER;
    }
    /**
     * @dev Calculate health factor
     */
    static calculateHealthFactor(collateralRatio, minRatio) {
        if (minRatio === 0)
            return 0;
        return SafeMath_1.SafeMath.mul(collateralRatio, this.BASIS_POINTS).div(minRatio);
    }
    /**
     * @dev Apply protocol fee
     */
    static applyProtocolFee(amount, protocolFeeBps) {
        return SafeMath_1.SafeMath.mul(amount, protocolFeeBps).div(this.BASIS_POINTS);
    }
    /**
     * @dev Calculate max withdrawable amount
     */
    static calculateMaxWithdrawable(totalCollateral, totalSupply, collateralPrice, minRatio) {
        const currentRatio = this.calculateCollateralRatio(totalCollateral, totalSupply, collateralPrice);
        if (currentRatio <= minRatio)
            return 0;
        const excessRatio = SafeMath_1.SafeMath.sub(currentRatio, minRatio);
        const excessCollateralValue = SafeMath_1.SafeMath.mul(totalSupply, excessRatio).div(this.BASIS_POINTS);
        return SafeMath_1.SafeMath.div(excessCollateralValue, collateralPrice);
    }
    /**
     * @dev Generate wrapped token ID
     */
    static generateWrappedTokenId(originalAsset, assetType) {
        const timestamp = Date.now().toString();
        const hash = this.simpleHash(originalAsset + assetType + timestamp);
        return `WRAP_${assetType}_${hash}`;
    }
    /**
     * @dev Simple hash function for ID generation
     */
    static simpleHash(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    /**
     * @dev Validate fee structure
     */
    static validateFeeStructure(feeStructure) {
        return feeStructure.wrapFee >= this.MIN_FEE &&
            feeStructure.wrapFee <= this.MAX_FEE &&
            feeStructure.unwrapFee >= this.MIN_FEE &&
            feeStructure.unwrapFee <= this.MAX_FEE &&
            feeStructure.protocolFee >= 0 &&
            feeStructure.protocolFee <= this.MAX_FEE;
    }
    /**
     * @dev Calculate risk score
     */
    static calculateRiskScore(collateralRatio, assetType, volatility) {
        let baseScore = 50; // Base risk score
        // Adjust based on collateral ratio
        if (collateralRatio < 12000)
            baseScore += 30;
        else if (collateralRatio < 15000)
            baseScore += 15;
        else if (collateralRatio > 20000)
            baseScore -= 10;
        // Adjust based on asset type
        switch (assetType) {
            case WrapperStructure_1.AssetType.STABLECOIN:
                baseScore -= 20;
                break;
            case WrapperStructure_1.AssetType.NATIVE:
                baseScore -= 10;
                break;
            case WrapperStructure_1.AssetType.ERC721:
            case WrapperStructure_1.AssetType.ERC1155:
                baseScore += 25;
                break;
        }
        // Adjust based on volatility (0-100)
        baseScore += Math.floor(volatility / 2);
        return Math.max(0, Math.min(100, baseScore));
    }
    /**
     * @dev Format amount for display
     */
    static formatAmount(amount, decimals = 18) {
        const divisor = Math.pow(10, decimals);
        const formatted = (amount / divisor).toFixed(6);
        return formatted.replace(/\.?0+$/, '');
    }
    /**
     * @dev Parse amount from string
     */
    static parseAmount(amountStr, decimals = 18) {
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0)
            return 0;
        const divisor = Math.pow(10, decimals);
        return Math.floor(amount * divisor);
    }
}
exports.WrapperLib = WrapperLib;
//# sourceMappingURL=WrapperLib.js.map