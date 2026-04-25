// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../structures/CarbonStructs.sol";

/**
 * @title CarbonLib
 * @author CurrentDao
 * @notice Library for carbon credit calculations and validations
 */
library CarbonLib {
    // Constants for carbon calculations
    uint256 private constant TONNE_TO_KG = 1000;
    uint256 private constant YEAR_TO_SECONDS = 31536000;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_CONFIDENCE = 100;
    
    // Supported carbon standards
    string private constant VCS_STANDARD = "VCS";
    string private constant GOLD_STANDARD = "Gold Standard";
    string private constant CDM_STANDARD = "CDM";
    string private constant CARBON_REGISTRY_STANDARD = "Carbon Registry";
    
    // Methodology categories
    string private constant FORESTRY = "Forestry";
    string private constant RENEWABLE_ENERGY = "Renewable Energy";
    string private constant ENERGY_EFFICIENCY = "Energy Efficiency";
    string private constant METHANE_CAPTURE = "Methane Capture";
    
    /**
     * @dev Validates carbon credit data
     */
    function validateCredit(
        CarbonStructs.CarbonCredit memory credit
    ) internal pure returns (bool isValid, string memory reason) {
        if (credit.amount == 0) {
            return (false, "Amount cannot be zero");
        }
        
        if (credit.vintage == 0 || credit.vintage > block.timestamp) {
            return (false, "Invalid vintage year");
        }
        
        if (credit.expiresAt != 0 && credit.expiresAt <= block.timestamp) {
            return (false, "Credit has expired");
        }
        
        if (credit.issuer == address(0)) {
            return (false, "Invalid issuer address");
        }
        
        if (bytes(credit.standard).length == 0) {
            return (false, "Standard cannot be empty");
        }
        
        return (true, "");
    }
    
    /**
     * @dev Checks if a standard is supported
     */
    function isSupportedStandard(string memory standard) internal pure returns (bool) {
        return keccak256(bytes(standard)) == keccak256(bytes(VCS_STANDARD)) ||
               keccak256(bytes(standard)) == keccak256(bytes(GOLD_STANDARD)) ||
               keccak256(bytes(standard)) == keccak256(bytes(CDM_STANDARD)) ||
               keccak256(bytes(standard)) == keccak256(bytes(CARBON_REGISTRY_STANDARD));
    }
    
    /**
     * @dev Calculates trading fee based on amount and fee rate
     */
    function calculateTradingFee(
        uint256 amount,
        uint256 price,
        uint256 feeRateBps
    ) internal pure returns (uint256 fee) {
        uint256 totalValue = amount * price;
        return (totalValue * feeRateBps) / BASIS_POINTS;
    }
    
    /**
     * @dev Calculates CO2 equivalent for different project types
     */
    function calculateCO2Equivalent(
        uint256 amount,
        string memory methodology
    ) internal pure returns (uint256 co2eq) {
        if (keccak256(bytes(methodology)) == keccak256(bytes(FORESTRY))) {
            // Forestry: 1 tonne CO2 = 1 tonne CO2e
            return amount;
        } else if (keccak256(bytes(methodology)) == keccak256(bytes(RENEWABLE_ENERGY))) {
            // Renewable energy: 1 MWh = 0.5 tonnes CO2e (average)
            return (amount * 500) / 1000;
        } else if (keccak256(bytes(methodology)) == keccak256(bytes(ENERGY_EFFICIENCY))) {
            // Energy efficiency: 1 MWh saved = 0.4 tonnes CO2e
            return (amount * 400) / 1000;
        } else if (keccak256(bytes(methodology)) == keccak256(bytes(METHANE_CAPTURE))) {
            // Methane capture: 1 tonne CH4 = 25 tonnes CO2e
            return amount * 25;
        } else {
            // Default: 1:1 ratio
            return amount;
        }
    }
    
    /**
     * @dev Validates order parameters
     */
    function validateOrder(
        uint256 amount,
        uint256 price,
        uint256 expiresAt
    ) internal view returns (bool isValid, string memory reason) {
        if (amount == 0) {
            return (false, "Amount cannot be zero");
        }
        
        if (price == 0) {
            return (false, "Price cannot be zero");
        }
        
        if (expiresAt != 0 && expiresAt <= block.timestamp) {
            return (false, "Order already expired");
        }
        
        return (true, "");
    }
    
    /**
     * @dev Calculates impact metrics for a credit
     */
    function calculateImpactMetrics(
        CarbonStructs.CarbonCredit memory credit,
        string memory methodology
    ) internal pure returns (CarbonStructs.ImpactMetrics memory) {
        CarbonStructs.ImpactMetrics memory metrics;
        
        metrics.co2Equivalent = calculateCO2Equivalent(credit.amount, methodology);
        metrics.totalOffset = credit.amount;
        
        // Calculate additional metrics based on methodology
        if (keccak256(bytes(methodology)) == keccak256(bytes(FORESTRY))) {
            // Approximate: 1 tonne CO2 = 1 tree preserved per year
            metrics.treesPreserved = credit.amount;
            metrics.waterSaved = credit.amount * 1000; // 1000 liters per tree
        } else if (keccak256(bytes(methodology)) == keccak256(bytes(RENEWABLE_ENERGY))) {
            // 1 MWh renewable energy prevents ~0.5 tonnes CO2
            metrics.renewableEnergyGenerated = credit.amount * 2000; // 2 MWh per tonne
        }
        
        metrics.biodiversityIndex = calculateBiodiversityIndex(methodology, credit.amount);
        metrics.lastUpdated = block.timestamp;
        
        return metrics;
    }
    
    /**
     * @dev Calculates biodiversity index (0-100)
     */
    function calculateBiodiversityIndex(
        string memory methodology,
        uint256 amount
    ) internal pure returns (uint256 index) {
        if (keccak256(bytes(methodology)) == keccak256(bytes(FORESTRY))) {
            // Forestry projects have high biodiversity impact
            return _min(amount / 10, 100); // 1 point per 10 tonnes, max 100
        } else if (keccak256(bytes(methodology)) == keccak256(bytes(RENEWABLE_ENERGY))) {
            // Renewable energy has moderate biodiversity impact
            return _min(amount / 20, 100); // 1 point per 20 tonnes, max 100
        } else {
            // Other methodologies have lower biodiversity impact
            return _min(amount / 50, 100); // 1 point per 50 tonnes, max 100
        }
    }
    
    /**
     * @dev Validates futures contract parameters
     */
    function validateFuturesContract(
        uint256 strikePrice,
        uint256 deliveryDate,
        uint256 marginRequirement
    ) internal view returns (bool isValid, string memory reason) {
        if (strikePrice == 0) {
            return (false, "Strike price cannot be zero");
        }
        
        if (deliveryDate <= block.timestamp) {
            return (false, "Delivery date must be in the future");
        }
        
        if (marginRequirement > strikePrice) {
            return (false, "Margin cannot exceed strike price");
        }
        
        return (true, "");
    }
    
    /**
     * @dev Calculates futures settlement amount
     */
    function calculateFuturesSettlement(
        uint256 strikePrice,
        uint256 spotPrice,
        uint256 amount,
        bool isLong
    ) internal pure returns (uint256 settlement) {
        if (isLong) {
            // Long position profits when spot > strike
            if (spotPrice > strikePrice) {
                return (spotPrice - strikePrice) * amount;
            }
        } else {
            // Short position profits when strike > spot
            if (strikePrice > spotPrice) {
                return (strikePrice - spotPrice) * amount;
            }
        }
        return 0;
    }
    
    /**
     * @dev Optimizes gas usage for batch operations
     */
    function optimizeBatchOperations(
        uint256[] memory amounts,
        uint256[] memory prices
    ) internal pure returns (uint256 totalAmount, uint256 totalValue) {
        require(amounts.length == prices.length, "Array length mismatch");
        
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
            totalValue += amounts[i] * prices[i];
        }
    }
    
    /**
     * @dev Generates retirement certificate ID
     */
    function generateCertificateId(
        uint256 creditId,
        address retiree,
        uint256 amount
    ) internal view returns (uint256 certificateId) {
        return uint256(keccak256(abi.encodePacked(
            creditId,
            retiree,
            amount,
            block.timestamp,
            block.difficulty
        )));
    }
    
    /**
     * @dev Verifies credit authenticity using multiple factors
     */
    function verifyCreditAuthenticity(
        CarbonStructs.CarbonCredit memory credit,
        CarbonStructs.VerificationReport memory report
    ) internal pure returns (bool isAuthentic, uint256 confidence) {
        if (!report.isValid) {
            return (false, 0);
        }
        
        uint256 score = 0;
        
        // Check standard compliance (30 points)
        if (isSupportedStandard(credit.standard)) {
            score += 30;
        }
        
        // Check verification confidence (40 points)
        score += (report.confidence * 40) / MAX_CONFIDENCE;
        
        // Check vintage validity (20 points)
        if (credit.vintage > 0 && credit.vintage <= block.timestamp) {
            score += 20;
        }
        
        // Check issuer validity (10 points)
        if (credit.issuer != address(0)) {
            score += 10;
        }
        
        confidence = score;
        isAuthentic = score >= 80; // 80% threshold for authenticity
        
        return (isAuthentic, confidence);
    }
    
    /**
     * @dev Calculates environmental benefit score
     */
    function calculateEnvironmentalBenefitScore(
        CarbonStructs.ImpactMetrics memory metrics
    ) internal pure returns (uint256 score) {
        uint256 totalScore = 0;
        
        // CO2 offset (40% weight)
        totalScore += (metrics.co2Equivalent * 40) / 1000000; // Normalize per million tonnes
        
        // Renewable energy (20% weight)
        totalScore += (metrics.renewableEnergyGenerated * 20) / 1000000; // Normalize per MWh
        
        // Trees preserved (20% weight)
        totalScore += (metrics.treesPreserved * 20) / 100000; // Normalize per 100k trees
        
        // Water saved (10% weight)
        totalScore += (metrics.waterSaved * 10) / 1000000; // Normalize per million liters
        
        // Biodiversity index (10% weight)
        totalScore += (metrics.biodiversityIndex * 10) / 100;
        
        return _min(totalScore, 100); // Cap at 100
    }
    
    /**
     * @dev Helper function for minimum
     */
    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
    
    /**
     * @dev Converts tonnes to kilograms
     */
    function tonnesToKg(uint256 tonnes) internal pure returns (uint256 kg) {
        return tonnes * TONNE_TO_KG;
    }
    
    /**
     * @dev Converts kilograms to tonnes
     */
    function kgToTonnes(uint256 kg) internal pure returns (uint256 tonnes) {
        return kg / TONNE_TO_KG;
    }
    
    /**
     * @dev Checks if two strings are equal
     */
    function stringsEqual(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
