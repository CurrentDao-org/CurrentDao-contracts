// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../structures/DerivativesStructs.sol";

/**
 * @title DerivativesLib
 * @notice Library for derivatives calculations and utilities
 * @dev Provides mathematical functions for pricing, risk metrics, and settlement calculations
 */
library DerivativesLib {
    
    // Constants for calculations
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 31536000;
    uint256 private constant PRECISION = 1e18;
    
    // Black-Scholes Option Pricing
    function blackScholesPrice(
        uint256 _spotPrice,
        uint256 _strikePrice,
        uint256 _timeToExpiry,
        uint256 _riskFreeRate,
        uint256 _volatility,
        bool _isCall
    ) internal pure returns (uint256 price) {
        if (_timeToExpiry == 0) {
            return _isCall ? 
                (_spotPrice > _strikePrice ? _spotPrice - _strikePrice : 0) :
                (_strikePrice > _spotPrice ? _strikePrice - _spotPrice : 0);
        }
        
        uint256 d1 = calculateD1(_spotPrice, _strikePrice, _timeToExpiry, _riskFreeRate, _volatility);
        uint256 d2 = calculateD2(d1, _volatility, _timeToExpiry);
        
        if (_isCall) {
            price = (_spotPrice * normalCDF(d1) - _strikePrice * 
                    exp(-_riskFreeRate * _timeToExpiry) * normalCDF(d2)) / PRECISION;
        } else {
            price = (_strikePrice * exp(-_riskFreeRate * _timeToExpiry) * 
                    normalCDF(-d2) - _spotPrice * normalCDF(-d1)) / PRECISION;
        }
    }
    
    // Calculate D1 for Black-Scholes
    function calculateD1(
        uint256 _spotPrice,
        uint256 _strikePrice,
        uint256 _timeToExpiry,
        uint256 _riskFreeRate,
        uint256 _volatility
    ) internal pure returns (uint256 d1) {
        uint256 numerator = ln(_spotPrice / _strikePrice) + 
                           (_riskFreeRate + _volatility * _volatility / 2) * _timeToExpiry;
        uint256 denominator = _volatility * sqrt(_timeToExpiry);
        d1 = numerator / denominator;
    }
    
    // Calculate D2 for Black-Scholes
    function calculateD2(uint256 _d1, uint256 _volatility, uint256 _timeToExpiry) 
        internal pure returns (uint256 d2) {
        d2 = _d1 - _volatility * sqrt(_timeToExpiry);
    }
    
    // Normal Distribution CDF approximation
    function normalCDF(uint256 _x) internal pure returns (uint256 result) {
        uint256 t = 1 / (1 + 2316419 * _x / 1000000);
        uint256 d = 3989423 * exp(-_x * _x / 2) / 1000000;
        uint256 prob = d * (t * (319381530 + t * (-356563782 + t * 
                    (181788177 + t * (-115884739 + t * 314337137))))) / 100000000;
        result = 1 - prob;
        if (_x >= 0) {
            result = prob;
        }
    }
    
    // Value at Risk Calculation (Historical Simulation)
    function calculateVaR(
        uint256[] memory _returns,
        uint256 _portfolioValue,
        uint256 _confidenceLevel
    ) internal pure returns (uint256 varAmount) {
        uint256[] memory sortedReturns = sortArray(_returns);
        uint256 index = (_returns.length * (100 - _confidenceLevel)) / 100;
        uint256 worstReturn = sortedReturns[index];
        varAmount = (_portfolioValue * worstReturn) / PRECISION;
    }
    
    // Expected Shortfall Calculation
    function calculateExpectedShortfall(
        uint256[] memory _returns,
        uint256 _portfolioValue,
        uint256 _confidenceLevel
    ) internal pure returns (uint256 expectedShortfall) {
        uint256[] memory sortedReturns = sortArray(_returns);
        uint256 cutoffIndex = (_returns.length * (100 - _confidenceLevel)) / 100;
        uint256 sum = 0;
        
        for (uint256 i = 0; i < cutoffIndex; i++) {
            sum += sortedReturns[i];
        }
        
        uint256 averageReturn = sum / cutoffIndex;
        expectedShortfall = (_portfolioValue * averageReturn) / PRECISION;
    }
    
    // Greeks Calculation
    function calculateDelta(
        uint256 _spotPrice,
        uint256 _strikePrice,
        uint256 _timeToExpiry,
        uint256 _riskFreeRate,
        uint256 _volatility,
        bool _isCall
    ) internal pure returns (uint256 delta) {
        uint256 d1 = calculateD1(_spotPrice, _strikePrice, _timeToExpiry, _riskFreeRate, _volatility);
        delta = _isCall ? normalCDF(d1) : normalCDF(d1) - 1;
    }
    
    function calculateGamma(
        uint256 _spotPrice,
        uint256 _strikePrice,
        uint256 _timeToExpiry,
        uint256 _riskFreeRate,
        uint256 _volatility
    ) internal pure returns (uint256 gamma) {
        uint256 d1 = calculateD1(_spotPrice, _strikePrice, _timeToExpiry, _riskFreeRate, _volatility);
        uint256 phi = normalPDF(d1);
        gamma = (phi * PRECISION) / (_spotPrice * _volatility * sqrt(_timeToExpiry));
    }
    
    function calculateVega(
        uint256 _spotPrice,
        uint256 _strikePrice,
        uint256 _timeToExpiry,
        uint256 _riskFreeRate,
        uint256 _volatility
    ) internal pure returns (uint256 vega) {
        uint256 d1 = calculateD1(_spotPrice, _strikePrice, _timeToExpiry, _riskFreeRate, _volatility);
        uint256 phi = normalPDF(d1);
        vega = (_spotPrice * phi * sqrt(_timeToExpiry)) / PRECISION;
    }
    
    function calculateTheta(
        uint256 _spotPrice,
        uint256 _strikePrice,
        uint256 _timeToExpiry,
        uint256 _riskFreeRate,
        uint256 _volatility,
        bool _isCall
    ) internal pure returns (uint256 theta) {
        uint256 d1 = calculateD1(_spotPrice, _strikePrice, _timeToExpiry, _riskFreeRate, _volatility);
        uint256 d2 = calculateD2(d1, _volatility, _timeToExpiry);
        uint256 phi = normalPDF(d1);
        uint256 firstTerm = -(_spotPrice * phi * _volatility) / (2 * sqrt(_timeToExpiry) * PRECISION);
        uint256 secondTerm;
        
        if (_isCall) {
            secondTerm = -_riskFreeRate * _strikePrice * exp(-_riskFreeRate * _timeToExpiry) * 
                        normalCDF(d2) / PRECISION;
        } else {
            secondTerm = _riskFreeRate * _strikePrice * exp(-_riskFreeRate * _timeToExpiry)) * 
                        normalCDF(-d2) / PRECISION;
        }
        
        theta = firstTerm + secondTerm;
    }
    
    function calculateRho(
        uint256 _spotPrice,
        uint256 _strikePrice,
        uint256 _timeToExpiry,
        uint256 _riskFreeRate,
        uint256 _volatility,
        bool _isCall
    ) internal pure returns (uint256 rho) {
        uint256 d2 = calculateD2(calculateD1(_spotPrice, _strikePrice, _timeToExpiry, 
                                             _riskFreeRate, _volatility), _volatility, _timeToExpiry);
        
        if (_isCall) {
            rho = _strikePrice * _timeToExpiry * exp(-_riskFreeRate * _timeToExpiry) * 
                  normalCDF(d2) / PRECISION;
        } else {
            rho = -_strikePrice * _timeToExpiry * exp(-_riskFreeRate * _timeToExpiry) * 
                  normalCDF(-d2) / PRECISION;
        }
    }
    
    // Swap Pricing
    function calculateSwapValue(
        uint256 _notionalAmount,
        uint256 _fixedRate,
        uint256 _floatingRate,
        uint256 _timeToMaturity,
        uint256 _discountFactor
    ) internal pure returns (int256 swapValue) {
        uint256 fixedLegValue = (_notionalAmount * _fixedRate * _timeToMaturity) / PRECISION;
        uint256 floatingLegValue = (_notionalAmount * _floatingRate * _timeToMaturity) / PRECISION;
        
        fixedLegValue = (fixedLegValue * _discountFactor) / PRECISION;
        floatingLegValue = (floatingLegValue * _discountFactor) / PRECISION;
        
        swapValue = int256(floatingLegValue) - int256(fixedLegValue);
    }
    
    // Forward Pricing
    function calculateForwardPrice(
        uint256 _spotPrice,
        uint256 _riskFreeRate,
        uint256 _timeToMaturity,
        uint256 _convenienceYield,
        uint256 _storageCost
    ) internal pure returns (uint256 forwardPrice) {
        uint256 costOfCarry = _riskFreeRate + _storageCost - _convenienceYield;
        forwardPrice = _spotPrice * exp(costOfCarry * _timeToMaturity) / PRECISION;
    }
    
    // Weather Derivative Payout Calculation
    function calculateWeatherPayout(
        uint256 _strikeLevel,
        uint256 _actualValue,
        uint256 _payoutPerUnit,
        uint256 _notionalAmount
    ) internal pure returns (uint256 payout) {
        if (_actualValue > _strikeLevel) {
            uint256 difference = _actualValue - _strikeLevel;
            payout = (difference * _payoutPerUnit) / PRECISION;
            payout = payout > _notionalAmount ? _notionalAmount : payout;
        } else {
            payout = 0;
        }
    }
    
    // Credit Default Swap Payout
    function calculateCDSPayout(
        uint256 _notionalAmount,
        uint256 _recoveryRate
    ) internal pure returns (uint256 payout) {
        payout = (_notionalAmount * (PRECISION - _recoveryRate)) / PRECISION;
    }
    
    // Structured Product Valuation
    function calculateStructuredProductValue(
        uint256[] memory _underlyingValues,
        uint256[] memory _weights,
        uint256 _notionalAmount
    ) internal pure returns (uint256 productValue) {
        require(_underlyingValues.length == _weights.length, "Array length mismatch");
        
        uint256 weightedSum = 0;
        for (uint256 i = 0; i < _underlyingValues.length; i++) {
            weightedSum += (_underlyingValues[i] * _weights[i]) / PRECISION;
        }
        
        productValue = (_notionalAmount * weightedSum) / PRECISION;
    }
    
    // Portfolio Risk Metrics
    function calculatePortfolioRiskMetrics(
        uint256[] memory _positions,
        uint256[] memory _weights,
        uint256[][] memory _correlationMatrix
    ) internal pure returns (DerivativesStructs.RiskMetrics memory riskMetrics) {
        uint256 portfolioVariance = 0;
        uint256 n = _positions.length;
        
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = 0; j < n; j++) {
                portfolioVariance += (_weights[i] * _weights[j] * _correlationMatrix[i][j]) / PRECISION;
            }
        }
        
        riskMetrics.volatility = sqrt(portfolioVariance);
        riskMetrics.valueAtRisk = calculateVaR(_positions, 0, 95); // Simplified
        riskMetrics.expectedShortfall = calculateExpectedShortfall(_positions, 0, 95); // Simplified
    }
    
    // Mathematical Utilities
    function ln(uint256 _x) internal pure returns (uint256 r) {
        require(_x > 0, "Natural log of zero");
        assembly {
            r := log(_x, 2.718281828459045235360287471352662498)
        }
    }
    
    function exp(uint256 _x) internal pure returns (uint256 r) {
        assembly {
            r := exp(_x)
        }
    }
    
    function sqrt(uint256 _x) internal pure returns (uint256 y) {
        if (_x == 0) return 0;
        uint256 z = (_x + 1) / 2;
        y = _x;
        while (z < y) {
            y = z;
            z = (_x / z + z) / 2;
        }
    }
    
    function normalPDF(uint256 _x) internal pure returns (uint256 result) {
        uint256 exponent = -(_x * _x) / 2;
        result = exp(exponent) * 398942280401432677939946059934; // 1/sqrt(2π) * 1e18
    }
    
    function sortArray(uint256[] memory _array) internal pure returns (uint256[] memory sorted) {
        sorted = new uint256[](_array.length);
        for (uint256 i = 0; i < _array.length; i++) {
            sorted[i] = _array[i];
        }
        
        for (uint256 i = 0; i < sorted.length - 1; i++) {
            for (uint256 j = i + 1; j < sorted.length; j++) {
                if (sorted[i] > sorted[j]) {
                    uint256 temp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = temp;
                }
            }
        }
    }
    
    // Date/Time Utilities
    function daysToSeconds(uint256 _days) internal pure returns (uint256 seconds) {
        seconds = _days * 86400;
    }
    
    function yearsToSeconds(uint256 _years) internal pure returns (uint256 seconds) {
        seconds = _years * SECONDS_PER_YEAR;
    }
    
    function calculateDayCount(uint256 _startDate, uint256 _endDate) 
        internal pure returns (uint256 dayCount) {
        require(_endDate > _startDate, "End date must be after start date");
        dayCount = (_endDate - _startDate) / 86400;
    }
    
    // Interest Rate Calculations
    function calculateDiscountFactor(uint256 _rate, uint256 _time) 
        internal pure returns (uint256 discountFactor) {
        discountFactor = exp(-_rate * _time / PRECISION);
    }
    
    function calculateForwardRate(
        uint256 _spotRate1,
        uint256 _time1,
        uint256 _spotRate2,
        uint256 _time2
    ) internal pure returns (uint256 forwardRate) {
        require(_time2 > _time1, "Time 2 must be greater than time 1");
        uint256 df1 = calculateDiscountFactor(_spotRate1, _time1);
        uint256 df2 = calculateDiscountFactor(_spotRate2, _time2);
        forwardRate = (ln(df1 / df2) * PRECISION) / (_time2 - _time1);
    }
    
    // Validation Functions
    function validateSwapParameters(
        uint256 _notionalAmount,
        uint256 _fixedRate,
        uint256 _startDate,
        uint256 _maturityDate
    ) internal pure returns (bool isValid) {
        isValid = (_notionalAmount > 0 && 
                  _fixedRate > 0 && 
                  _maturityDate > _startDate &&
                  _maturityDate > block.timestamp);
    }
    
    function validateForwardParameters(
        uint256 _quantity,
        uint256 _strikePrice,
        uint256 _deliveryDate
    ) internal pure returns (bool isValid) {
        isValid = (_quantity > 0 && 
                  _strikePrice > 0 && 
                  _deliveryDate > block.timestamp);
    }
    
    function validateWeatherDerivativeParameters(
        uint256 _strikeLevel,
        uint256 _payoutPerUnit,
        uint256 _startDate,
        uint256 _endDate
    ) internal pure returns (bool isValid) {
        isValid = (_strikeLevel > 0 && 
                  _payoutPerUnit > 0 && 
                  _endDate > _startDate &&
                  _startDate > block.timestamp);
    }
}
