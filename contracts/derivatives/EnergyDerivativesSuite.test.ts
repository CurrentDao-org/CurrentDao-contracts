// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../EnergyDerivativesSuite.sol";
import "../structures/DerivativesStructs.sol";
import "../libraries/DerivativesLib.sol";

/**
 * @title EnergyDerivativesSuiteTest
 * @notice Comprehensive test suite for EnergyDerivativesSuite contract
 * @dev Tests all major functionality including swaps, forwards, weather derivatives, CDS, and structured products
 */
contract EnergyDerivativesSuiteTest is Test {
    
    EnergyDerivativesSuite public derivativesSuite;
    address public administrator;
    address public user1;
    address public user2;
    address public user3;
    
    // Test token for collateral
    MockERC20 public collateralToken;
    
    // Events for testing
    event EnergySwapCreated(uint256 indexed swapId, address indexed creator, DerivativesStructs.EnergyCommodity commodity);
    event EnergyForwardCreated(uint256 indexed forwardId, address indexed buyer, address indexed seller);
    event WeatherDerivativeCreated(uint256 indexed derivativeId, DerivativesStructs.WeatherType weatherType);
    event CreditDefaultSwapCreated(uint256 indexed cdsId, address indexed protectionBuyer, address indexed protectionSeller);
    event StructuredProductCreated(uint256 indexed productId, string productName, address indexed holder);
    event PortfolioCreated(uint256 indexed portfolioId, address indexed owner, string name);
    event PositionOpened(uint256 indexed positionId, address indexed owner, DerivativesStructs.DerivativeType derivativeType);
    event PositionClosed(uint256 indexed positionId, uint256 realizedPnL);
    event RiskMetricsCalculated(uint256 indexed portfolioId, uint256 valueAtRisk, uint256 expectedShortfall);
    event CollateralPosted(uint256 indexed collateralId, address indexed provider, uint256 amount);
    event SettlementExecuted(uint256 indexed instructionId, uint256 amount);
    event InsurancePolicyCreated(uint256 indexed policyId, address indexed insured, address indexed insurer);
    event WeatherDataSubmitted(string location, DerivativesStructs.WeatherType weatherType, uint256 value);
    
    function setUp() public {
        // Setup test accounts
        administrator = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);
        
        // Deploy mock ERC20 token for collateral
        collateralToken = new MockERC20("Collateral Token", "COLL", 18);
        
        // Fund users with tokens
        collateralToken.mint(user1, 1000000 * 10**18);
        collateralToken.mint(user2, 1000000 * 10**18);
        collateralToken.mint(user3, 1000000 * 10**18);
        
        // Deploy derivatives suite
        derivativesSuite = new EnergyDerivativesSuite(administrator);
        
        // Add supported token
        derivativesSuite.addSupportedToken(address(collateralToken));
        
        // Setup counterparty information
        derivativesSuite.updateCounterpartyInfo(user1, 1000000 * 10**18, 750); // High credit rating
        derivativesSuite.updateCounterpartyInfo(user2, 500000 * 10**18, 650);  // Medium credit rating
        derivativesSuite.updateCounterpartyInfo(user3, 250000 * 10**18, 550);  // Lower credit rating
    }
    
    // Energy Swaps Tests
    function testCreateEnergySwap() public {
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI,
            1000000 * 10**18, // $1M notional
            5000, // 5% fixed rate
            4500, // 4.5% floating rate
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        assertTrue(swapId > 0, "Swap ID should be greater than 0");
        
        // Verify swap details
        DerivativesStructs.EnergySwap memory swap = derivativesSuite.getEnergySwap(swapId);
        assertEq(swap.initiator, user1);
        assertEq(swap.counterparty, user2);
        assertEq(uint256(swap.commodity), uint256(DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI));
        assertEq(swap.notionalAmount, 1000000 * 10**18);
        assertTrue(swap.isActive);
        
        // Verify system metrics
        assertEq(derivativesSuite.getTotalActiveContracts(), 1);
        assertEq(derivativesSuite.getTotalNotionalExposure(), 1000000 * 10**18);
    }
    
    function testCreateEnergySwapInvalidCounterparty() public {
        vm.prank(user1);
        vm.expectRevert("Invalid counterparty");
        derivativesSuite.createEnergySwap(
            address(0),
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI,
            1000000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
    }
    
    function testCreateEnergySwapCreditLimitExceeded() public {
        // Create a swap that exceeds credit limit
        vm.prank(user3);
        vm.expectRevert("Credit limit exceeded");
        derivativesSuite.createEnergySwap(
            user1,
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI,
            500000 * 10**18, // Exceeds user3's credit limit
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
    }
    
    function testExecuteEnergySwap() public {
        // Create a swap first
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.NATURAL_GAS,
            1000000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 60 days, // Shorter maturity for testing
            DerivativesStructs.SettlementType.CASH
        );
        
        // Fast forward to maturity
        vm.warp(block.timestamp + 61 days);
        
        // Execute swap
        vm.prank(user1);
        bool success = derivativesSuite.executeEnergySwap(swapId);
        assertTrue(success);
        
        // Verify swap is no longer active
        DerivativesStructs.EnergySwap memory swap = derivativesSuite.getEnergySwap(swapId);
        assertTrue(!swap.isActive);
        
        // Verify system metrics updated
        assertEq(derivativesSuite.getTotalActiveContracts(), 0);
    }
    
    function testTerminateEnergySwap() public {
        // Create a swap first
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.ELECTRICITY,
            500000 * 10**18,
            6000,
            5500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Terminate swap
        vm.prank(user1);
        bool success = derivativesSuite.terminateEnergySwap(swapId);
        assertTrue(success);
        
        // Verify swap is no longer active
        DerivativesStructs.EnergySwap memory swap = derivativesSuite.getEnergySwap(swapId);
        assertTrue(!swap.isActive);
    }
    
    function testGetActiveSwapsByCommodity() public {
        // Create swaps for different commodities
        vm.prank(user1);
        uint256 swapId1 = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI,
            100000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        uint256 swapId2 = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_BRENT,
            200000 * 10**18,
            5200,
            4700,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        uint256 swapId3 = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.NATURAL_GAS,
            150000 * 10**18,
            4800,
            4300,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Get crude oil swaps
        uint256[] memory crudeSwaps = derivativesSuite.getActiveSwapsByCommodity(
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI
        );
        assertEq(crudeSwaps.length, 1);
        assertEq(crudeSwaps[0], swapId1);
        
        // Get natural gas swaps
        uint256[] memory gasSwaps = derivativesSuite.getActiveSwapsByCommodity(
            DerivativesStructs.EnergyCommodity.NATURAL_GAS
        );
        assertEq(gasSwaps.length, 1);
        assertEq(gasSwaps[0], swapId3);
    }
    
    // Energy Forwards Tests
    function testCreateEnergyForward() public {
        vm.prank(user1);
        uint256 forwardId = derivativesSuite.createEnergyForward(
            user1,
            user2,
            DerivativesStructs.EnergyCommodity.GASOLINE,
            10000 * 10**18, // 10,000 barrels
            75 * 10**18,    // $75 per barrel
            block.timestamp + 90 days,
            1, // Delivery location code
            DerivativesStructs.SettlementType.PHYSICAL
        );
        
        assertTrue(forwardId > 0);
        
        // Verify forward details
        DerivativesStructs.EnergyForward memory forward = derivativesSuite.getEnergyForward(forwardId);
        assertEq(forward.buyer, user1);
        assertEq(forward.seller, user2);
        assertEq(uint256(forward.commodity), uint256(DerivativesStructs.EnergyCommodity.GASOLINE));
        assertEq(forward.quantity, 10000 * 10**18);
        assertEq(forward.strikePrice, 75 * 10**18);
        assertTrue(!forward.isConfirmed);
    }
    
    function testConfirmEnergyForward() public {
        // Create forward first
        vm.prank(user1);
        uint256 forwardId = derivativesSuite.createEnergyForward(
            user1,
            user2,
            DerivativesStructs.EnergyCommodity.DIESEL,
            5000 * 10**18,
            80 * 10**18,
            block.timestamp + 90 days,
            2,
            DerivativesStructs.SettlementType.PHYSICAL
        );
        
        // Confirm forward
        vm.prank(user1);
        bool success = derivativesSuite.confirmEnergyForward(forwardId);
        assertTrue(success);
        
        // Verify confirmation
        DerivativesStructs.EnergyForward memory forward = derivativesSuite.getEnergyForward(forwardId);
        assertTrue(forward.isConfirmed);
    }
    
    function testExecuteEnergyForward() public {
        // Create and confirm forward
        vm.prank(user1);
        uint256 forwardId = derivativesSuite.createEnergyForward(
            user1,
            user2,
            DerivativesStructs.EnergyCommodity.HEATING_OIL,
            3000 * 10**18,
            70 * 10**18,
            block.timestamp + 30 days,
            3,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        derivativesSuite.confirmEnergyForward(forwardId);
        
        // Fast forward to delivery date
        vm.warp(block.timestamp + 31 days);
        
        // Execute forward
        vm.prank(user1);
        bool success = derivativesSuite.executeEnergyForward(forwardId);
        assertTrue(success);
    }
    
    // Weather Derivatives Tests
    function testCreateWeatherDerivative() public {
        vm.prank(user1);
        uint256 derivativeId = derivativesSuite.createWeatherDerivative(
            user1,
            user2,
            DerivativesStructs.WeatherType.TEMPERATURE,
            "NYC",
            block.timestamp + 30 days,
            block.timestamp + 120 days,
            2500, // Strike temperature (25°C)
            1000 * 10**18, // $1000 per degree
            50000 * 10**18 // $50K notional
        );
        
        assertTrue(derivativeId > 0);
        
        // Verify derivative details
        DerivativesStructs.WeatherDerivative memory derivative = derivativesSuite.getWeatherDerivative(derivativeId);
        assertEq(derivative.buyer, user1);
        assertEq(derivative.seller, user2);
        assertEq(uint256(derivative.weatherType), uint256(DerivativesStructs.WeatherType.TEMPERATURE));
        assertEq(derivative.location, "NYC");
        assertEq(derivative.strikeLevel, 2500);
        assertTrue(derivative.isActive);
    }
    
    function testSettleWeatherDerivative() public {
        // Create weather derivative
        vm.prank(user1);
        uint256 derivativeId = derivativesSuite.createWeatherDerivative(
            user1,
            user2,
            DerivativesStructs.WeatherType.TEMPERATURE,
            "LAX",
            block.timestamp + 30 days,
            block.timestamp + 90 days,
            2000, // 20°C strike
            1000 * 10**18,
            100000 * 10**18
        );
        
        // Fast forward to end date
        vm.warp(block.timestamp + 91 days);
        
        // Submit weather data (actual temperature 25°C = 2500)
        derivativesSuite.submitWeatherData(
            DerivativesStructs.WeatherType.TEMPERATURE,
            "LAX",
            2500, // 25°C
            block.timestamp - 1
        );
        
        // Settle derivative (payout should be (25-20) * $1000 = $5000)
        vm.prank(user1);
        uint256 payout = derivativesSuite.settleWeatherDerivative(derivativeId, 2500);
        assertEq(payout, 5000 * 10**18);
        
        // Verify derivative is no longer active
        DerivativesStructs.WeatherDerivative memory derivative = derivativesSuite.getWeatherDerivative(derivativeId);
        assertTrue(!derivative.isActive);
    }
    
    function testGetWeatherData() public {
        // Submit weather data points
        derivativesSuite.submitWeatherData(
            DerivativesStructs.WeatherType.PRECIPITATION,
            "CHI",
            1000, // 10mm
            block.timestamp - 86400
        );
        
        derivativesSuite.submitWeatherData(
            DerivativesStructs.WeatherType.PRECIPITATION,
            "CHI",
            1500, // 15mm
            block.timestamp
        );
        
        // Get weather data
        DerivativesStructs.WeatherDataPoint[] memory dataPoints = derivativesSuite.getWeatherData(
            DerivativesStructs.WeatherType.PRECIPITATION,
            "CHI",
            block.timestamp - 2 days,
            block.timestamp + 1 days
        );
        
        assertEq(dataPoints.length, 2);
        assertEq(dataPoints[0].value, 1000);
        assertEq(dataPoints[1].value, 1500);
    }
    
    // Credit Default Swaps Tests
    function testCreateCreditDefaultSwap() public {
        vm.prank(user1);
        uint256 cdsId = derivativesSuite.createCreditDefaultSwap(
            user1,
            user2,
            user3, // Reference entity
            2000000 * 10**18, // $2M notional
            500, // 5% spread
            block.timestamp + 365 days,
            4000 // 40% recovery rate
        );
        
        assertTrue(cdsId > 0);
        
        // Verify CDS details
        DerivativesStructs.CreditDefaultSwap memory cds = derivativesSuite.getCreditDefaultSwap(cdsId);
        assertEq(cds.protectionBuyer, user1);
        assertEq(cds.protectionSeller, user2);
        assertEq(cds.referenceEntity, user3);
        assertEq(cds.notionalAmount, 2000000 * 10**18);
        assertEq(cds.spread, 500);
        assertTrue(cds.isActive);
    }
    
    function testTriggerCreditEvent() public {
        // Create CDS
        vm.prank(user1);
        uint256 cdsId = derivativesSuite.createCreditDefaultSwap(
            user1,
            user2,
            user3,
            1000000 * 10**18,
            500,
            block.timestamp + 365 days,
            4000
        );
        
        // Trigger credit event (only admin can do this)
        vm.prank(administrator);
        bool success = derivativesSuite.triggerCreditEvent(cdsId);
        assertTrue(success);
        
        // Verify CDS is no longer active
        DerivativesStructs.CreditDefaultSwap memory cds = derivativesSuite.getCreditDefaultSwap(cdsId);
        assertTrue(!cds.isActive);
    }
    
    function testSettleCreditDefaultSwap() public {
        // Create and trigger CDS
        vm.prank(user1);
        uint256 cdsId = derivativesSuite.createCreditDefaultSwap(
            user1,
            user2,
            user3,
            1500000 * 10**18,
            600,
            block.timestamp + 365 days,
            3000 // 30% recovery rate
        );
        
        vm.prank(administrator);
        derivativesSuite.triggerCreditEvent(cdsId);
        
        // Settle CDS (payout should be $1.5M * (1 - 0.3) = $1.05M)
        vm.prank(user1);
        uint256 settlementAmount = derivativesSuite.settleCreditDefaultSwap(cdsId);
        assertEq(settlementAmount, 1050000 * 10**18);
    }
    
    // Structured Products Tests
    function testCreateStructuredProduct() public {
        DerivativesStructs.DerivativeType[] memory underlyingTypes = new DerivativesStructs.DerivativeType[](2);
        underlyingTypes[0] = DerivativesStructs.DerivativeType.SWAP;
        underlyingTypes[1] = DerivativesStructs.DerivativeType.FORWARD;
        
        uint256[] memory weights = new uint256[](2);
        weights[0] = 6000; // 60%
        weights[1] = 4000; // 40%
        
        vm.prank(user1);
        uint256 productId = derivativesSuite.createStructuredProduct(
            user1,
            "Energy Basket Product",
            underlyingTypes,
            weights,
            500000 * 10**18,
            block.timestamp + 365 days,
            true, // Callable
            525000 * 10**18 // Call price
        );
        
        assertTrue(productId > 0);
        
        // Verify product details
        DerivativesStructs.StructuredProduct memory product = derivativesSuite.getStructuredProduct(productId);
        assertEq(product.issuer, user1);
        assertEq(product.holder, user1);
        assertEq(product.productName, "Energy Basket Product");
        assertEq(product.notionalAmount, 500000 * 10**18);
        assertTrue(product.isCallable);
        assertEq(product.callPrice, 525000 * 10**18);
    }
    
    function testCalculateStructuredProductValue() public {
        // Create structured product
        DerivativesStructs.DerivativeType[] memory underlyingTypes = new DerivativesStructs.DerivativeType[](1);
        underlyingTypes[0] = DerivativesStructs.DerivativeType.SWAP;
        
        uint256[] memory weights = new uint256[](1);
        weights[0] = 10000; // 100%
        
        vm.prank(user1);
        uint256 productId = derivativesSuite.createStructuredProduct(
            user1,
            "Single Asset Product",
            underlyingTypes,
            weights,
            100000 * 10**18,
            block.timestamp + 365 days,
            false,
            0
        );
        
        // Calculate value (should equal notional since underlying value is placeholder)
        uint256 value = derivativesSuite.calculateStructuredProductValue(productId);
        assertEq(value, 100000 * 10**18);
    }
    
    function testCallStructuredProduct() public {
        // Create callable structured product
        DerivativesStructs.DerivativeType[] memory underlyingTypes = new DerivativesStructs.DerivativeType[](1);
        underlyingTypes[0] = DerivativesStructs.DerivativeType.OPTION;
        
        uint256[] memory weights = new uint256[](1);
        weights[0] = 10000;
        
        vm.prank(user1);
        uint256 productId = derivativesSuite.createStructuredProduct(
            user1,
            "Callable Product",
            underlyingTypes,
            weights,
            200000 * 10**18,
            block.timestamp + 365 days,
            true,
            210000 * 10**18
        );
        
        // Wait for call period
        vm.warp(block.timestamp + 31 days);
        
        // Call product
        vm.prank(user1);
        bool success = derivativesSuite.callStructuredProduct(productId);
        assertTrue(success);
        
        // Verify product is no longer active
        DerivativesStructs.StructuredProduct memory product = derivativesSuite.getStructuredProduct(productId);
        assertTrue(!product.isActive);
    }
    
    // Portfolio Management Tests
    function testCreatePortfolio() public {
        vm.prank(user1);
        uint256 portfolioId = derivativesSuite.createPortfolio(
            user1,
            "Energy Portfolio"
        );
        
        assertTrue(portfolioId > 0);
        
        // Verify portfolio details
        DerivativesStructs.Portfolio memory portfolio = derivativesSuite.getPortfolio(portfolioId);
        assertEq(portfolio.owner, user1);
        assertEq(portfolio.name, "Energy Portfolio");
        assertEq(portfolio.totalValue, 0);
        assertEq(portfolio.totalNotional, 0);
    }
    
    function testAddToPortfolio() public {
        // Create portfolio
        vm.prank(user1);
        uint256 portfolioId = derivativesSuite.createPortfolio(user1, "Test Portfolio");
        
        // Create a swap to add
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.URANIUM,
            100000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Add swap to portfolio
        vm.prank(user1);
        bool success = derivativesSuite.addToPortfolio(
            portfolioId,
            DerivativesStructs.DerivativeType.SWAP,
            swapId
        );
        assertTrue(success);
        
        // Verify swap is in portfolio
        DerivativesStructs.Portfolio memory portfolio = derivativesSuite.getPortfolio(portfolioId);
        assertEq(portfolio.swapIds.length, 1);
        assertEq(portfolio.swapIds[0], swapId);
    }
    
    function testRemoveFromPortfolio() public {
        // Create portfolio and add derivative
        vm.prank(user1);
        uint256 portfolioId = derivativesSuite.createPortfolio(user1, "Test Portfolio");
        
        vm.prank(user1);
        uint256 forwardId = derivativesSuite.createEnergyForward(
            user1,
            user2,
            DerivativesStructs.EnergyCommodity.COAL,
            50000 * 10**18,
            50 * 10**18,
            block.timestamp + 90 days,
            4,
            DerivativesStructs.SettlementType.PHYSICAL
        );
        
        vm.prank(user1);
        derivativesSuite.addToPortfolio(
            portfolioId,
            DerivativesStructs.DerivativeType.FORWARD,
            forwardId
        );
        
        // Remove forward from portfolio
        vm.prank(user1);
        bool success = derivativesSuite.removeFromPortfolio(
            portfolioId,
            DerivativesStructs.DerivativeType.FORWARD,
            forwardId
        );
        assertTrue(success);
        
        // Verify forward is removed
        DerivativesStructs.Portfolio memory portfolio = derivativesSuite.getPortfolio(portfolioId);
        assertEq(portfolio.forwardIds.length, 0);
    }
    
    function testOptimizePortfolio() public {
        // Create portfolio with multiple derivatives
        vm.prank(user1);
        uint256 portfolioId = derivativesSuite.createPortfolio(user1, "Complex Portfolio");
        
        // Add multiple derivatives
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.LNG,
            100000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        derivativesSuite.addToPortfolio(
            portfolioId,
            DerivativesStructs.DerivativeType.SWAP,
            swapId
        );
        
        // Optimize portfolio
        vm.prank(user1);
        (bool success, DerivativesStructs.RiskMetrics memory optimizedRisk) = derivativesSuite.optimizePortfolio(portfolioId);
        assertTrue(success);
        assertTrue(optimizedRisk.valueAtRisk > 0);
    }
    
    // Risk Analytics Tests
    function testCalculateRiskMetrics() public {
        // Create portfolio with derivatives
        vm.prank(user1);
        uint256 portfolioId = derivativesSuite.createPortfolio(user1, "Risk Portfolio");
        
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.RENEWABLE_ENERGY_CREDITS,
            200000 * 10**18,
            6000,
            5500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        derivativesSuite.addToPortfolio(
            portfolioId,
            DerivativesStructs.DerivativeType.SWAP,
            swapId
        );
        
        // Calculate risk metrics
        DerivativesStructs.RiskMetrics memory riskMetrics = derivativesSuite.calculateRiskMetrics(portfolioId);
        assertTrue(riskMetrics.valueAtRisk > 0);
        assertTrue(riskMetrics.expectedShortfall > 0);
        assertTrue(riskMetrics.volatility > 0);
    }
    
    function testCalculateValueAtRisk() public {
        // Create portfolio
        vm.prank(user1);
        uint256 portfolioId = derivativesSuite.createPortfolio(user1, "VaR Portfolio");
        
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.CARBON_CREDITS,
            300000 * 10**18,
            7000,
            6500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        derivativesSuite.addToPortfolio(
            portfolioId,
            DerivativesStructs.DerivativeType.SWAP,
            swapId
        );
        
        // Calculate VaR at 95% confidence for 30 days
        uint256 varAmount = derivativesSuite.calculateValueAtRisk(portfolioId, 95, 30 days);
        assertTrue(varAmount > 0);
    }
    
    function testCalculateExpectedShortfall() public {
        // Create portfolio
        vm.prank(user1);
        uint256 portfolioId = derivativesSuite.createPortfolio(user1, "ES Portfolio");
        
        vm.prank(user1);
        uint256 forwardId = derivativesSuite.createEnergyForward(
            user1,
            user2,
            DerivativesStructs.EnergyCommodity.HYDROGEN,
            10000 * 10**18,
            5000 * 10**18,
            block.timestamp + 90 days,
            5,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        derivativesSuite.addToPortfolio(
            portfolioId,
            DerivativesStructs.DerivativeType.FORWARD,
            forwardId
        );
        
        // Calculate expected shortfall at 99% confidence
        uint256 expectedShortfall = derivativesSuite.calculateExpectedShortfall(portfolioId, 99);
        assertTrue(expectedShortfall > 0);
    }
    
    function testGetGreeks() public {
        // Create a derivative
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.AMMONIA,
            150000 * 10**18,
            5500,
            5000,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Get Greeks
        (uint256 delta, uint256 gamma, uint256 vega, uint256 theta, uint256 rho) = derivativesSuite.getGreeks(swapId);
        assertTrue(delta > 0);
        assertTrue(gamma > 0);
        assertTrue(vega > 0);
        assertTrue(theta < 100000); // Theta should be negative (time decay)
        assertTrue(rho > 0);
    }
    
    // Clearing and Settlement Tests
    function testSubmitCollateral() public {
        // Approve tokens
        vm.prank(user1);
        collateralToken.approve(address(derivativesSuite), 100000 * 10**18);
        
        // Submit collateral
        vm.prank(user1);
        uint256 collateralId = derivativesSuite.submitCollateral(
            user2,
            100000 * 10**18,
            address(collateralToken),
            30 days
        );
        
        assertTrue(collateralId > 0);
        
        // Verify collateral details
        DerivativesStructs.Collateral memory collateral = derivativesSuite.getCollateral(collateralId);
        assertEq(collateral.provider, user1);
        assertEq(collateral.beneficiary, user2);
        assertEq(collateral.amount, 100000 * 10**18);
        assertEq(collateral.tokenAddress, address(collateralToken));
        assertTrue(collateral.isLocked);
    }
    
    function testReleaseCollateral() public {
        // Submit collateral first
        vm.prank(user1);
        collateralToken.approve(address(derivativesSuite), 50000 * 10**18);
        
        vm.prank(user1);
        uint256 collateralId = derivativesSuite.submitCollateral(
            user2,
            50000 * 10**18,
            address(collateralToken),
            1 days // Short lock period
        );
        
        // Wait for lock period to expire
        vm.warp(block.timestamp + 2 days);
        
        // Release collateral
        vm.prank(user1);
        bool success = derivativesSuite.releaseCollateral(collateralId);
        assertTrue(success);
        
        // Verify collateral is unlocked
        DerivativesStructs.Collateral memory collateral = derivativesSuite.getCollateral(collateralId);
        assertTrue(!collateral.isLocked);
    }
    
    function testCreateSettlementInstruction() public {
        uint256 instructionId = derivativesSuite.createSettlementInstruction(
            user1,
            user2,
            75000 * 10**18,
            address(collateralToken),
            block.timestamp + 24 hours,
            DerivativesStructs.SettlementType.CASH
        );
        
        assertTrue(instructionId > 0);
        
        // Verify instruction details
        DerivativesStructs.SettlementInstruction memory instruction = derivativesSuite.getSettlementInstruction(instructionId);
        assertEq(instruction.payer, user1);
        assertEq(instruction.payee, user2);
        assertEq(instruction.amount, 75000 * 10**18);
        assertEq(instruction.tokenAddress, address(collateralToken));
        assertTrue(!instruction.isExecuted);
    }
    
    function testExecuteSettlement() public {
        // Create settlement instruction
        uint256 instructionId = derivativesSuite.createSettlementInstruction(
            user1,
            user2,
            25000 * 10**18,
            address(0), // Native token
            block.timestamp + 1 hours,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Fund contract with native tokens for settlement
        vm.deal(address(derivativesSuite), 100000 * 10**18);
        
        // Fast forward to due date
        vm.warp(block.timestamp + 2 hours);
        
        // Execute settlement
        bool success = derivativesSuite.executeSettlement(instructionId);
        assertTrue(success);
        
        // Verify instruction is executed
        DerivativesStructs.SettlementInstruction memory instruction = derivativesSuite.getSettlementInstruction(instructionId);
        assertTrue(instruction.isExecuted);
        assertTrue(instruction.executedAt > 0);
    }
    
    // Market Data Tests
    function testUpdateMarketData() public {
        bool success = derivativesSuite.updateMarketData(
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI,
            7500 * 10**18, // $75 per barrel
            7800 * 10**18, // Forward curve
            2500 // 25% volatility
        );
        assertTrue(success);
        
        // Verify market data
        DerivativesStructs.MarketData memory data = derivativesSuite.getMarketData(
            DerivativesStructs.EnergyCommodity.CRUDE_OIL_WTI
        );
        assertEq(data.spotPrice, 7500 * 10**18);
        assertEq(data.forwardCurve, 7800 * 10**18);
        assertEq(data.volatility, 2500);
        assertTrue(data.isActive);
    }
    
    function testGetForwardCurve() public {
        // Update market data first
        derivativesSuite.updateMarketData(
            DerivativesStructs.EnergyCommodity.NATURAL_GAS,
            300 * 10**18,
            320 * 10**18,
            3500
        );
        
        // Get forward curve
        uint256[] memory curve = derivativesSuite.getForwardCurve(
            DerivativesStructs.EnergyCommodity.NATURAL_GAS
        );
        assertEq(curve.length, 12); // 12 months
        assertEq(curve[0], 320 * 10**18);
    }
    
    // Counterparty Management Tests
    function testUpdateCounterpartyInfo() public {
        bool success = derivativesSuite.updateCounterpartyInfo(
            user3,
            750000 * 10**18,
            700 // Improved credit rating
        );
        assertTrue(success);
        
        // Verify updated info
        DerivativesStructs.CounterpartyInfo memory info = derivativesSuite.getCounterpartyInfo(user3);
        assertEq(info.creditLimit, 750000 * 10**18);
        assertEq(info.creditRating, 700);
    }
    
    function testCheckCreditExposure() public {
        // Create a swap to generate exposure
        vm.prank(user1);
        derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.PROPANE,
            200000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Check credit exposure
        (uint256 exposure, bool isWithinLimit) = derivativesSuite.checkCreditExposure(user1);
        assertTrue(exposure > 0);
        assertTrue(isWithinLimit); // Should be within user1's high credit limit
    }
    
    // Insurance Integration Tests
    function testCreateInsurancePolicy() public {
        vm.prank(user1);
        uint256 policyId = derivativesSuite.createInsurancePolicy(
            user1,
            user2,
            100000 * 10**18, // Coverage amount
            5000 * 10**18,  // Premium
            block.timestamp + 30 days,
            block.timestamp + 395 days,
            "Weather Risk"
        );
        
        assertTrue(policyId > 0);
        
        // Verify policy details
        DerivativesStructs.InsurancePolicy memory policy = derivativesSuite.getInsurancePolicy(policyId);
        assertEq(policy.insured, user1);
        assertEq(policy.insurer, user2);
        assertEq(policy.coverageAmount, 100000 * 10**18);
        assertEq(policy.premium, 5000 * 10**18);
        assertEq(policy.coverageType, "Weather Risk");
        assertTrue(policy.isActive);
    }
    
    function testClaimInsurance() public {
        // Create insurance policy
        vm.prank(user1);
        uint256 policyId = derivativesSuite.createInsurancePolicy(
            user1,
            user2,
            50000 * 10**18,
            2500 * 10**18,
            block.timestamp + 30 days,
            block.timestamp + 395 days,
            "Credit Risk"
        );
        
        // Claim insurance (partial claim)
        vm.prank(user1);
        bool success = derivativesSuite.claimInsurance(policyId, 30000 * 10**18);
        assertTrue(success);
        
        // Verify policy is no longer active
        DerivativesStructs.InsurancePolicy memory policy = derivativesSuite.getInsurancePolicy(policyId);
        assertTrue(!policy.isActive);
    }
    
    // Position Management Tests
    function testOpenPosition() public {
        // Create a derivative first
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.BIODIESEL,
            80000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Open position
        vm.prank(user1);
        uint256 positionId = derivativesSuite.openPosition(
            user1,
            DerivativesStructs.DerivativeType.SWAP,
            swapId,
            DerivativesStructs.PositionType.LONG,
            80000 * 10**18,
            5000
        );
        
        assertTrue(positionId > 0);
        
        // Verify position details
        DerivativesStructs.DerivativePosition memory position = derivativesSuite.getPosition(positionId);
        assertEq(position.owner, user1);
        assertEq(uint256(position.derivativeType), uint256(DerivativesStructs.DerivativeType.SWAP));
        assertEq(position.derivativeId, swapId);
        assertEq(uint256(position.positionType), uint256(DerivativesStructs.PositionType.LONG));
        assertEq(position.notional, 80000 * 10**18);
        assertTrue(position.isOpen);
    }
    
    function testClosePosition() public {
        // Open a position first
        vm.prank(user1);
        uint256 forwardId = derivativesSuite.createEnergyForward(
            user1,
            user2,
            DerivativesStructs.EnergyCommodity.METHANOL,
            5000 * 10**18,
            600 * 10**18,
            block.timestamp + 90 days,
            6,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        uint256 positionId = derivativesSuite.openPosition(
            user1,
            DerivativesStructs.DerivativeType.FORWARD,
            forwardId,
            DerivativesStructs.PositionType.SHORT,
            5000 * 10**18,
            600
        );
        
        // Close position
        vm.prank(user1);
        uint256 realizedPnL = derivativesSuite.closePosition(positionId);
        
        // Verify position is closed
        DerivativesStructs.DerivativePosition memory position = derivativesSuite.getPosition(positionId);
        assertTrue(!position.isOpen);
        assertEq(position.realizedPnL, realizedPnL);
    }
    
    function testGetPositionsByOwner() public {
        // Open multiple positions
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.LPG,
            30000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        uint256 positionId1 = derivativesSuite.openPosition(
            user1,
            DerivativesStructs.DerivativeType.SWAP,
            swapId,
            DerivativesStructs.PositionType.LONG,
            30000 * 10**18,
            5000
        );
        
        vm.prank(user1);
        uint256 positionId2 = derivativesSuite.openPosition(
            user1,
            DerivativesStructs.DerivativeType.SWAP,
            swapId,
            DerivativesStructs.PositionType.SHORT,
            20000 * 10**18,
            5000
        );
        
        // Get positions by owner
        uint256[] memory positionIds = derivativesSuite.getPositionsByOwner(user1);
        assertEq(positionIds.length, 2);
        assertTrue(positionIds[0] == positionId1 || positionIds[0] == positionId2);
        assertTrue(positionIds[1] == positionId1 || positionIds[1] == positionId2);
    }
    
    // Risk Limit Management Tests
    function testSetRiskLimit() public {
        uint256 limitId = derivativesSuite.setRiskLimit(
            user1,
            "Notional Limit",
            500000 * 10**18,
            3000, // 30% concentration
            10000 * 10**18 // VaR limit
        );
        
        assertTrue(limitId > 0);
        
        // Verify limit details
        DerivativesStructs.RiskLimit memory limit = derivativesSuite.getRiskLimit(limitId);
        assertEq(limit.entity, user1);
        assertEq(limit.limitType, "Notional Limit");
        assertEq(limit.maxNotional, 500000 * 10**18);
        assertEq(limit.maxConcentration, 3000);
        assertEq(limit.maxVaR, 10000 * 10**18);
        assertTrue(limit.isActive);
    }
    
    function testCheckRiskLimits() public {
        // Set risk limit
        derivativesSuite.setRiskLimit(
            user2,
            "Position Limit",
            100000 * 10**18,
            2000,
            5000 * 10**18
        );
        
        // Check risk limits (should be compliant initially)
        (bool isCompliant, string[] memory breachedLimits) = derivativesSuite.checkRiskLimits(user2);
        assertTrue(isCompliant);
        assertEq(breachedLimits.length, 0);
    }
    
    // Administrative Tests
    function testPauseUnpause() public {
        // Pause system
        vm.prank(administrator);
        derivativesSuite.pause();
        
        // Try to create swap while paused (should fail)
        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.NGL,
            10000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        // Unpause system
        vm.prank(administrator);
        derivativesSuite.unpause();
        
        // Should work now
        vm.prank(user1);
        uint256 swapId = derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.NGL,
            10000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        assertTrue(swapId > 0);
    }
    
    function testSetAdministrator() public {
        address newAdmin = address(0x123);
        
        vm.prank(administrator);
        derivativesSuite.setAdministrator(newAdmin);
        
        assertEq(derivativesSuite.getAdministrator(), newAdmin);
    }
    
    // System Metrics Tests
    function testGetSystemMetrics() public {
        // Create multiple derivatives
        vm.prank(user1);
        derivativesSuite.createEnergySwap(
            user2,
            DerivativesStructs.EnergyCommodity.FUEL_OIL,
            100000 * 10**18,
            5000,
            4500,
            block.timestamp + 30 days,
            block.timestamp + 365 days,
            DerivativesStructs.SettlementType.CASH
        );
        
        vm.prank(user1);
        derivativesSuite.createEnergyForward(
            user1,
            user2,
            DerivativesStructs.EnergyCommodity.KEROSENE,
            50000 * 10**18,
            80 * 10**18,
            block.timestamp + 90 days,
            7,
            DerivativesStructs.SettlementType.PHYSICAL
        );
        
        // Check system metrics
        assertEq(derivativesSuite.getTotalActiveContracts(), 2);
        assertEq(derivativesSuite.getTotalNotionalExposure(), 1050000 * 10**18); // 1000000 + 50000
        
        DerivativesStructs.RiskMetrics memory systemRisk = derivativesSuite.getSystemRiskMetrics();
        // System risk metrics should be initialized
        assertTrue(systemRisk.volatility >= 0);
    }
    
    // Token Management Tests
    function testAddRemoveSupportedToken() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 18);
        
        // Add new token
        vm.prank(administrator);
        derivativesSuite.addSupportedToken(address(newToken));
        
        // Remove token
        vm.prank(administrator);
        derivativesSuite.removeSupportedToken(address(newToken));
    }
    
    // Edge Cases and Error Handling Tests
    function testInvalidDerivativeId() public {
        vm.expectRevert("Invalid derivative ID");
        derivativesSuite.getEnergySwap(999999);
    }
    
    function testUnauthorizedAccess() public {
        // Try to trigger credit event as non-admin
        vm.prank(user1);
        uint256 cdsId = derivativesSuite.createCreditDefaultSwap(
            user1,
            user2,
            user3,
            100000 * 10**18,
            500,
            block.timestamp + 365 days,
            4000
        );
        
        vm.prank(user2);
        vm.expectRevert("Only authorized");
        derivativesSuite.triggerCreditEvent(cdsId);
    }
    
    function testUnsupportedToken() public {
        MockERC20 unsupportedToken = new MockERC20("Unsupported", "UNS", 18);
        
        vm.prank(user1);
        vm.expectRevert("Token not supported");
        derivativesSuite.submitCollateral(
            user2,
            10000 * 10**18,
            address(unsupportedToken),
            30 days
        );
    }
}

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing collateral functionality
 */
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
