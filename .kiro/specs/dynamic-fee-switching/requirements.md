# Requirements Document

## Introduction

The Dynamic Fee Switching Contract is a smart contract system that adjusts transaction fees in real time based on network conditions, user behavior, and configurable fee tiers. It replaces static fee models with a responsive mechanism that balances protocol revenue, user fairness, and network stability. The system monitors congestion levels, applies per-user volume discounts, enforces fee tier boundaries, and provides an emergency mode that locks fees to a safe value during adverse conditions.

The feature integrates with the existing `FeeManager`, `NetworkMonitor`, `FeeOptimizer`, and `FeeSwitchLib` components already present in the codebase, and introduces a unified `DynamicFeeSwitch` contract as the primary entry point for fee calculation and lifecycle management.

---

## Glossary

- **DynamicFeeSwitch**: The primary contract that orchestrates dynamic fee calculation, network monitoring, and emergency controls.
- **NetworkMonitor**: The component responsible for tracking and reporting current network congestion levels and block timing.
- **FeeOptimizer**: The component that applies congestion multipliers and user discounts to produce a final fee value.
- **FeeSwitchLib**: The library containing pure fee calculation functions (base fee, congestion multiplier, user discount).
- **FeeDistributor**: The component that splits collected fees among treasury, validators, and other recipients according to configured distribution rules.
- **FeeTier**: A named bracket defined by a base fee, minimum fee, and maximum fee expressed in basis points (bps), applied based on transaction volume.
- **NetworkConditions**: A snapshot of the network state including congestion level (0–100), last-updated timestamp, and average block time.
- **UserMetrics**: A record of a user's 30-day trade volume and interaction score used to compute loyalty discounts.
- **EmergencyMode**: A contract state in which all fee calculations are bypassed and a fixed safe fee value is returned.
- **Basis Points (bps)**: A unit equal to 1/100th of a percent; 10 000 bps = 100%.
- **Congestion Level**: An integer from 0 (no congestion) to 100 (maximum congestion) representing current network load.
- **Interaction Score**: An integer from 0 to 100 representing a user's historical engagement with the protocol, used to compute loyalty discounts.
- **Staleness Threshold**: The maximum age (in seconds) of a NetworkConditions update before it is considered stale.

---

## Requirements

### Requirement 1: Dynamic Fee Calculation

**User Story:** As a protocol user, I want transaction fees to reflect current network conditions and my usage history, so that I pay fair fees that scale with actual costs.

#### Acceptance Criteria

1. WHEN `calculateDynamicFee` is called with a valid `userAddress` and `transactionVolume`, THE DynamicFeeSwitch SHALL return a fee value in basis points within the active FeeTier's `minFeeBps` and `maxFeeBps` bounds.
2. WHEN the network congestion level increases by 10 points, THE FeeOptimizer SHALL increase the calculated fee by at most 5% of the base fee per 10-point increment.
3. WHEN a user's `interactionScore` is greater than 0, THE FeeOptimizer SHALL apply a discount of up to 20% of the pre-discount fee, proportional to the score on a 0–100 scale.
4. WHEN a user's `tradeVolume30d` exceeds a configured volume threshold, THE DynamicFeeSwitch SHALL apply the corresponding volume discount tier before returning the final fee.
5. WHEN `calculateDynamicFee` is called and the stored NetworkConditions are stale, THE DynamicFeeSwitch SHALL log a warning and proceed with the last known congestion value.

---

### Requirement 2: Network Conditions Management

**User Story:** As a protocol operator, I want to push updated network conditions into the contract, so that fee calculations remain accurate as the network state changes.

#### Acceptance Criteria

1. WHEN `updateNetworkConditions` is called with a `NetworkConditions` object whose `congestionLevel` is between 0 and 100 inclusive, THE DynamicFeeSwitch SHALL store the new conditions and update the last-updated timestamp.
2. IF `updateNetworkConditions` is called with a `congestionLevel` outside the range 0–100, THEN THE DynamicFeeSwitch SHALL reject the update and return a descriptive error.
3. WHEN `updateNetworkConditions` is called with a valid `averageBlockTime` greater than 0, THE NetworkMonitor SHALL store the block time for use in staleness detection.
4. THE NetworkMonitor SHALL expose the current congestion level and a boolean indicating whether the stored conditions exceed the configured Staleness Threshold.
5. WHEN the stored NetworkConditions age exceeds 30 seconds, THE NetworkMonitor SHALL report the conditions as stale.

---

### Requirement 3: Fee Tier Configuration

**User Story:** As a protocol administrator, I want to define fee tiers with minimum, base, and maximum fee values, so that fees stay within acceptable bounds for each transaction category.

#### Acceptance Criteria

