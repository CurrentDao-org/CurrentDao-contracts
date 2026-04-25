// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CarbonStructs
 * @author CurrentDao
 * @notice Data structures for carbon credit trading system
 */
library CarbonStructs {
    /**
     * @dev Carbon credit information
     */
    struct CarbonCredit {
        uint256 id;
        string projectId;
        uint256 amount; // in tonnes of CO2
        uint256 vintage;
        string standard; // VCS, Gold Standard, etc.
        string methodology;
        address issuer;
        address currentOwner;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isRetired;
        bool isVerified;
        string metadataURI;
    }

    /**
     * @dev Project information
     */
    struct CarbonProject {
        uint256 id;
        string name;
        string description;
        address developer;
        string location;
        string projectType; // forestry, renewable energy, etc.
        uint256 totalCredits;
        uint256 issuedCredits;
        uint256 retiredCredits;
        bool isActive;
        string verificationStatus;
        uint256 lastVerified;
    }

    /**
     * @dev Trading order
     */
    struct Order {
        uint256 id;
        address trader;
        uint256 creditId;
        uint256 amount;
        uint256 price; // price per tonne in wei
        bool isBuyOrder;
        bool isActive;
        uint256 timestamp;
        uint256 expiresAt;
        uint256 filledAmount;
    }

    /**
     * @dev Trade execution record
     */
    struct Trade {
        uint256 id;
        uint256 buyOrderId;
        uint256 sellOrderId;
        uint256 creditId;
        uint256 amount;
        uint256 price;
        address buyer;
        address seller;
        uint256 timestamp;
        uint256 fee;
    }

    /**
     * @dev Verification report
     */
    struct VerificationReport {
        uint256 creditId;
        address verifier;
        uint256 timestamp;
        bool isValid;
        string reportURI;
        string standard;
        uint8 confidence; // 0-100
    }

    /**
     * @dev Environmental impact metrics
     */
    struct ImpactMetrics {
        uint256 totalOffset;
        uint256 co2Equivalent;
        uint256 renewableEnergyGenerated; // in kWh
        uint256 treesPreserved;
        uint256 waterSaved; // in liters
        uint256 biodiversityIndex;
        uint256 lastUpdated;
    }

    /**
     * @dev Retirement certificate
     */
    struct RetirementCertificate {
        uint256 id;
        uint256 creditId;
        address retiree;
        uint256 amount;
        string retirementReason;
        uint256 timestamp;
        string certificateURI;
    }

    /**
     * @dev Futures contract
     */
    struct FuturesContract {
        uint256 id;
        uint256 creditId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 strikePrice;
        uint256 deliveryDate;
        uint256 marginRequirement;
        bool isLong;
        bool isActive;
        uint256 timestamp;
    }

    /**
     * @dev Marketplace statistics
     */
    struct MarketplaceStats {
        uint256 totalVolume;
        uint256 totalTrades;
        uint256 totalCredits;
        uint256 activeOrders;
        uint256 averagePrice;
        uint256 lastUpdated;
    }

    /**
     * @dev Standard compliance information
     */
    struct StandardCompliance {
        string standardName;
        bool isCompliant;
        uint256 lastAuditDate;
        string auditReportURI;
        uint8 rating; // 0-100
    }

    /**
     * @dev Gas optimization bundle
     */
    struct GasBundle {
        address[] traders;
        uint256[] creditIds;
        uint256[] amounts;
        uint256[] prices;
        uint256 deadline;
        bool isExecuted;
    }
}
