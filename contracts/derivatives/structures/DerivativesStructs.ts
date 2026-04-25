// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DerivativesStructs
 * @notice Core data structures for energy derivatives suite
 * @dev Contains all structs used across the derivatives ecosystem
 */
library DerivativesStructs {
    
    // Energy Commodity Types (20+ supported)
    enum EnergyCommodity {
        CRUDE_OIL_WTI, CRUDE_OIL_BRENT, NATURAL_GAS, GASOLINE, DIESEL,
        HEATING_OIL, JET_FUEL, ETHANOL, BIODIESEL, LNG,
        COAL, URANIUM, ELECTRICITY, CARBON_CREDITS, RENEWABLE_ENERGY_CREDITS,
        HYDROGEN, AMMONIA, METHANOL, PROPANE, BUTANE,
        NAPHTHA, FUEL_OIL, KEROSENE, LPG, NGL
    }
    
    // Derivative Types
    enum DerivativeType {
        SWAP, FORWARD, FUTURE, OPTION, WEATHER_DERIVATIVE,
        CREDIT_DEFAULT_SWAP, STRUCTURED_PRODUCT, COLLATERALIZED_DEBT_OBLIGATION
    }
    
    // Weather Derivative Types
    enum WeatherType {
        TEMPERATURE, PRECIPITATION, WIND_SPEED, SOLAR_IRRADIANCE, HUMIDITY
    }
    
    // Position Types
    enum PositionType {
        LONG, SHORT, NEUTRAL
    }
    
    // Settlement Types
    enum SettlementType {
        CASH, PHYSICAL, NETTING, BILATERAL
    }
    
    // Risk Metrics
    struct RiskMetrics {
        uint256 valueAtRisk;
        uint256 expectedShortfall;
        uint256 delta;
        uint256 gamma;
        uint256 vega;
        uint256 theta;
        uint256 rho;
        uint256 volatility;
        uint256 correlation;
        uint256 concentration;
    }
    
    // Energy Swap Structure
    struct EnergySwap {
        uint256 swapId;
        address initiator;
        address counterparty;
        EnergyCommodity commodity;
        uint256 notionalAmount;
        uint256 fixedRate;
        uint256 floatingRate;
        uint256 startDate;
        uint256 maturityDate;
        SettlementType settlementType;
        bool isActive;
        uint256 createdAt;
    }
    
    // Energy Forward Structure
    struct EnergyForward {
        uint256 forwardId;
        address buyer;
        address seller;
        EnergyCommodity commodity;
        uint256 quantity;
        uint256 strikePrice;
        uint256 deliveryDate;
        uint256 deliveryLocation;
        SettlementType settlementType;
        bool isConfirmed;
        uint256 createdAt;
    }
    
    // Weather Derivative Structure
    struct WeatherDerivative {
        uint256 derivativeId;
        address buyer;
        address seller;
        WeatherType weatherType;
        string location; // Geographic location code
        uint256 startDate;
        uint256 endDate;
        uint256 strikeLevel;
        uint256 payoutPerUnit;
        uint256 notionalAmount;
        bool isActive;
        uint256 createdAt;
    }
    
    // Credit Default Swap Structure
    struct CreditDefaultSwap {
        uint256 cdsId;
        address protectionBuyer;
        address protectionSeller;
        address referenceEntity;
        uint256 notionalAmount;
        uint256 spread;
        uint256 maturityDate;
        uint256 recoveryRate;
        bool isActive;
        uint256 createdAt;
    }
    
    // Structured Product Structure
    struct StructuredProduct {
        uint256 productId;
        address issuer;
        address holder;
        string productName;
        DerivativeType[] underlyingTypes;
        uint256[] weights;
        uint256 notionalAmount;
        uint256 maturityDate;
        bool isCallable;
        uint256 callPrice;
        bool isActive;
        uint256 createdAt;
    }
    
    // Portfolio Structure
    struct Portfolio {
        uint256 portfolioId;
        address owner;
        string name;
        uint256[] swapIds;
        uint256[] forwardIds;
        uint256[] weatherDerivativeIds;
        uint256[] cdsIds;
        uint256[] structuredProductIds;
        uint256 totalValue;
        uint256 totalNotional;
        RiskMetrics riskMetrics;
        uint256 lastUpdated;
    }
    
    // Collateral Structure
    struct Collateral {
        uint256 collateralId;
        address provider;
        address beneficiary;
        uint256 amount;
        address tokenAddress;
        uint256 lockPeriod;
        bool isLocked;
        uint256 createdAt;
    }
    
    // Clearing Member Structure
    struct ClearingMember {
        address memberAddress;
        uint256 marginRequirement;
        uint256 postedCollateral;
        uint256 netPosition;
        bool isDefaulted;
        uint256 lastMarginCall;
    }
    
    // Settlement Instruction
    struct SettlementInstruction {
        uint256 instructionId;
        address payer;
        address payee;
        uint256 amount;
        address tokenAddress;
        uint256 dueDate;
        SettlementType settlementType;
        bool isExecuted;
        uint256 executedAt;
    }
    
    // Weather Data Point
    struct WeatherDataPoint {
        uint256 timestamp;
        WeatherType weatherType;
        string location;
        uint256 value;
        bool isVerified;
    }
    
    // Market Data
    struct MarketData {
        EnergyCommodity commodity;
        uint256 spotPrice;
        uint256 forwardCurve;
        uint256 volatility;
        uint256 timestamp;
        bool isActive;
    }
    
    // Counterparty Information
    struct CounterpartyInfo {
        address counterparty;
        uint256 creditLimit;
        uint256 currentExposure;
        uint256 collateralPosted;
        uint256 collateralReceived;
        uint256 creditRating;
        bool isDefaulted;
        uint256 lastUpdated;
    }
    
    // Derivative Position
    struct DerivativePosition {
        uint256 positionId;
        address owner;
        DerivativeType derivativeType;
        uint256 derivativeId;
        PositionType positionType;
        uint256 notional;
        uint256 entryPrice;
        uint256 currentPrice;
        uint256 unrealizedPnL;
        uint256 realizedPnL;
        uint256 openTimestamp;
        bool isOpen;
    }
    
    // Risk Limit Structure
    struct RiskLimit {
        uint256 limitId;
        address entity;
        string limitType;
        uint256 maxNotional;
        uint256 maxConcentration;
        uint256 maxVaR;
        uint256 currentUtilization;
        bool isActive;
        uint256 lastUpdated;
    }
    
    // Insurance Integration Structure
    struct InsurancePolicy {
        uint256 policyId;
        address insured;
        address insurer;
        uint256 coverageAmount;
        uint256 premium;
        uint256 startDate;
        uint256 endDate;
        string coverageType;
        bool isActive;
        uint256 createdAt;
    }
    
    // Events Structure for Logging
    event DerivativeCreated(
        uint256 indexed derivativeId,
        DerivativeType derivativeType,
        address indexed creator,
        uint256 timestamp
    );
    
    event TradeExecuted(
        uint256 indexed derivativeId,
        address indexed counterparty1,
        address indexed counterparty2,
        uint256 amount,
        uint256 timestamp
    );
    
    event SettlementCompleted(
        uint256 indexed derivativeId,
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );
    
    event MarginCall(
        address indexed member,
        uint256 requiredAmount,
        uint256 deadline,
        uint256 timestamp
    );
    
    event DefaultEvent(
        address indexed counterparty,
        uint256 defaultedAmount,
        uint256 timestamp
    );
}
