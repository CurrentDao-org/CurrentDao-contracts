# Energy AMM Architecture

The Energy AMM is a specialized Automated Market Maker designed for the CurrentDao solar energy ecosystem. It implements advanced features to optimize capital efficiency, minimize risk for liquidity providers, and ensure market stability.

## Core Features

### 1. Constant Product Formula
The AMM uses the standard `x * y = k` formula for basic price discovery, ensuring that swaps always have a counterparty while maintaining pool invariant.

### 2. Concentrated Liquidity
Unlike traditional AMMs where liquidity is spread from zero to infinity, the Energy AMM allows LPs to provide liquidity within specific price ranges (ticks). This significantly reduces price impact (by up to 40%) for trades within that range.
- **Tick Space:** Price is mapped to ticks using `price = 1.0001^tick`.
- **Capital Efficiency:** LPs can concentrate their funds where most trading happens.

### 3. Dynamic Fees
Fees are not static. The `DynamicFeeCalculator` monitors market volatility (using Coefficient of Variation) and adjusts fees accordingly:
- **Low Volatility:** Fees approach the base rate (0.3%).
- **High Volatility:** Fees increase (up to 1.0%) to compensate LPs for the higher risk of impermanent loss.

### 4. Security & Protections
- **Oracle-Based Price Feeds:** The AMM integrates with an external oracle. If the internal pool price deviates too far from the oracle (e.g., > 5%), swaps are temporarily disabled to prevent manipulation via flash loans.
- **Flash Loan Protection:** A lock mechanism prevents recursive swaps during a flash loan execution, mitigating "sandwich" attacks and price manipulation exploits.
- **Price Impact Modeling:** Every trade is modeled for slippage, allowing users to set precise tolerance levels.

### 5. LP Incentives & IL Tracking
- **Impermanent Loss Tracking:** The AMM tracks the entry price of every position and calculates real-time IL.
- **Incentives:** Fees collected are dynamically distributed to LPs based on their liquidity concentration and duration.

## Mathematical Library (`AMMLib`)
The system relies on a high-precision mathematical library for:
- Tick-to-price conversions.
- Liquidity-at-range calculations.
- Optimized square root functions for gas efficiency.

## Usage

### Swapping
```typescript
const result = await amm.swap('tokenA', 'tokenB', amountIn, minAmountOut);
```

### Adding Concentrated Liquidity
```typescript
const positionId = await amm.addLiquidity(tokenA, tokenB, amountA, amountB, tickLower, tickUpper);
```
