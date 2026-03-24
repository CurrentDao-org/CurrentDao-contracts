# Dynamic Fee Switch

This module implements dynamic fee switching for trading, optimizing revenue and user experience by automatically adjusting fees based on real-time factors.

## Components

- **NetworkMonitor**: Updates network congestion every 30 seconds.
- **FeeSwitchLib**: Provides pure functions for tier-based calculation, congestion multiplier, and user discounts.
- **FeeOptimizer**: Uses the library to compute the optimal fee taking all factors into account.
- **FeeDistributor**: Fairness in distribution between treasury and reward pools.
- **DynamicFeeSwitch**: The main entry point acting as a facade for the system, also providing emergency controls.

## Features

- **Dynamic Calculation**: Under 50k gas operations (optimized pure formulas).
- **Volume Tiers**: High volume enjoys lower base fees.
- **Behavior Analysis**: Very active users get discounts up to 20%.
- **Emergency Stops**: Prevents system manipulation in crisis.
