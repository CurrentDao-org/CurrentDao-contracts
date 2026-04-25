// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../structures/DerivativesStructs.sol";

/**
 * @title IEnergyDerivativesSuite
 * @notice Interface for comprehensive energy derivatives suite
 * @dev Defines all functions for swaps, forwards, structured products, and advanced derivatives
 */
interface IEnergyDerivativesSuite {
    
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
    ) external returns (uint256 swapId);
    
    function executeEnergySwap(uint256 _swapId) external returns (bool success);
    
    function terminateEnergySwap(uint256 _swapId) external returns (bool success);
    
    function getEnergySwap(uint256 _swapId) external view returns (DerivativesStructs.EnergySwap memory);
    
    function getActiveSwapsByCommodity(DerivativesStructs.EnergyCommodity _commodity) 
        external view returns (uint256[] memory swapIds);
    
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
    ) external returns (uint256 forwardId);
    
    function confirmEnergyForward(uint256 _forwardId) external returns (bool success);
    
    function executeEnergyForward(uint256 _forwardId) external returns (bool success);
    
    function getEnergyForward(uint256 _forwardId) external view returns (DerivativesStructs.EnergyForward memory);
    
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
    ) external returns (uint256 derivativeId);
    
    function settleWeatherDerivative(uint256 _derivativeId, uint256 _actualWeatherValue) 
        external returns (uint256 payout);
    
    function getWeatherDerivative(uint256 _derivativeId) 
        external view returns (DerivativesStructs.WeatherDerivative memory);
    
    // Credit Default Swaps Functions
    function createCreditDefaultSwap(
        address _protectionBuyer,
        address _protectionSeller,
        address _referenceEntity,
        uint256 _notionalAmount,
        uint256 _spread,
        uint256 _maturityDate,
        uint256 _recoveryRate
    ) external returns (uint256 cdsId);
    
    function triggerCreditEvent(uint256 _cdsId) external returns (bool success);
    
    function settleCreditDefaultSwap(uint256 _cdsId) external returns (uint256 settlementAmount);
    
    function getCreditDefaultSwap(uint256 _cdsId) 
        external view returns (DerivativesStructs.CreditDefaultSwap memory);
    
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
    ) external returns (uint256 productId);
    
    function calculateStructuredProductValue(uint256 _productId) 
        external view returns (uint256 value);
    
    function callStructuredProduct(uint256 _productId) external returns (bool success);
    
    function getStructuredProduct(uint256 _productId) 
        external view returns (DerivativesStructs.StructuredProduct memory);
    
    // Portfolio Management Functions
    function createPortfolio(
        address _owner,
        string memory _name
    ) external returns (uint256 portfolioId);
    
    function addToPortfolio(
        uint256 _portfolioId,
        DerivativesStructs.DerivativeType _derivativeType,
        uint256 _derivativeId
    ) external returns (bool success);
    
    function removeFromPortfolio(
        uint256 _portfolioId,
        DerivativesStructs.DerivativeType _derivativeType,
        uint256 _derivativeId
    ) external returns (bool success);
    
    function getPortfolio(uint256 _portfolioId) 
        external view returns (DerivativesStructs.Portfolio memory);
    
    function optimizePortfolio(uint256 _portfolioId) 
        external returns (bool success, DerivativesStructs.RiskMetrics memory optimizedRisk);
    
    // Risk Analytics Functions
    function calculateRiskMetrics(uint256 _portfolioId) 
        external view returns (DerivativesStructs.RiskMetrics memory riskMetrics);
    
    function calculateValueAtRisk(
        uint256 _portfolioId,
        uint256 _confidenceLevel,
        uint256 _timeHorizon
    ) external view returns (uint256 varAmount);
    
    function calculateExpectedShortfall(
        uint256 _portfolioId,
        uint256 _confidenceLevel
    ) external view returns (uint256 expectedShortfall);
    
    function getGreeks(uint256 _derivativeId) 
        external view returns (uint256 delta, uint256 gamma, uint256 vega, uint256 theta, uint256 rho);
    
    // Clearing and Settlement Functions
    function submitCollateral(
        address _beneficiary,
        uint256 _amount,
        address _tokenAddress,
        uint256 _lockPeriod
    ) external returns (uint256 collateralId);
    
    function releaseCollateral(uint256 _collateralId) external returns (bool success);
    
    function createSettlementInstruction(
        address _payer,
        address _payee,
        uint256 _amount,
        address _tokenAddress,
        uint256 _dueDate,
        DerivativesStructs.SettlementType _settlementType
    ) external returns (uint256 instructionId);
    
    function executeSettlement(uint256 _instructionId) external returns (bool success);
    
    function getCollateral(uint256 _collateralId) 
        external view returns (DerivativesStructs.Collateral memory);
    
    function getSettlementInstruction(uint256 _instructionId) 
        external view returns (DerivativesStructs.SettlementInstruction memory);
    
    // Market Data Functions
    function updateMarketData(
        DerivativesStructs.EnergyCommodity _commodity,
        uint256 _spotPrice,
        uint256 _forwardCurve,
        uint256 _volatility
    ) external returns (bool success);
    
    function getMarketData(DerivativesStructs.EnergyCommodity _commodity) 
        external view returns (DerivativesStructs.MarketData memory);
    
    function getForwardCurve(DerivativesStructs.EnergyCommodity _commodity) 
        external view returns (uint256[] memory curve);
    
    // Counterparty Management Functions
    function updateCounterpartyInfo(
        address _counterparty,
        uint256 _creditLimit,
        uint256 _creditRating
    ) external returns (bool success);
    
    function getCounterpartyInfo(address _counterparty) 
        external view returns (DerivativesStructs.CounterpartyInfo memory);
    
    function checkCreditExposure(address _counterparty) 
        external view returns (uint256 exposure, bool isWithinLimit);
    
    // Insurance Integration Functions
    function createInsurancePolicy(
        address _insured,
        address _insurer,
        uint256 _coverageAmount,
        uint256 _premium,
        uint256 _startDate,
        uint256 _endDate,
        string memory _coverageType
    ) external returns (uint256 policyId);
    
    function claimInsurance(uint256 _policyId, uint256 _claimAmount) 
        external returns (bool success);
    
    function getInsurancePolicy(uint256 _policyId) 
        external view returns (DerivativesStructs.InsurancePolicy memory);
    
    // Position Management Functions
    function openPosition(
        address _owner,
        DerivativesStructs.DerivativeType _derivativeType,
        uint256 _derivativeId,
        DerivativesStructs.PositionType _positionType,
        uint256 _notional,
        uint256 _entryPrice
    ) external returns (uint256 positionId);
    
    function closePosition(uint256 _positionId) external returns (uint256 realizedPnL);
    
    function getPosition(uint256 _positionId) 
        external view returns (DerivativesStructs.DerivativePosition memory);
    
    function getPositionsByOwner(address _owner) 
        external view returns (uint256[] memory positionIds);
    
    // Risk Limit Management Functions
    function setRiskLimit(
        address _entity,
        string memory _limitType,
        uint256 _maxNotional,
        uint256 _maxConcentration,
        uint256 _maxVaR
    ) external returns (uint256 limitId);
    
    function checkRiskLimits(address _entity) 
        external view returns (bool isCompliant, string[] memory breachedLimits);
    
    function getRiskLimit(uint256 _limitId) 
        external view returns (DerivativesStructs.RiskLimit memory);
    
    // Weather Data Functions
    function submitWeatherData(
        DerivativesStructs.WeatherType _weatherType,
        string memory _location,
        uint256 _value,
        uint256 _timestamp
    ) external returns (bool success);
    
    function getWeatherData(
        DerivativesStructs.WeatherType _weatherType,
        string memory _location,
        uint256 _startDate,
        uint256 _endDate
    ) external view returns (DerivativesStructs.WeatherDataPoint[] memory dataPoints);
    
    // Administrative Functions
    function pause() external;
    function unpause() external;
    function setAdministrator(address _administrator) external;
    function getAdministrator() external view returns (address);
    
    // View Functions
    function getTotalNotionalExposure() external view returns (uint256);
    function getTotalActiveContracts() external view returns (uint256);
    function getSystemRiskMetrics() external view returns (DerivativesStructs.RiskMetrics memory);
    
    // Events
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
}
