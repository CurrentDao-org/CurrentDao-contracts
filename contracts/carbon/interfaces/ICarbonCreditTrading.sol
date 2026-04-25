// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../structures/CarbonStructs.sol";

/**
 * @title ICarbonCreditTrading
 * @author CurrentDao
 * @notice Interface for carbon credit trading marketplace
 */
interface ICarbonCreditTrading {
    // Events
    event CreditIssued(
        uint256 indexed creditId,
        address indexed issuer,
        uint256 amount,
        string standard
    );
    
    event CreditVerified(
        uint256 indexed creditId,
        address indexed verifier,
        bool isValid
    );
    
    event OrderPlaced(
        uint256 indexed orderId,
        address indexed trader,
        uint256 creditId,
        uint256 amount,
        uint256 price,
        bool isBuyOrder
    );
    
    event OrderFilled(
        uint256 indexed orderId,
        uint256 indexed tradeId,
        uint256 amount,
        uint256 price
    );
    
    event TradeExecuted(
        uint256 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        uint256 creditId,
        uint256 amount,
        uint256 price
    );
    
    event CreditRetired(
        uint256 indexed creditId,
        address indexed retiree,
        uint256 amount,
        string reason
    );
    
    event FuturesContractCreated(
        uint256 indexed contractId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 strikePrice,
        uint256 deliveryDate
    );
    
    event ImpactUpdated(
        uint256 indexed creditId,
        uint256 co2Offset,
        uint256 timestamp
    );

    // Credit Management Functions
    function issueCredit(
        string calldata projectId,
        uint256 amount,
        uint256 vintage,
        string calldata standard,
        string calldata methodology,
        string calldata metadataURI
    ) external returns (uint256 creditId);
    
    function verifyCredit(
        uint256 creditId,
        bool isValid,
        string calldata reportURI,
        uint8 confidence
    ) external;
    
    function retireCredit(
        uint256 creditId,
        uint256 amount,
        string calldata reason
    ) external returns (uint256 certificateId);
    
    function getCredit(uint256 creditId) external view returns (CarbonStructs.CarbonCredit memory);
    
    function isVerified(uint256 creditId) external view returns (bool);

    // Trading Functions
    function placeBuyOrder(
        uint256 creditId,
        uint256 amount,
        uint256 price,
        uint256 expiresAt
    ) external returns (uint256 orderId);
    
    function placeSellOrder(
        uint256 creditId,
        uint256 amount,
        uint256 price,
        uint256 expiresAt
    ) external returns (uint256 orderId);
    
    function fillOrder(uint256 orderId, uint256 amount) external returns (uint256 tradeId);
    
    function cancelOrder(uint256 orderId) external;
    
    function getOrder(uint256 orderId) external view returns (CarbonStructs.Order memory);
    
    function getActiveOrders(uint256 creditId) external view returns (uint256[] memory);

    // Marketplace Functions
    function getMarketplaceStats() external view returns (CarbonStructs.MarketplaceStats memory);
    
    function getSpotPrice(uint256 creditId) external view returns (uint256);
    
    function getTradingHistory(uint256 creditId) external view returns (CarbonStructs.Trade[] memory);

    // Futures Trading Functions
    function createFuturesContract(
        uint256 creditId,
        uint256 amount,
        uint256 strikePrice,
        uint256 deliveryDate,
        bool isLong
    ) external returns (uint256 contractId);
    
    function settleFuturesContract(uint256 contractId) external;
    
    function getFuturesContract(uint256 contractId) external view returns (CarbonStructs.FuturesContract memory);

    // Impact Tracking Functions
    function updateImpactMetrics(
        uint256 creditId,
        uint256 co2Equivalent,
        uint256 renewableEnergyGenerated,
        uint256 treesPreserved,
        uint256 waterSaved,
        uint256 biodiversityIndex
    ) external;
    
    function getImpactMetrics(uint256 creditId) external view returns (CarbonStructs.ImpactMetrics memory);
    
    function getTotalEnvironmentalImpact() external view returns (CarbonStructs.ImpactMetrics memory);

    // Verification Functions
    function addVerifier(address verifier) external;
    
    function removeVerifier(address verifier) external;
    
    function isVerifier(address verifier) external view returns (bool);
    
    function getVerificationReport(uint256 creditId) external view returns (CarbonStructs.VerificationReport memory);

    // Standards Compliance Functions
    function checkStandardCompliance(
        uint256 creditId,
        string calldata standard
    ) external view returns (CarbonStructs.StandardCompliance memory);
    
    function addSupportedStandard(string calldata standard) external;
    
    function removeSupportedStandard(string calldata standard) external;

    // Gas Optimization Functions
    function batchExecuteTrades(
        uint256[] calldata orderIds,
        uint256[] calldata amounts
    ) external returns (uint256[] memory tradeIds);
    
    function createGasBundle(
        address[] calldata traders,
        uint256[] calldata creditIds,
        uint256[] calldata amounts,
        uint256[] calldata prices,
        uint256 deadline
    ) external returns (uint256 bundleId);
    
    function executeGasBundle(uint256 bundleId) external;

    // Reporting Functions
    function generateSustainabilityReport(
        address account,
        uint256 startTime,
        uint256 endTime
    ) external view returns (string memory);
    
    function getAccountCarbonFootprint(address account) external view returns (uint256);
    
    function getAccountCarbonOffset(address account) external view returns (uint256);

    // Admin Functions
    function pause() external;
    
    function unpause() external;
    
    function setTradingFee(uint256 fee) external;
    
    function setVerificationFee(uint256 fee) external;
    
    function withdrawFees(address to) external;

    // View Functions
    function getTotalSupply() external view returns (uint256);
    
    function getCirculatingSupply() external view returns (uint256);
    
    function getRetiredSupply() external view returns (uint256);
    
    function getAccountCredits(address account) external view returns (uint256[] memory);
    
    function getAccountBalance(address account, uint256 creditId) external view returns (uint256);
}