1. THE DynamicFeeSwitch SHALL support configuration of at least one FeeTier containing `baseFeeBps`, `minFeeBps`, and `maxFeeBps` values.
2. WHEN a FeeTier is configured with `minFeeBps` greater than `maxFeeBps`, THE DynamicFeeSwitch SHALL reject the configuration and return a descriptive error.
3. WHEN a FeeTier is configured with `baseFeeBps` outside the range `[minFeeBps, maxFeeBps]`, THE DynamicFeeSwitch SHALL reject the configuration and return a descriptive error.
4. WHEN multiple FeeTiers are configured, THE DynamicFeeSwitch SHALL select the applicable tier based on the transaction volume provided to `calculateDynamicFee`.
5. THE DynamicFeeSwitch SHALL enforce that the final calculated fee never falls below `minFeeBps` and never exceeds `maxFeeBps` of the active FeeTier.

---

### Requirement 4: Emergency Mode

**User Story:** As a protocol operator, I want to activate an emergency mode that freezes fees at a safe value, so that users are protected during network anomalies or contract exploits.

#### Acceptance Criteria

1. WHEN `triggerEmergencyMode` is called with `isEmergency` set to `true` and a valid `safeFeeBps` value, THE DynamicFeeSwitch SHALL enter EmergencyMode and store the `safeFeeBps` value.
2. WHILE the DynamicFeeSwitch is in EmergencyMode, THE DynamicFeeSwitch SHALL return `safeFeeBps` for every call to `calculateDynamicFee`, bypassing all dynamic calculations.
3. WHEN `triggerEmergencyMode` is called with `isEmergency` set to `false`, THE DynamicFeeSwitch SHALL exit EmergencyMode and resume normal dynamic fee calculation.
4. IF `triggerEmergencyMode` is called with a `safeFeeBps` value of 0 while `isEmergency` is `true`, THEN THE DynamicFeeSwitch SHALL reject the call and return a descriptive error.
5. WHEN EmergencyMode is activated or deactivated, THE DynamicFeeSwitch SHALL emit an event recording the new mode state, the `safeFeeBps` value, and the timestamp.

---

### Requirement 5: Fee Distribution

**User Story:** As a protocol stakeholder, I want collected fees to be automatically split among treasury, validators, and reward pools according to configured percentages, so that revenue is allocated without manual intervention.

#### Acceptance Criteria

1. WHEN `FeeDistributor.distribute` is called with a fee amount greater than 0, THE FeeDistributor SHALL split the amount among all configured recipients according to their basis-point allocations.
2. THE FeeDistributor SHALL enforce that the sum of all recipient allocations equals 10 000 bps (100%) before accepting a distribution configuration.
3. IF `FeeDistributor.distribute` is called with a fee amount of 0 or less, THEN THE FeeDistributor SHALL reject the call and return a descriptive error.
4. WHEN a distribution is executed, THE FeeDistributor SHALL record the distributed amounts per recipient and the timestamp for auditability.
5. THE FeeDistributor SHALL expose the current treasury balance and rewards pool balance for external queries.

---

### Requirement 6: Fee Calculation Library Correctness

**User Story:** As a developer, I want the fee calculation library functions to be deterministic and composable, so that I can reason about and test fee outcomes reliably.

#### Acceptance Criteria

1. THE FeeSwitchLib SHALL calculate a base fee in basis points that decreases monotonically as transaction volume increases across defined volume brackets.
2. WHEN `applyCongestionMultiplier` is called with a congestion value of 0, THE FeeSwitchLib SHALL return the base fee unchanged.
3. WHEN `applyUserDiscount` is called with an `activityScore` of 0, THE FeeSwitchLib SHALL return the fee unchanged.
4. FOR ALL valid inputs, applying `calculateBaseFee` then `applyCongestionMultiplier` then `applyUserDiscount` SHALL produce a result within the active FeeTier bounds (round-trip composition property).
5. WHEN `applyCongestionMultiplier` is called with a congestion value of 100, THE FeeSwitchLib SHALL return a fee no greater than 150% of the input base fee.

---

### Requirement 7: Interface Compliance

**User Story:** As a developer integrating the DynamicFeeSwitch, I want the contract to implement a stable interface, so that I can depend on a consistent API across upgrades.

#### Acceptance Criteria

1. THE DynamicFeeSwitch SHALL implement the `IDynamicFeeSwitch` interface, exposing `calculateDynamicFee`, `updateNetworkConditions`, and `triggerEmergencyMode`.
2. WHEN `calculateDynamicFee` is called with a `userAddress` that is an empty string, THE DynamicFeeSwitch SHALL reject the call and return a descriptive error.
3. WHEN `calculateDynamicFee` is called with a `transactionVolume` less than or equal to 0, THE DynamicFeeSwitch SHALL reject the call and return a descriptive error.
4. THE IDynamicFeeSwitch interface SHALL define `NetworkConditions`, `UserMetrics`, and `FeeTier` as exported types available to all consumers.
5. THE DynamicFeeSwitch SHALL remain backward compatible with the existing `FeeManager` by accepting `NetworkCongestionData` updates forwarded from `FeeManager.setNetworkCongestionLevel`.
