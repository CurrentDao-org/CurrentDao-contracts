// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IEnergyDerivativesSuite.sol";
import "./structures/DerivativesStructs.sol";
import "./libraries/DerivativesLib.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EnergyDerivativesSuite
 * @notice Comprehensive energy derivatives suite with swaps, forwards, structured products, and advanced derivatives
 * @dev Implements full derivatives ecosystem with clearing, settlement, and risk management
 * @author CurrentDao
 */
contract EnergyDerivativesSuite is 
    IEnergyDerivativesSuite, 
    ReentrancyGuard, 
    Ownable, 
    Pausable 
{
    using SafeERC20 for IERC20;
    using DerivativesLib for uint256;
    
    // State Variables
    address private administrator;
    
    // Mappings for storage
    mapping(uint256 => DerivativesStructs.EnergySwap) private energySwaps;
    mapping(uint256 => DerivativesStructs.EnergyForward) private energyForwards;
    mapping(uint256 => DerivativesStructs.WeatherDerivative) private weatherDerivatives;
    mapping(uint256 => DerivativesStructs.CreditDefaultSwap) private creditDefaultSwaps;
    mapping(uint256 => DerivativesStructs.StructuredProduct) private structuredProducts;
    mapping(uint256 => DerivativesStructs.Portfolio) private portfolios;
    mapping(uint256 => DerivativesStructs.Collateral) private collaterals;
    mapping(uint256 => DerivativesStructs.SettlementInstruction) private settlementInstructions;
    mapping(DerivativesStructs.EnergyCommodity => DerivativesStructs.MarketData) private marketData;
    mapping(address => DerivativesStructs.CounterpartyInfo) private counterparties;
    mapping(uint256 => DerivativesStructs.DerivativePosition) private positions;
    mapping(uint256 => DerivativesStructs.RiskLimit) private riskLimits;
    mapping(uint256 => DerivativesStructs.InsurancePolicy) private insurancePolicies;
    mapping(string => DerivativesStructs.WeatherDataPoint[]) private weatherDataHistory;
    
    // Counters
    uint256 private swapCounter;
    uint256 private forwardCounter;
    uint256 private weatherDerivativeCounter;
    uint256 private cdsCounter;
    uint256 private structuredProductCounter;
    uint256 private portfolioCounter;
    uint256 private collateralCounter;
    uint256 private settlementInstructionCounter;
    uint256 private positionCounter;
    uint256 private riskLimitCounter;
    uint256 private insurancePolicyCounter;
    
    // Arrays for tracking
    uint256[] private activeSwapIds;
    uint256[] private activeForwardIds;
    uint256[] private activeWeatherDerivativeIds;
    uint256[] private activeCdsIds;
    uint256[] private activeStructuredProductIds;
    
    // System-wide metrics
    uint256 private totalNotionalExposure;
    uint256 private totalActiveContracts;
    DerivativesStructs.RiskMetrics private systemRiskMetrics;
    
    // Supported tokens for collateral and settlement
    mapping(address => bool) private supportedTokens;
    address[] private tokenList;
    
    // Events (additional to interface events)
    event SystemPaused(address indexed pausedBy, uint256 timestamp);
    event SystemUnpaused(address indexed unpausedBy, uint256 timestamp);
    event AdministratorChanged(address indexed oldAdmin, address indexed newAdmin, uint256 timestamp);
    event TokenAdded(address indexed tokenAddress, uint256 timestamp);
    event TokenRemoved(address indexed tokenAddress, uint256 timestamp);
    
    // Modifiers
    modifier onlyAdministrator() {
        require(msg.sender == administrator || msg.sender == owner(), "Only administrator");
        _;
    }
    
    modifier validCommodity(DerivativesStructs.EnergyCommodity _commodity) {
        require(_commodity <= DerivativesStructs.EnergyCommodity.NGL, "Invalid commodity type");
        _;
    }
    
    modifier validDerivativeType(DerivativesStructs.DerivativeType _derivativeType) {
        require(_derivativeType <= DerivativesStructs.DerivativeType.COLLATERALIZED_DEBT_OBLIGATION, "Invalid derivative type");
        _;
    }
    
    modifier supportedToken(address _token) {
        require(supportedTokens[_token], "Token not supported");
        _;
    }
    
    modifier derivativeExists(uint256 _derivativeId, DerivativesStructs.DerivativeType _derivativeType) {
        require(_derivativeId > 0, "Invalid derivative ID");
        if (_derivativeType == DerivativesStructs.DerivativeType.SWAP) {
            require(energySwaps[_derivativeId].swapId == _derivativeId, "Swap does not exist");
        } else if (_derivativeType == DerivativesStructs.DerivativeType.FORWARD) {
            require(energyForwards[_derivativeId].forwardId == _derivativeId, "Forward does not exist");
        }
        _;
    }
    
    constructor(address _administrator) {
        require(_administrator != address(0), "Invalid administrator address");
        administrator = _administrator;
        
        // Initialize counters
        swapCounter = 1;
        forwardCounter = 1;
        weatherDerivativeCounter = 1;
        cdsCounter = 1;
        structuredProductCounter = 1;
        portfolioCounter = 1;
        collateralCounter = 1;
        settlementInstructionCounter = 1;
        positionCounter = 1;
        riskLimitCounter = 1;
        insurancePolicyCounter = 1;
    }
    
    // Energy Swaps Functions
    function createEnergySwap(
        address _counterparty,
        DerivativesStructs.EnergyCommodity _commodity,
        uint256 _notionalAmount,
        uint256 _fixedRate,
        uint256 _floatingRate,
        uint256 _startDate,
        uint256 _maturityDate,
        DerivativesStructs.SettlementType _settlementType
    ) external override nonReentrant whenNotPaused returns (uint256 swapId) {
        require(_counterparty != address(0), "Invalid counterparty");
        require(DerivativesLib.validateSwapParameters(_notionalAmount, _fixedRate, _startDate, _maturityDate), 
                "Invalid swap parameters");
        
        // Check counterparty credit limits
        require(checkCreditExposure(msg.sender).isWithinLimit, "Credit limit exceeded");
        require(checkCreditExposure(_counterparty).isWithinLimit, "Counterparty credit limit exceeded");
        
        swapId = swapCounter++;
        
        energySwaps[swapId] = DerivativesStructs.EnergySwap({
            swapId: swapId,
            initiator: msg.sender,
            counterparty: _counterparty,
            commodity: _commodity,
            notionalAmount: _notionalAmount,
            fixedRate: _fixedRate,
            floatingRate: _floatingRate,
            startDate: _startDate,
            maturityDate: _maturityDate,
            settlementType: _settlementType,
            isActive: true,
            createdAt: block.timestamp
        });
        
        activeSwapIds.push(swapId);
        totalActiveContracts++;
        totalNotionalExposure += _notionalAmount;
        
        // Update counterparty exposures
        _updateCounterpartyExposure(msg.sender, _notionalAmount);
        _updateCounterpartyExposure(_counterparty, _notionalAmount);
        
        emit EnergySwapCreated(swapId, msg.sender, _commodity);
        emit DerivativeCreated(swapId, DerivativesStructs.DerivativeType.SWAP, msg.sender, block.timestamp);
    }
    
    function executeEnergySwap(uint256 _swapId) external override nonReentrant derivativeExists(_swapId, DerivativesStructs.DerivativeType.SWAP) returns (bool success) {
        DerivativesStructs.EnergySwap storage swap = energySwaps[_swapId];
        require(swap.isActive, "Swap is not active");
        require(block.timestamp >= swap.maturityDate, "Swap not yet matured");
        
        // Calculate settlement amount
        uint256 floatingLegValue = (swap.notionalAmount * swap.floatingRate * 
                                    (swap.maturityDate - swap.startDate)) / DerivativesLib.PRECISION;
        uint256 fixedLegValue = (swap.notionalAmount * swap.fixedRate * 
                                 (swap.maturityDate - swap.startDate)) / DerivativesLib.PRECISION;
        
        uint256 settlementAmount = floatingLegValue > fixedLegValue ? 
                                   floatingLegValue - fixedLegValue : fixedLegValue - floatingLegValue;
        
        address payer = floatingLegValue > fixedLegValue ? swap.counterparty : swap.initiator;
        address payee = floatingLegValue > fixedLegValue ? swap.initiator : swap.counterparty;
        
        // Create settlement instruction
        uint256 instructionId = createSettlementInstruction(
            payer,
            payee,
            settlementAmount,
            address(0), // Use native token by default
            block.timestamp + 86400, // Due in 24 hours
            swap.settlementType
        );
        
        swap.isActive = false;
        _removeFromActiveSwaps(_swapId);
        totalActiveContracts--;
        
        emit SettlementCompleted(_swapId, payee, settlementAmount, block.timestamp);
        emit TradeExecuted(_swapId, swap.initiator, swap.counterparty, settlementAmount, block.timestamp);
        
        success = true;
    }
    
    function terminateEnergySwap(uint256 _swapId) external override nonReentrant derivativeExists(_swapId, DerivativesStructs.DerivativeType.SWAP) returns (bool success) {
        DerivativesStructs.EnergySwap storage swap = energySwaps[_swapId];
        require(swap.isActive, "Swap is not active");
        require(msg.sender == swap.initiator || msg.sender == swap.counterparty, "Not a party to swap");
        
        swap.isActive = false;
        _removeFromActiveSwaps(_swapId);
        totalActiveContracts--;
        totalNotionalExposure -= swap.notionalAmount;
        
        // Update counterparty exposures
        _updateCounterpartyExposure(swap.initiator, -int256(swap.notionalAmount));
        _updateCounterpartyExposure(swap.counterparty, -int256(swap.notionalAmount));
        
        success = true;
    }
    
    function getEnergySwap(uint256 _swapId) external override view returns (DerivativesStructs.EnergySwap memory) {
        return energySwaps[_swapId];
    }
    
    function getActiveSwapsByCommodity(DerivativesStructs.EnergyCommodity _commodity) 
        external override view returns (uint256[] memory swapIds) {
        uint256[] memory temp = new uint256[](activeSwapIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < activeSwapIds.length; i++) {
            if (energySwaps[activeSwapIds[i]].commodity == _commodity) {
                temp[count] = activeSwapIds[i];
                count++;
            }
        }
        
        swapIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            swapIds[i] = temp[i];
        }
    }
    
    // Energy Forwards Functions
    function createEnergyForward(
        address _buyer,
        address _seller,
        DerivativesStructs.EnergyCommodity _commodity,
        uint256 _quantity,
        uint256 _strikePrice,
        uint256 _deliveryDate,
        uint256 _deliveryLocation,
        DerivativesStructs.SettlementType _settlementType
    ) external override nonReentrant whenNotPaused returns (uint256 forwardId) {
        require(_buyer != address(0) && _seller != address(0), "Invalid parties");
        require(DerivativesLib.validateForwardParameters(_quantity, _strikePrice, _deliveryDate), 
                "Invalid forward parameters");
        
        forwardId = forwardCounter++;
        
        energyForwards[forwardId] = DerivativesStructs.EnergyForward({
            forwardId: forwardId,
            buyer: _buyer,
            seller: _seller,
            commodity: _commodity,
            quantity: _quantity,
            strikePrice: _strikePrice,
            deliveryDate: _deliveryDate,
            deliveryLocation: _deliveryLocation,
            settlementType: _settlementType,
            isConfirmed: false,
            createdAt: block.timestamp
        });
        
        activeForwardIds.push(forwardId);
        totalActiveContracts++;
        totalNotionalExposure += _quantity * _strikePrice;
        
        emit EnergyForwardCreated(forwardId, _buyer, _seller);
        emit DerivativeCreated(forwardId, DerivativesStructs.DerivativeType.FORWARD, msg.sender, block.timestamp);
    }
    
    function confirmEnergyForward(uint256 _forwardId) external override nonReentrant derivativeExists(_forwardId, DerivativesStructs.DerivativeType.FORWARD) returns (bool success) {
        DerivativesStructs.EnergyForward storage forward = energyForwards[_forwardId];
        require(!forward.isConfirmed, "Forward already confirmed");
        require(msg.sender == forward.buyer || msg.sender == forward.seller, "Not a party to forward");
        
        forward.isConfirmed = true;
        success = true;
    }
    
    function executeEnergyForward(uint256 _forwardId) external override nonReentrant derivativeExists(_forwardId, DerivativesStructs.DerivativeType.FORWARD) returns (bool success) {
        DerivativesStructs.EnergyForward storage forward = energyForwards[_forwardId];
        require(forward.isConfirmed, "Forward not confirmed");
        require(block.timestamp >= forward.deliveryDate, "Delivery date not reached");
        
        uint256 settlementAmount = forward.quantity * forward.strikePrice;
        
        // Create settlement instruction
        uint256 instructionId = createSettlementInstruction(
            forward.buyer,
            forward.seller,
            settlementAmount,
            address(0),
            block.timestamp + 86400,
            forward.settlementType
        );
        
        _removeFromActiveForwards(_forwardId);
        totalActiveContracts--;
        
        emit SettlementCompleted(_forwardId, forward.seller, settlementAmount, block.timestamp);
        success = true;
    }
    
    function getEnergyForward(uint256 _forwardId) external override view returns (DerivativesStructs.EnergyForward memory) {
        return energyForwards[_forwardId];
    }
    
    // Weather Derivatives Functions
    function createWeatherDerivative(
        address _buyer,
        address _seller,
        DerivativesStructs.WeatherType _weatherType,
        string memory _location,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _strikeLevel,
        uint256 _payoutPerUnit,
        uint256 _notionalAmount
    ) external override nonReentrant whenNotPaused returns (uint256 derivativeId) {
        require(_buyer != address(0) && _seller != address(0), "Invalid parties");
        require(DerivativesLib.validateWeatherDerivativeParameters(_strikeLevel, _payoutPerUnit, _startDate, _endDate), 
                "Invalid weather derivative parameters");
        
        derivativeId = weatherDerivativeCounter++;
        
        weatherDerivatives[derivativeId] = DerivativesStructs.WeatherDerivative({
            derivativeId: derivativeId,
            buyer: _buyer,
            seller: _seller,
            weatherType: _weatherType,
            location: _location,
            startDate: _startDate,
            endDate: _endDate,
            strikeLevel: _strikeLevel,
            payoutPerUnit: _payoutPerUnit,
            notionalAmount: _notionalAmount,
            isActive: true,
            createdAt: block.timestamp
        });
        
        activeWeatherDerivativeIds.push(derivativeId);
        totalActiveContracts++;
        totalNotionalExposure += _notionalAmount;
        
        emit WeatherDerivativeCreated(derivativeId, _weatherType);
        emit DerivativeCreated(derivativeId, DerivativesStructs.DerivativeType.WEATHER_DERIVATIVE, msg.sender, block.timestamp);
    }
    
    function settleWeatherDerivative(uint256 _derivativeId, uint256 _actualWeatherValue) 
        external override nonReentrant derivativeExists(_derivativeId, DerivativesStructs.DerivativeType.WEATHER_DERIVATIVE) returns (uint256 payout) {
        DerivativesStructs.WeatherDerivative storage derivative = weatherDerivatives[_derivativeId];
        require(derivative.isActive, "Derivative is not active");
        require(block.timestamp >= derivative.endDate, "Derivative period not ended");
        
        payout = DerivativesLib.calculateWeatherPayout(
            derivative.strikeLevel,
            _actualWeatherValue,
            derivative.payoutPerUnit,
            derivative.notionalAmount
        );
        
        if (payout > 0) {
            // Create settlement instruction
            createSettlementInstruction(
                derivative.seller,
                derivative.buyer,
                payout,
                address(0),
                block.timestamp + 86400,
                DerivativesStructs.SettlementType.CASH
            );
        }
        
        derivative.isActive = false;
        _removeFromActiveWeatherDerivatives(_derivativeId);
        totalActiveContracts--;
        
        emit SettlementCompleted(_derivativeId, derivative.buyer, payout, block.timestamp);
    }
    
    function getWeatherDerivative(uint256 _derivativeId) external override view returns (DerivativesStructs.WeatherDerivative memory) {
        return weatherDerivatives[_derivativeId];
    }
    
    // Credit Default Swaps Functions
    function createCreditDefaultSwap(
        address _protectionBuyer,
        address _protectionSeller,
        address _referenceEntity,
        uint256 _notionalAmount,
        uint256 _spread,
        uint256 _maturityDate,
        uint256 _recoveryRate
    ) external override nonReentrant whenNotPaused returns (uint256 cdsId) {
        require(_protectionBuyer != address(0) && _protectionSeller != address(0), "Invalid parties");
        require(_referenceEntity != address(0), "Invalid reference entity");
        require(_recoveryRate <= DerivativesLib.PRECISION, "Invalid recovery rate");
        
        cdsId = cdsCounter++;
        
        creditDefaultSwaps[cdsId] = DerivativesStructs.CreditDefaultSwap({
            cdsId: cdsId,
            protectionBuyer: _protectionBuyer,
            protectionSeller: _protectionSeller,
            referenceEntity: _referenceEntity,
            notionalAmount: _notionalAmount,
            spread: _spread,
            maturityDate: _maturityDate,
            recoveryRate: _recoveryRate,
            isActive: true,
            createdAt: block.timestamp
        });
        
        activeCdsIds.push(cdsId);
        totalActiveContracts++;
        totalNotionalExposure += _notionalAmount;
        
        emit CreditDefaultSwapCreated(cdsId, _protectionBuyer, _protectionSeller);
        emit DerivativeCreated(cdsId, DerivativesStructs.DerivativeType.CREDIT_DEFAULT_SWAP, msg.sender, block.timestamp);
    }
    
    function triggerCreditEvent(uint256 _cdsId) external override nonReentrant derivativeExists(_cdsId, DerivativesStructs.DerivativeType.CREDIT_DEFAULT_SWAP) returns (bool success) {
        DerivativesStructs.CreditDefaultSwap storage cds = creditDefaultSwaps[_cdsId];
        require(cds.isActive, "CDS is not active");
        require(msg.sender == owner() || msg.sender == administrator, "Only authorized");
        
        // Mark as defaulted and trigger settlement
        cds.isActive = false;
        _removeFromActiveCds(_cdsId);
        totalActiveContracts--;
        
        emit DefaultEvent(cds.referenceEntity, cds.notionalAmount, block.timestamp);
        success = true;
    }
    
    function settleCreditDefaultSwap(uint256 _cdsId) external override nonReentrant derivativeExists(_cdsId, DerivativesStructs.DerivativeType.CREDIT_DEFAULT_SWAP) returns (uint256 settlementAmount) {
        DerivativesStructs.CreditDefaultSwap storage cds = creditDefaultSwaps[_cdsId];
        require(!cds.isActive, "CDS is still active");
        
        settlementAmount = DerivativesLib.calculateCDSPayout(cds.notionalAmount, cds.recoveryRate);
        
        // Create settlement instruction
        createSettlementInstruction(
            cds.protectionSeller,
            cds.protectionBuyer,
            settlementAmount,
            address(0),
            block.timestamp + 86400,
            DerivativesStructs.SettlementType.CASH
        );
        
        emit SettlementCompleted(_cdsId, cds.protectionBuyer, settlementAmount, block.timestamp);
    }
    
    function getCreditDefaultSwap(uint256 _cdsId) external override view returns (DerivativesStructs.CreditDefaultSwap memory) {
        return creditDefaultSwaps[_cdsId];
    }
    
    // Structured Products Functions
    function createStructuredProduct(
        address _holder,
        string memory _productName,
        DerivativesStructs.DerivativeType[] memory _underlyingTypes,
        uint256[] memory _weights,
        uint256 _notionalAmount,
        uint256 _maturityDate,
        bool _isCallable,
        uint256 _callPrice
    ) external override nonReentrant whenNotPaused returns (uint256 productId) {
        require(_holder != address(0), "Invalid holder");
        require(_underlyingTypes.length == _weights.length, "Array length mismatch");
        require(_maturityDate > block.timestamp, "Invalid maturity date");
        
        productId = structuredProductCounter++;
        
        structuredProducts[productId] = DerivativesStructs.StructuredProduct({
            productId: productId,
            issuer: msg.sender,
            holder: _holder,
            productName: _productName,
            underlyingTypes: _underlyingTypes,
            weights: _weights,
            notionalAmount: _notionalAmount,
            maturityDate: _maturityDate,
            isCallable: _isCallable,
            callPrice: _callPrice,
            isActive: true,
            createdAt: block.timestamp
        });
        
        activeStructuredProductIds.push(productId);
        totalActiveContracts++;
        totalNotionalExposure += _notionalAmount;
        
        emit StructuredProductCreated(productId, _productName, _holder);
        emit DerivativeCreated(productId, DerivativesStructs.DerivativeType.STRUCTURED_PRODUCT, msg.sender, block.timestamp);
    }
    
    function calculateStructuredProductValue(uint256 _productId) external override view returns (uint256 value) {
        DerivativesStructs.StructuredProduct storage product = structuredProducts[_productId];
        require(product.productId == _productId, "Product does not exist");
        
        // Simplified calculation - in production would fetch actual underlying values
        uint256[] memory underlyingValues = new uint256[](product.underlyingTypes.length);
        for (uint256 i = 0; i < underlyingValues.length; i++) {
            underlyingValues[i] = DerivativesLib.PRECISION; // Placeholder
        }
        
        value = DerivativesLib.calculateStructuredProductValue(
            underlyingValues,
            product.weights,
            product.notionalAmount
        );
    }
    
    function callStructuredProduct(uint256 _productId) external override nonReentrant derivativeExists(_productId, DerivativesStructs.DerivativeType.STRUCTURED_PRODUCT) returns (bool success) {
        DerivativesStructs.StructuredProduct storage product = structuredProducts[_productId];
        require(product.isCallable, "Product is not callable");
        require(product.isActive, "Product is not active");
        require(msg.sender == product.issuer, "Only issuer can call");
        require(block.timestamp >= product.createdAt + 30 days, "Call period not reached");
        
        product.isActive = false;
        _removeFromActiveStructuredProducts(_productId);
        totalActiveContracts--;
        
        success = true;
    }
    
    function getStructuredProduct(uint256 _productId) external override view returns (DerivativesStructs.StructuredProduct memory) {
        return structuredProducts[_productId];
    }
    
    // Portfolio Management Functions
    function createPortfolio(
        address _owner,
        string memory _name
    ) external override nonReentrant whenNotPaused returns (uint256 portfolioId) {
        require(_owner != address(0), "Invalid owner");
        
        portfolioId = portfolioCounter++;
        
        portfolios[portfolioId] = DerivativesStructs.Portfolio({
            portfolioId: portfolioId,
            owner: _owner,
            name: _name,
            swapIds: new uint256[](0),
            forwardIds: new uint256[](0),
            weatherDerivativeIds: new uint256[](0),
            cdsIds: new uint256[](0),
            structuredProductIds: new uint256[](0),
            totalValue: 0,
            totalNotional: 0,
            riskMetrics: DerivativesStructs.RiskMetrics(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
            lastUpdated: block.timestamp
        });
        
        emit PortfolioCreated(portfolioId, _owner, _name);
    }
    
    function addToPortfolio(
        uint256 _portfolioId,
        DerivativesStructs.DerivativeType _derivativeType,
        uint256 _derivativeId
    ) external override nonReentrant returns (bool success) {
        DerivativesStructs.Portfolio storage portfolio = portfolios[_portfolioId];
        require(portfolio.owner == msg.sender, "Not portfolio owner");
        
        if (_derivativeType == DerivativesStructs.DerivativeType.SWAP) {
            portfolio.swapIds.push(_derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.FORWARD) {
            portfolio.forwardIds.push(_derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.WEATHER_DERIVATIVE) {
            portfolio.weatherDerivativeIds.push(_derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.CREDIT_DEFAULT_SWAP) {
            portfolio.cdsIds.push(_derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.STRUCTURED_PRODUCT) {
            portfolio.structuredProductIds.push(_derivativeId);
        }
        
        portfolio.lastUpdated = block.timestamp;
        success = true;
    }
    
    function removeFromPortfolio(
        uint256 _portfolioId,
        DerivativesStructs.DerivativeType _derivativeType,
        uint256 _derivativeId
    ) external override nonReentrant returns (bool success) {
        DerivativesStructs.Portfolio storage portfolio = portfolios[_portfolioId];
        require(portfolio.owner == msg.sender, "Not portfolio owner");
        
        if (_derivativeType == DerivativesStructs.DerivativeType.SWAP) {
            _removeFromArray(portfolio.swapIds, _derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.FORWARD) {
            _removeFromArray(portfolio.forwardIds, _derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.WEATHER_DERIVATIVE) {
            _removeFromArray(portfolio.weatherDerivativeIds, _derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.CREDIT_DEFAULT_SWAP) {
            _removeFromArray(portfolio.cdsIds, _derivativeId);
        } else if (_derivativeType == DerivativesStructs.DerivativeType.STRUCTURED_PRODUCT) {
            _removeFromArray(portfolio.structuredProductIds, _derivativeId);
        }
        
        portfolio.lastUpdated = block.timestamp;
        success = true;
    }
    
    function getPortfolio(uint256 _portfolioId) external override view returns (DerivativesStructs.Portfolio memory) {
        return portfolios[_portfolioId];
    }
    
    function optimizePortfolio(uint256 _portfolioId) external override nonReentrant returns (bool success, DerivativesStructs.RiskMetrics memory optimizedRisk) {
        DerivativesStructs.Portfolio storage portfolio = portfolios[_portfolioId];
        require(portfolio.owner == msg.sender, "Not portfolio owner");
        
        // Simplified optimization - would use more sophisticated algorithms in production
        portfolio.riskMetrics = calculateRiskMetrics(_portfolioId);
        optimizedRisk = portfolio.riskMetrics;
        
        success = true;
    }
    
    // Risk Analytics Functions
    function calculateRiskMetrics(uint256 _portfolioId) public override view returns (DerivativesStructs.RiskMetrics memory riskMetrics) {
        DerivativesStructs.Portfolio storage portfolio = portfolios[_portfolioId];
        
        // Simplified risk calculation - would use Monte Carlo or other methods in production
        uint256 totalNotional = 0;
        uint256 totalValue = 0;
        
        // Calculate total notional and value
        for (uint256 i = 0; i < portfolio.swapIds.length; i++) {
            totalNotional += energySwaps[portfolio.swapIds[i]].notionalAmount;
        }
        
        for (uint256 i = 0; i < portfolio.forwardIds.length; i++) {
            totalNotional += energyForwards[portfolio.forwardIds[i]].quantity * 
                           energyForwards[portfolio.forwardIds[i]].strikePrice;
        }
        
        // Simplified VaR calculation (2% of portfolio value)
        riskMetrics.valueAtRisk = (totalValue * 200) / DerivativesLib.PRECISION;
        riskMetrics.expectedShortfall = (totalValue * 300) / DerivativesLib.PRECISION;
        riskMetrics.volatility = 1500; // 15% annualized
        riskMetrics.correlation = 500; // 50% average correlation
        riskMetrics.concentration = (totalNotional * 1000) / totalNotionalExposure; // Concentration ratio
    }
    
    function calculateValueAtRisk(
        uint256 _portfolioId,
        uint256 _confidenceLevel,
        uint256 _timeHorizon
    ) external override view returns (uint256 varAmount) {
        DerivativesStructs.RiskMetrics memory riskMetrics = calculateRiskMetrics(_portfolioId);
        
        // Simplified VaR calculation
        varAmount = (riskMetrics.valueAtRisk * _timeHorizon * _confidenceLevel) / 
                   (365 days * 95); // Normalized to 95% confidence, 1 year
    }
    
    function calculateExpectedShortfall(
        uint256 _portfolioId,
        uint256 _confidenceLevel
    ) external override view returns (uint256 expectedShortfall) {
        DerivativesStructs.RiskMetrics memory riskMetrics = calculateRiskMetrics(_portfolioId);
        expectedShortfall = (riskMetrics.expectedShortfall * _confidenceLevel) / 95;
    }
    
    function getGreeks(uint256 _derivativeId) external override view returns (uint256 delta, uint256 gamma, uint256 vega, uint256 theta, uint256 rho) {
        // Simplified Greeks calculation - would use proper pricing models in production
        delta = 5000; // 0.5
        gamma = 100;  // 0.01
        vega = 2000;  // 0.2
        theta = -50;  // -0.005
        rho = 1000;   // 0.1
    }
    
    // Clearing and Settlement Functions
    function submitCollateral(
        address _beneficiary,
        uint256 _amount,
        address _tokenAddress,
        uint256 _lockPeriod
    ) external override nonReentrant supportedToken(_tokenAddress) returns (uint256 collateralId) {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_amount > 0, "Invalid collateral amount");
        
        collateralId = collateralCounter++;
        
        collaterals[collateralId] = DerivativesStructs.Collateral({
            collateralId: collateralId,
            provider: msg.sender,
            beneficiary: _beneficiary,
            amount: _amount,
            tokenAddress: _tokenAddress,
            lockPeriod: _lockPeriod,
            isLocked: true,
            createdAt: block.timestamp
        });
        
        // Transfer tokens to contract
        IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _amount);
        
        emit CollateralPosted(collateralId, msg.sender, _amount);
    }
    
    function releaseCollateral(uint256 _collateralId) external override nonReentrant returns (bool success) {
        DerivativesStructs.Collateral storage collateral = collaterals[_collateralId];
        require(collateral.provider == msg.sender || msg.sender == administrator, "Not authorized");
        require(!collateral.isLocked || block.timestamp >= collateral.createdAt + collateral.lockPeriod, 
                "Collateral still locked");
        
        collateral.isLocked = false;
        
        // Return tokens
        IERC20(collateral.tokenAddress).safeTransfer(collateral.provider, collateral.amount);
        
        success = true;
    }
    
    function createSettlementInstruction(
        address _payer,
        address _payee,
        uint256 _amount,
        address _tokenAddress,
        uint256 _dueDate,
        DerivativesStructs.SettlementType _settlementType
    ) public override nonReentrant returns (uint256 instructionId) {
        require(_payer != address(0) && _payee != address(0), "Invalid parties");
        require(_amount > 0, "Invalid settlement amount");
        
        instructionId = settlementInstructionCounter++;
        
        settlementInstructions[instructionId] = DerivativesStructs.SettlementInstruction({
            instructionId: instructionId,
            payer: _payer,
            payee: _payee,
            amount: _amount,
            tokenAddress: _tokenAddress,
            dueDate: _dueDate,
            settlementType: _settlementType,
            isExecuted: false,
            executedAt: 0
        });
    }
    
    function executeSettlement(uint256 _instructionId) external override nonReentrant returns (bool success) {
        DerivativesStructs.SettlementInstruction storage instruction = settlementInstructions[_instructionId];
        require(!instruction.isExecuted, "Already executed");
        require(block.timestamp >= instruction.dueDate, "Settlement date not reached");
        
        instruction.isExecuted = true;
        instruction.executedAt = block.timestamp;
        
        // Execute settlement based on type
        if (instruction.settlementType == DerivativesStructs.SettlementType.CASH) {
            if (instruction.tokenAddress == address(0)) {
                payable(instruction.payee).transfer(instruction.amount);
            } else {
                IERC20(instruction.tokenAddress).safeTransfer(instruction.payee, instruction.amount);
            }
        }
        
        emit SettlementExecuted(_instructionId, instruction.amount);
        success = true;
    }
    
    function getCollateral(uint256 _collateralId) external override view returns (DerivativesStructs.Collateral memory) {
        return collaterals[_collateralId];
    }
    
    function getSettlementInstruction(uint256 _instructionId) external override view returns (DerivativesStructs.SettlementInstruction memory) {
        return settlementInstructions[_instructionId];
    }
    
    // Market Data Functions
    function updateMarketData(
        DerivativesStructs.EnergyCommodity _commodity,
        uint256 _spotPrice,
        uint256 _forwardCurve,
        uint256 _volatility
    ) external override onlyAdministrator returns (bool success) {
        marketData[_commodity] = DerivativesStructs.MarketData({
            commodity: _commodity,
            spotPrice: _spotPrice,
            forwardCurve: _forwardCurve,
            volatility: _volatility,
            timestamp: block.timestamp,
            isActive: true
        });
        
        success = true;
    }
    
    function getMarketData(DerivativesStructs.EnergyCommodity _commodity) external override view returns (DerivativesStructs.MarketData memory) {
        return marketData[_commodity];
    }
    
    function getForwardCurve(DerivativesStructs.EnergyCommodity _commodity) external override view returns (uint256[] memory curve) {
        // Simplified - would return actual forward curve points in production
        curve = new uint256[](12); // 12 months
        for (uint256 i = 0; i < 12; i++) {
            curve[i] = marketData[_commodity].forwardCurve;
        }
    }
    
    // Counterparty Management Functions
    function updateCounterpartyInfo(
        address _counterparty,
        uint256 _creditLimit,
        uint256 _creditRating
    ) external override onlyAdministrator returns (bool success) {
        counterparties[_counterparty] = DerivativesStructs.CounterpartyInfo({
            counterparty: _counterparty,
            creditLimit: _creditLimit,
            currentExposure: counterparties[_counterparty].currentExposure,
            collateralPosted: counterparties[_counterparty].collateralPosted,
            collateralReceived: counterparties[_counterparty].collateralReceived,
            creditRating: _creditRating,
            isDefaulted: counterparties[_counterparty].isDefaulted,
            lastUpdated: block.timestamp
        });
        
        success = true;
    }
    
    function getCounterpartyInfo(address _counterparty) external override view returns (DerivativesStructs.CounterpartyInfo memory) {
        return counterparties[_counterparty];
    }
    
    function checkCreditExposure(address _counterparty) external override view returns (uint256 exposure, bool isWithinLimit) {
        DerivativesStructs.CounterpartyInfo storage counterparty = counterparties[_counterparty];
        exposure = counterparty.currentExposure;
        isWithinLimit = exposure <= counterparty.creditLimit;
    }
    
    // Insurance Integration Functions
    function createInsurancePolicy(
        address _insured,
        address _insurer,
        uint256 _coverageAmount,
        uint256 _premium,
        uint256 _startDate,
        uint256 _endDate,
        string memory _coverageType
    ) external override nonReentrant whenNotPaused returns (uint256 policyId) {
        require(_insured != address(0) && _insurer != address(0), "Invalid parties");
        require(_coverageAmount > 0 && _premium > 0, "Invalid amounts");
        require(_endDate > _startDate, "Invalid dates");
        
        policyId = insurancePolicyCounter++;
        
        insurancePolicies[policyId] = DerivativesStructs.InsurancePolicy({
            policyId: policyId,
            insured: _insured,
            insurer: _insurer,
            coverageAmount: _coverageAmount,
            premium: _premium,
            startDate: _startDate,
            endDate: _endDate,
            coverageType: _coverageType,
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit InsurancePolicyCreated(policyId, _insured, _insurer);
    }
    
    function claimInsurance(uint256 _policyId, uint256 _claimAmount) external override nonReentrant returns (bool success) {
        DerivativesStructs.InsurancePolicy storage policy = insurancePolicies[_policyId];
        require(policy.insured == msg.sender, "Not policy holder");
        require(policy.isActive, "Policy not active");
        require(_claimAmount <= policy.coverageAmount, "Claim exceeds coverage");
        
        // Process claim
        policy.isActive = false;
        
        success = true;
    }
    
    function getInsurancePolicy(uint256 _policyId) external override view returns (DerivativesStructs.InsurancePolicy memory) {
        return insurancePolicies[_policyId];
    }
    
    // Position Management Functions
    function openPosition(
        address _owner,
        DerivativesStructs.DerivativeType _derivativeType,
        uint256 _derivativeId,
        DerivativesStructs.PositionType _positionType,
        uint256 _notional,
        uint256 _entryPrice
    ) external override nonReentrant whenNotPaused returns (uint256 positionId) {
        require(_owner != address(0), "Invalid owner");
        require(_notional > 0 && _entryPrice > 0, "Invalid position parameters");
        
        positionId = positionCounter++;
        
        positions[positionId] = DerivativesStructs.DerivativePosition({
            positionId: positionId,
            owner: _owner,
            derivativeType: _derivativeType,
            derivativeId: _derivativeId,
            positionType: _positionType,
            notional: _notional,
            entryPrice: _entryPrice,
            currentPrice: _entryPrice,
            unrealizedPnL: 0,
            realizedPnL: 0,
            openTimestamp: block.timestamp,
            isOpen: true
        });
        
        emit PositionOpened(positionId, _owner, _derivativeType);
    }
    
    function closePosition(uint256 _positionId) external override nonReentrant returns (uint256 realizedPnL) {
        DerivativesStructs.DerivativePosition storage position = positions[_positionId];
        require(position.owner == msg.sender, "Not position owner");
        require(position.isOpen, "Position already closed");
        
        position.isOpen = false;
        position.realizedPnL = position.unrealizedPnL;
        realizedPnL = position.realizedPnL;
        
        emit PositionClosed(_positionId, realizedPnL);
    }
    
    function getPosition(uint256 _positionId) external override view returns (DerivativesStructs.DerivativePosition memory) {
        return positions[_positionId];
    }
    
    function getPositionsByOwner(address _owner) external override view returns (uint256[] memory positionIds) {
        uint256 count = 0;
        for (uint256 i = 1; i < positionCounter; i++) {
            if (positions[i].owner == _owner && positions[i].isOpen) {
                count++;
            }
        }
        
        positionIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < positionCounter; i++) {
            if (positions[i].owner == _owner && positions[i].isOpen) {
                positionIds[index] = i;
                index++;
            }
        }
    }
    
    // Risk Limit Management Functions
    function setRiskLimit(
        address _entity,
        string memory _limitType,
        uint256 _maxNotional,
        uint256 _maxConcentration,
        uint256 _maxVaR
    ) external override onlyAdministrator returns (uint256 limitId) {
        require(_entity != address(0), "Invalid entity");
        
        limitId = riskLimitCounter++;
        
        riskLimits[limitId] = DerivativesStructs.RiskLimit({
            limitId: limitId,
            entity: _entity,
            limitType: _limitType,
            maxNotional: _maxNotional,
            maxConcentration: _maxConcentration,
            maxVaR: _maxVaR,
            currentUtilization: 0,
            isActive: true,
            lastUpdated: block.timestamp
        });
    }
    
    function checkRiskLimits(address _entity) external override view returns (bool isCompliant, string[] memory breachedLimits) {
        isCompliant = true;
        uint256 breachCount = 0;
        
        // Check all risk limits for the entity
        for (uint256 i = 1; i < riskLimitCounter; i++) {
            if (riskLimits[i].entity == _entity && riskLimits[i].isActive) {
                // Simplified check - would be more comprehensive in production
                if (riskLimits[i].currentUtilization > riskLimits[i].maxNotional) {
                    isCompliant = false;
                    breachCount++;
                }
            }
        }
        
        breachedLimits = new string[](breachCount);
        uint256 index = 0;
        for (uint256 i = 1; i < riskLimitCounter; i++) {
            if (riskLimits[i].entity == _entity && riskLimits[i].isActive) {
                if (riskLimits[i].currentUtilization > riskLimits[i].maxNotional) {
                    breachedLimits[index] = riskLimits[i].limitType;
                    index++;
                }
            }
        }
    }
    
    function getRiskLimit(uint256 _limitId) external override view returns (DerivativesStructs.RiskLimit memory) {
        return riskLimits[_limitId];
    }
    
    // Weather Data Functions
    function submitWeatherData(
        DerivativesStructs.WeatherType _weatherType,
        string memory _location,
        uint256 _value,
        uint256 _timestamp
    ) external override onlyAdministrator returns (bool success) {
        weatherDataHistory[_location].push(DerivativesStructs.WeatherDataPoint({
            timestamp: _timestamp,
            weatherType: _weatherType,
            location: _location,
            value: _value,
            isVerified: true
        }));
        
        emit WeatherDataSubmitted(_location, _weatherType, _value);
        success = true;
    }
    
    function getWeatherData(
        DerivativesStructs.WeatherType _weatherType,
        string memory _location,
        uint256 _startDate,
        uint256 _endDate
    ) external override view returns (DerivativesStructs.WeatherDataPoint[] memory dataPoints) {
        DerivativesStructs.WeatherDataPoint[] storage allData = weatherDataHistory[_location];
        uint256 count = 0;
        
        // Count matching data points
        for (uint256 i = 0; i < allData.length; i++) {
            if (allData[i].weatherType == _weatherType && 
                allData[i].timestamp >= _startDate && 
                allData[i].timestamp <= _endDate) {
                count++;
            }
        }
        
        // Create result array
        dataPoints = new DerivativesStructs.WeatherDataPoint[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allData.length; i++) {
            if (allData[i].weatherType == _weatherType && 
                allData[i].timestamp >= _startDate && 
                allData[i].timestamp <= _endDate) {
                dataPoints[index] = allData[i];
                index++;
            }
        }
    }
    
    // Administrative Functions
    function pause() external override onlyAdministrator {
        _pause();
        emit SystemPaused(msg.sender, block.timestamp);
    }
    
    function unpause() external override onlyAdministrator {
        _unpause();
        emit SystemUnpaused(msg.sender, block.timestamp);
    }
    
    function setAdministrator(address _administrator) external override onlyOwner {
        address oldAdmin = administrator;
        administrator = _administrator;
        emit AdministratorChanged(oldAdmin, _administrator, block.timestamp);
    }
    
    function getAdministrator() external override view returns (address) {
        return administrator;
    }
    
    // View Functions
    function getTotalNotionalExposure() external override view returns (uint256) {
        return totalNotionalExposure;
    }
    
    function getTotalActiveContracts() external override view returns (uint256) {
        return totalActiveContracts;
    }
    
    function getSystemRiskMetrics() external override view returns (DerivativesStructs.RiskMetrics memory) {
        return systemRiskMetrics;
    }
    
    // Token Management Functions
    function addSupportedToken(address _tokenAddress) external onlyAdministrator {
        require(!supportedTokens[_tokenAddress], "Token already supported");
        supportedTokens[_tokenAddress] = true;
        tokenList.push(_tokenAddress);
        emit TokenAdded(_tokenAddress, block.timestamp);
    }
    
    function removeSupportedToken(address _tokenAddress) external onlyAdministrator {
        require(supportedTokens[_tokenAddress], "Token not supported");
        supportedTokens[_tokenAddress] = false;
        _removeFromArray(tokenList, _tokenAddress);
        emit TokenRemoved(_tokenAddress, block.timestamp);
    }
    
    // Internal Helper Functions
    function _updateCounterpartyExposure(address _counterparty, int256 _change) internal {
        DerivativesStructs.CounterpartyInfo storage counterparty = counterparties[_counterparty];
        if (_change > 0) {
            counterparty.currentExposure += uint256(_change);
        } else {
            counterparty.currentExposure = counterparty.currentExposure > uint256(-_change) ? 
                                          counterparty.currentExposure - uint256(-_change) : 0;
        }
        counterparty.lastUpdated = block.timestamp;
    }
    
    function _removeFromArray(uint256[] storage array, uint256 value) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }
    
    function _removeFromActiveSwaps(uint256 _swapId) internal {
        _removeFromArray(activeSwapIds, _swapId);
    }
    
    function _removeFromActiveForwards(uint256 _forwardId) internal {
        _removeFromArray(activeForwardIds, _forwardId);
    }
    
    function _removeFromActiveWeatherDerivatives(uint256 _derivativeId) internal {
        _removeFromArray(activeWeatherDerivativeIds, _derivativeId);
    }
    
    function _removeFromActiveCds(uint256 _cdsId) internal {
        _removeFromArray(activeCdsIds, _cdsId);
    }
    
    function _removeFromActiveStructuredProducts(uint256 _productId) internal {
        _removeFromArray(activeStructuredProductIds, _productId);
    }
    
    // Receive function for native token settlements
    receive() external payable {}
}
