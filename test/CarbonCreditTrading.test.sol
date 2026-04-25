// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/carbon/CarbonCreditTrading.sol";
import "../contracts/carbon/structures/CarbonStructs.sol";
import "../contracts/carbon/libraries/CarbonLib.sol";

/**
 * @title CarbonCreditTradingTest
 * @author CurrentDao
 * @notice Comprehensive test suite for carbon credit trading contract
 */
contract CarbonCreditTradingTest is Test {
    CarbonCreditTrading public carbonMarket;
    address public owner;
    address public verifier;
    address public issuer;
    address public trader1;
    address public trader2;
    address public trader3;
    
    uint256 public constant CREDIT_AMOUNT = 1000; // 1000 tonnes CO2
    uint256 public constant PRICE_PER_TONNE = 100 ether; // 100 ETH per tonne
    uint256 public constant VINTAGE_YEAR = 2023;
    
    event CreditIssued(uint256 indexed creditId, address indexed issuer, uint256 amount, string standard);
    event CreditVerified(uint256 indexed creditId, address indexed verifier, bool isValid);
    event OrderPlaced(uint256 indexed orderId, address indexed trader, uint256 creditId, uint256 amount, uint256 price, bool isBuyOrder);
    event OrderFilled(uint256 indexed orderId, uint256 indexed tradeId, uint256 amount, uint256 price);
    event TradeExecuted(uint256 indexed tradeId, address indexed buyer, address indexed seller, uint256 creditId, uint256 amount, uint256 price);
    event CreditRetired(uint256 indexed creditId, address indexed retiree, uint256 amount, string reason);
    event FuturesContractCreated(uint256 indexed contractId, address indexed buyer, address indexed seller, uint256 amount, uint256 strikePrice, uint256 deliveryDate);
    event ImpactUpdated(uint256 indexed creditId, uint256 co2Offset, uint256 timestamp);
    
    function setUp() public {
        // Setup test accounts
        owner = address(this);
        verifier = makeAddr("verifier");
        issuer = makeAddr("issuer");
        trader1 = makeAddr("trader1");
        trader2 = makeAddr("trader2");
        trader3 = makeAddr("trader3");
        
        // Fund accounts
        vm.deal(trader1, 1000 ether);
        vm.deal(trader2, 1000 ether);
        vm.deal(trader3, 1000 ether);
        
        // Deploy contract
        carbonMarket = new CarbonCreditTrading("Carbon Credit", "CARBON");
        
        // Setup verifiers
        carbonMarket.addVerifier(verifier);
        
        // Fund contract for fee payments
        vm.deal(address(carbonMarket), 10 ether);
    }
    
    // Credit Issuance Tests
    
    function testIssueCredit() public {
        vm.startPrank(issuer);
        
        uint256 creditId = carbonMarket.issueCredit(
            "PROJ001",
            CREDIT_AMOUNT,
            VINTAGE_YEAR,
            "VCS",
            "Forestry",
            "https://api.currentdao.io/metadata/1"
        );
        
        vm.stopPrank();
        
        assertTrue(creditId > 0, "Credit ID should be greater than 0");
        
        CarbonStructs.CarbonCredit memory credit = carbonMarket.getCredit(creditId);
        assertEq(credit.id, creditId, "Credit ID should match");
        assertEq(credit.projectId, "PROJ001", "Project ID should match");
        assertEq(credit.amount, CREDIT_AMOUNT, "Amount should match");
        assertEq(credit.vintage, VINTAGE_YEAR, "Vintage should match");
        assertEq(credit.standard, "VCS", "Standard should match");
        assertEq(credit.issuer, issuer, "Issuer should match");
        assertFalse(credit.isVerified, "Credit should not be verified initially");
        assertFalse(credit.isRetired, "Credit should not be retired initially");
    }
    
    function testIssueCreditFailsWithInvalidStandard() public {
        vm.startPrank(issuer);
        
        vm.expectRevert("Standard not supported");
        carbonMarket.issueCredit(
            "PROJ001",
            CREDIT_AMOUNT,
            VINTAGE_YEAR,
            "INVALID_STANDARD",
            "Forestry",
            "https://api.currentdao.io/metadata/1"
        );
        
        vm.stopPrank();
    }
    
    function testIssueCreditFailsWithZeroAmount() public {
        vm.startPrank(issuer);
        
        vm.expectRevert("Amount must be positive");
        carbonMarket.issueCredit(
            "PROJ001",
            0,
            VINTAGE_YEAR,
            "VCS",
            "Forestry",
            "https://api.currentdao.io/metadata/1"
        );
        
        vm.stopPrank();
    }
    
    // Credit Verification Tests
    
    function testVerifyCredit() public {
        uint256 creditId = _createAndIssueCredit();
        
        vm.startPrank(verifier);
        
        vm.expectEmit(true, true, false, true);
        emit CreditVerified(creditId, verifier, true);
        
        carbonMarket.verifyCredit(creditId, true, "https://api.currentdao.io/reports/1", 95);
        
        vm.stopPrank();
        
        assertTrue(carbonMarket.isVerified(creditId), "Credit should be verified");
        
        CarbonStructs.VerificationReport memory report = carbonMarket.getVerificationReport(creditId);
        assertTrue(report.isValid, "Report should be valid");
        assertEq(report.confidence, 95, "Confidence should be 95");
    }
    
    function testVerifyCreditFailsWithUnauthorizedVerifier() public {
        uint256 creditId = _createAndIssueCredit();
        
        vm.startPrank(trader1);
        
        vm.expectRevert("Not authorized verifier");
        carbonMarket.verifyCredit(creditId, true, "https://api.currentdao.io/reports/1", 95);
        
        vm.stopPrank();
    }
    
    // Trading Tests
    
    function testPlaceBuyOrder() public {
        uint256 creditId = _createAndVerifyCredit();
        
        vm.startPrank(trader1);
        
        vm.expectEmit(true, true, false, true);
        emit OrderPlaced(0, trader1, creditId, CREDIT_AMOUNT, PRICE_PER_TONNE, true);
        
        uint256 orderId = carbonMarket.placeBuyOrder(
            creditId,
            CREDIT_AMOUNT,
            PRICE_PER_TONNE,
            block.timestamp + 86400 // 1 day expiry
        );
        
        vm.stopPrank();
        
        assertTrue(orderId > 0, "Order ID should be greater than 0");
        
        CarbonStructs.Order memory order = carbonMarket.getOrder(orderId);
        assertEq(order.trader, trader1, "Trader should match");
        assertEq(order.creditId, creditId, "Credit ID should match");
        assertEq(order.amount, CREDIT_AMOUNT, "Amount should match");
        assertEq(order.price, PRICE_PER_TONNE, "Price should match");
        assertTrue(order.isBuyOrder, "Should be buy order");
        assertTrue(order.isActive, "Order should be active");
    }
    
    function testPlaceSellOrder() public {
        uint256 creditId = _createAndVerifyCredit();
        
        vm.startPrank(issuer);
        
        vm.expectEmit(true, true, false, true);
        emit OrderPlaced(0, issuer, creditId, CREDIT_AMOUNT, PRICE_PER_TONNE, false);
        
        uint256 orderId = carbonMarket.placeSellOrder(
            creditId,
            CREDIT_AMOUNT,
            PRICE_PER_TONNE,
            block.timestamp + 86400 // 1 day expiry
        );
        
        vm.stopPrank();
        
        CarbonStructs.Order memory order = carbonMarket.getOrder(orderId);
        assertFalse(order.isBuyOrder, "Should be sell order");
    }
    
    function testFillOrder() public {
        uint256 creditId = _createAndVerifyCredit();
        
        // Place buy order
        vm.startPrank(trader1);
        uint256 buyOrderId = carbonMarket.placeBuyOrder(
            creditId,
            CREDIT_AMOUNT,
            PRICE_PER_TONNE,
            block.timestamp + 86400
        );
        vm.stopPrank();
        
        // Place sell order
        vm.startPrank(issuer);
        uint256 sellOrderId = carbonMarket.placeSellOrder(
            creditId,
            CREDIT_AMOUNT,
            PRICE_PER_TONNE,
            block.timestamp + 86400
        );
        vm.stopPrank();
        
        // Fill buy order
        vm.startPrank(issuer);
        vm.expectEmit(true, true, false, true);
        emit OrderFilled(buyOrderId, 0, CREDIT_AMOUNT, PRICE_PER_TONNE);
        
        uint256 tradeId = carbonMarket.fillOrder(buyOrderId, CREDIT_AMOUNT);
        vm.stopPrank();
        
        assertTrue(tradeId > 0, "Trade ID should be greater than 0");
        
        // Verify trade execution
        assertEq(carbonMarket.getAccountBalance(trader1, creditId), CREDIT_AMOUNT, "Trader1 should have credits");
        assertEq(carbonMarket.getAccountBalance(issuer, creditId), 0, "Issuer should have no credits");
        
        CarbonStructs.Trade memory trade = carbonMarket.getTradingHistory(creditId)[0];
        assertEq(trade.buyer, trader1, "Buyer should be trader1");
        assertEq(trade.seller, issuer, "Seller should be issuer");
        assertEq(trade.amount, CREDIT_AMOUNT, "Amount should match");
        assertEq(trade.price, PRICE_PER_TONNE, "Price should match");
    }
    
    function testFillOrderFailsWithInsufficientBalance() public {
        uint256 creditId = _createAndVerifyCredit();
        
        // Place buy order
        vm.startPrank(trader1);
        uint256 buyOrderId = carbonMarket.placeBuyOrder(
            creditId,
            CREDIT_AMOUNT * 2, // More than available
            PRICE_PER_TONNE,
            block.timestamp + 86400
        );
        vm.stopPrank();
        
        // Try to fill with insufficient balance
        vm.startPrank(issuer);
        vm.expectRevert("Insufficient seller balance");
        carbonMarket.fillOrder(buyOrderId, CREDIT_AMOUNT * 2);
        vm.stopPrank();
    }
    
    // Credit Retirement Tests
    
    function testRetireCredit() public {
        uint256 creditId = _createAndVerifyCredit();
        
        // Transfer credits to trader1
        vm.startPrank(issuer);
        uint256 sellOrderId = carbonMarket.placeSellOrder(
            creditId,
            CREDIT_AMOUNT,
            PRICE_PER_TONNE,
            block.timestamp + 86400
        );
        carbonMarket.fillOrder(sellOrderId, CREDIT_AMOUNT);
        vm.stopPrank();
        
        // Retire credits
        vm.startPrank(trader1);
        vm.expectEmit(true, true, false, true);
        emit CreditRetired(creditId, trader1, CREDIT_AMOUNT, "Carbon neutrality");
        
        uint256 certificateId = carbonMarket.retireCredit(
            creditId,
            CREDIT_AMOUNT,
            "Carbon neutrality"
        );
        vm.stopPrank();
        
        assertTrue(certificateId > 0, "Certificate ID should be greater than 0");
        assertEq(carbonMarket.getAccountBalance(trader1, creditId), 0, "Trader should have no credits");
        assertEq(carbonMarket.getRetiredSupply(), CREDIT_AMOUNT, "Retired supply should increase");
    }
    
    function testRetireCreditFailsWithUnverifiedCredit() public {
        uint256 creditId = _createAndIssueCredit(); // Not verified
        
        vm.startPrank(issuer);
        vm.expectRevert("Credit not verified");
        carbonMarket.retireCredit(creditId, CREDIT_AMOUNT, "Carbon neutrality");
        vm.stopPrank();
    }
    
    // Futures Trading Tests
    
    function testCreateFuturesContract() public {
        uint256 creditId = _createAndVerifyCredit();
        uint256 deliveryDate = block.timestamp + 365 days; // 1 year from now
        
        vm.startPrank(trader1);
        
        vm.expectEmit(true, true, false, true);
        emit FuturesContractCreated(0, trader1, address(0), CREDIT_AMOUNT, PRICE_PER_TONNE, deliveryDate);
        
        uint256 contractId = carbonMarket.createFuturesContract(
            creditId,
            CREDIT_AMOUNT,
            PRICE_PER_TONNE,
            deliveryDate,
            true // Long position
        );
        
        vm.stopPrank();
        
        assertTrue(contractId > 0, "Contract ID should be greater than 0");
        
        CarbonStructs.FuturesContract memory contract_ = carbonMarket.getFuturesContract(contractId);
        assertEq(contract_.creditId, creditId, "Credit ID should match");
        assertEq(contract_.buyer, trader1, "Buyer should be trader1");
        assertEq(contract_.amount, CREDIT_AMOUNT, "Amount should match");
        assertEq(contract_.strikePrice, PRICE_PER_TONNE, "Strike price should match");
        assertTrue(contract_.isLong, "Should be long position");
        assertTrue(contract_.isActive, "Contract should be active");
    }
    
    function testSettleFuturesContract() public {
        uint256 creditId = _createAndVerifyCredit();
        uint256 deliveryDate = block.timestamp + 1 days; // 1 day from now
        uint256 strikePrice = PRICE_PER_TONNE;
        
        // Create futures contract
        vm.startPrank(trader1);
        uint256 contractId = carbonMarket.createFuturesContract(
            creditId,
            CREDIT_AMOUNT,
            strikePrice,
            deliveryDate,
            true // Long position
        );
        vm.stopPrank();
        
        // Fast forward to delivery date
        vm.warp(deliveryDate + 1);
        
        // Settle contract (assuming spot price > strike price for profit)
        // This would require mocking the spot price, for now just test settlement logic
        vm.startPrank(trader1);
        carbonMarket.settleFuturesContract(contractId);
        vm.stopPrank();
        
        CarbonStructs.FuturesContract memory contract_ = carbonMarket.getFuturesContract(contractId);
        assertFalse(contract_.isActive, "Contract should be inactive after settlement");
    }
    
    // Impact Tracking Tests
    
    function testUpdateImpactMetrics() public {
        uint256 creditId = _createAndIssueCredit();
        
        vm.startPrank(issuer);
        
        vm.expectEmit(true, false, false, true);
        emit ImpactUpdated(creditId, CREDIT_AMOUNT, block.timestamp);
        
        carbonMarket.updateImpactMetrics(
            creditId,
            CREDIT_AMOUNT, // CO2 equivalent
            2000, // Renewable energy generated (kWh)
            100, // Trees preserved
            50000, // Water saved (liters)
            85 // Biodiversity index
        );
        
        vm.stopPrank();
        
        CarbonStructs.ImpactMetrics memory metrics = carbonMarket.getImpactMetrics(creditId);
        assertEq(metrics.co2Equivalent, CREDIT_AMOUNT, "CO2 equivalent should match");
        assertEq(metrics.renewableEnergyGenerated, 2000, "Renewable energy should match");
        assertEq(metrics.treesPreserved, 100, "Trees preserved should match");
        assertEq(metrics.waterSaved, 50000, "Water saved should match");
        assertEq(metrics.biodiversityIndex, 85, "Biodiversity index should match");
    }
    
    // Gas Optimization Tests
    
    function testBatchExecuteTrades() public {
        uint256 creditId = _createAndVerifyCredit();
        
        // Place multiple orders
        vm.startPrank(trader1);
        uint256[] memory orderIds = new uint256[](3);
        orderIds[0] = carbonMarket.placeBuyOrder(creditId, 100, PRICE_PER_TONNE, block.timestamp + 86400);
        orderIds[1] = carbonMarket.placeBuyOrder(creditId, 200, PRICE_PER_TONNE, block.timestamp + 86400);
        orderIds[2] = carbonMarket.placeBuyOrder(creditId, 300, PRICE_PER_TONNE, block.timestamp + 86400);
        vm.stopPrank();
        
        // Prepare batch amounts
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100;
        amounts[1] = 200;
        amounts[2] = 300;
        
        // Execute batch trades
        vm.startPrank(issuer);
        uint256[] memory tradeIds = carbonMarket.batchExecuteTrades(orderIds, amounts);
        vm.stopPrank();
        
        assertEq(tradeIds.length, 3, "Should execute 3 trades");
        
        // Verify all trades were executed
        for (uint256 i = 0; i < tradeIds.length; i++) {
            assertTrue(tradeIds[i] > 0, "Trade ID should be greater than 0");
        }
    }
    
    function testCreateGasBundle() public {
        uint256 creditId = _createAndVerifyCredit();
        
        address[] memory traders = new address[](2);
        traders[0] = trader1;
        traders[1] = trader2;
        
        uint256[] memory creditIds = new uint256[](2);
        creditIds[0] = creditId;
        creditIds[1] = creditId;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100;
        amounts[1] = 200;
        
        uint256[] memory prices = new uint256[](2);
        prices[0] = PRICE_PER_TONNE;
        prices[1] = PRICE_PER_TONNE;
        
        vm.startPrank(trader1);
        uint256 bundleId = carbonMarket.createGasBundle(
            traders,
            creditIds,
            amounts,
            prices,
            block.timestamp + 86400
        );
        vm.stopPrank();
        
        assertTrue(bundleId > 0, "Bundle ID should be greater than 0");
    }
    
    // Marketplace Statistics Tests
    
    function testMarketplaceStats() public {
        CarbonStructs.MarketplaceStats memory stats = carbonMarket.getMarketplaceStats();
        assertEq(stats.totalCredits, 0, "Initial total credits should be 0");
        assertEq(stats.totalTrades, 0, "Initial total trades should be 0");
        assertEq(stats.activeOrders, 0, "Initial active orders should be 0");
        
        // Issue credit
        uint256 creditId = _createAndIssueCredit();
        
        stats = carbonMarket.getMarketplaceStats();
        assertEq(stats.totalCredits, CREDIT_AMOUNT, "Total credits should increase");
        
        // Place order
        vm.startPrank(trader1);
        carbonMarket.placeBuyOrder(creditId, CREDIT_AMOUNT, PRICE_PER_TONNE, block.timestamp + 86400);
        vm.stopPrank();
        
        stats = carbonMarket.getMarketplaceStats();
        assertEq(stats.activeOrders, 1, "Active orders should increase");
        
        // Execute trade
        vm.startPrank(issuer);
        uint256 sellOrderId = carbonMarket.placeSellOrder(creditId, CREDIT_AMOUNT, PRICE_PER_TONNE, block.timestamp + 86400);
        carbonMarket.fillOrder(sellOrderId, CREDIT_AMOUNT);
        vm.stopPrank();
        
        stats = carbonMarket.getMarketplaceStats();
        assertEq(stats.totalTrades, 1, "Total trades should increase");
        assertEq(stats.totalVolume, CREDIT_AMOUNT * PRICE_PER_TONNE, "Total volume should match");
    }
    
    // Standards Compliance Tests
    
    function testStandardCompliance() public {
        uint256 creditId = _createAndVerifyCredit();
        
        CarbonStructs.StandardCompliance memory compliance = carbonMarket.checkStandardCompliance(creditId, "VCS");
        assertTrue(compliance.isCompliant, "Should be compliant with VCS");
        assertEq(compliance.standardName, "VCS", "Standard name should match");
        
        // Test non-compliant standard
        compliance = carbonMarket.checkStandardCompliance(creditId, "Gold Standard");
        assertFalse(compliance.isCompliant, "Should not be compliant with Gold Standard");
    }
    
    // Admin Functions Tests
    
    function testAddVerifier() public {
        address newVerifier = makeAddr("newVerifier");
        
        vm.startPrank(owner);
        carbonMarket.addVerifier(newVerifier);
        vm.stopPrank();
        
        assertTrue(carbonMarket.isVerifier(newVerifier), "New verifier should be authorized");
    }
    
    function testSetTradingFee() public {
        vm.startPrank(owner);
        carbonMarket.setTradingFee(100); // 1%
        vm.stopPrank();
        
        // Fee should be updated (would need to test in actual trade execution)
    }
    
    function testPauseUnpause() public {
        vm.startPrank(owner);
        carbonMarket.pause();
        vm.stopPrank();
        
        // Should fail to place order when paused
        uint256 creditId = _createAndVerifyCredit();
        vm.startPrank(trader1);
        vm.expectRevert("Pausable: paused");
        carbonMarket.placeBuyOrder(creditId, CREDIT_AMOUNT, PRICE_PER_TONNE, block.timestamp + 86400);
        vm.stopPrank();
        
        // Unpause and test again
        vm.startPrank(owner);
        carbonMarket.unpause();
        vm.stopPrank();
        
        vm.startPrank(trader1);
        carbonMarket.placeBuyOrder(creditId, CREDIT_AMOUNT, PRICE_PER_TONNE, block.timestamp + 86400);
        vm.stopPrank();
    }
    
    // Helper Functions
    
    function _createAndIssueCredit() internal returns (uint256) {
        vm.startPrank(issuer);
        uint256 creditId = carbonMarket.issueCredit(
            "PROJ001",
            CREDIT_AMOUNT,
            VINTAGE_YEAR,
            "VCS",
            "Forestry",
            "https://api.currentdao.io/metadata/1"
        );
        vm.stopPrank();
        return creditId;
    }
    
    function _createAndVerifyCredit() internal returns (uint256) {
        uint256 creditId = _createAndIssueCredit();
        
        vm.startPrank(verifier);
        carbonMarket.verifyCredit(creditId, true, "https://api.currentdao.io/reports/1", 95);
        vm.stopPrank();
        
        return creditId;
    }
    
    // Gas Optimization Tests
    
    function testGasOptimization() public {
        uint256 creditId = _createAndVerifyCredit();
        
        // Test gas usage for individual operations
        vm.startPrank(trader1);
        uint256 gasStart = gasleft();
        carbonMarket.placeBuyOrder(creditId, CREDIT_AMOUNT, PRICE_PER_TONNE, block.timestamp + 86400);
        uint256 gasUsedIndividual = gasStart - gasleft();
        vm.stopPrank();
        
        // Test gas usage for batch operations
        uint256[] memory orderIds = new uint256[](5);
        uint256[] memory amounts = new uint256[](5);
        
        vm.startPrank(trader1);
        gasStart = gasleft();
        for (uint256 i = 0; i < 5; i++) {
            orderIds[i] = carbonMarket.placeBuyOrder(creditId, 100, PRICE_PER_TONNE, block.timestamp + 86400);
            amounts[i] = 100;
        }
        uint256 gasUsedMultipleIndividual = gasStart - gasleft();
        vm.stopPrank();
        
        // Test batch execution
        vm.startPrank(issuer);
        gasStart = gasleft();
        carbonMarket.batchExecuteTrades(orderIds, amounts);
        uint256 gasUsedBatch = gasStart - gasleft();
        vm.stopPrank();
        
        // Batch should be more gas efficient
        assertTrue(gasUsedBatch < gasUsedMultipleIndividual * 8 / 10, "Batch should save at least 20% gas");
    }
    
    // Edge Cases and Error Handling Tests
    
    function testEdgeCases() public {
        // Test with maximum values
        uint256 maxAmount = type(uint256).max;
        uint256 maxPrice = type(uint256).max;
        
        vm.startPrank(issuer);
        vm.expectRevert(); // Should fail with overflow or other constraint
        carbonMarket.issueCredit(
            "MAX_PROJ",
            maxAmount,
            VINTAGE_YEAR,
            "VCS",
            "Forestry",
            "https://api.currentdao.io/metadata/max"
        );
        vm.stopPrank();
    }
    
    // Integration Tests
    
    function testFullTradingFlow() public {
        // Complete trading workflow
        uint256 creditId = _createAndVerifyCredit();
        
        // Multiple traders place orders
        vm.startPrank(trader1);
        uint256 buyOrder1 = carbonMarket.placeBuyOrder(creditId, 300, PRICE_PER_TONNE, block.timestamp + 86400);
        vm.stopPrank();
        
        vm.startPrank(trader2);
        uint256 buyOrder2 = carbonMarket.placeBuyOrder(creditId, 400, PRICE_PER_TONNE + 10 ether, block.timestamp + 86400);
        vm.stopPrank();
        
        // Issuer sells credits
        vm.startPrank(issuer);
        uint256 sellOrder = carbonMarket.placeSellOrder(creditId, 700, PRICE_PER_TONNE, block.timestamp + 86400);
        
        // Fill orders
        carbonMarket.fillOrder(buyOrder1, 300);
        carbonMarket.fillOrder(buyOrder2, 400);
        vm.stopPrank();
        
        // Verify final state
        assertEq(carbonMarket.getAccountBalance(trader1, creditId), 300, "Trader1 should have 300 credits");
        assertEq(carbonMarket.getAccountBalance(trader2, creditId), 400, "Trader2 should have 400 credits");
        assertEq(carbonMarket.getAccountBalance(issuer, creditId), 300, "Issuer should have 300 credits remaining");
        
        // Retirement
        vm.startPrank(trader1);
        carbonMarket.retireCredit(creditId, 100, "Company carbon neutral goal");
        vm.stopPrank();
        
        assertEq(carbonMarket.getAccountBalance(trader1, creditId), 200, "Trader1 should have 200 credits remaining");
        assertEq(carbonMarket.getRetiredSupply(), 100, "Retired supply should be 100");
    }
}
