# Implementation Plan: Dynamic Fee Switching

## Overview

Incrementally implement the Dynamic Fee Switching system by updating existing stubs to match the design spec, then wiring all components together through the `DynamicFeeSwitch` facade. Each task builds on the previous, ending with full integration and test coverage.

## Tasks

- [x] 1. Update `IDynamicFeeSwitch` interface and shared types
  - Replace the existing interface in `contracts/fees/interfaces/IDynamicFeeSwitch.ts` with the updated signature from the design: `calculateDynamicFee(userAddress, transactionVolume)`, `updateNetworkConditions(conditions)`, `triggerEmergencyMode(isEmergency, safeFeeBps)`
  - Export `NetworkConditions`, `UserMetrics`, `FeeTier`, `EmergencyModeEvent`, `DistributionRecord`, and `Recipient` types from the same file
  - _Requirements: 7.1, 7.4_

- [x] 2. Implement `FeeSwitchLib` pure functions
  - [x] 2.1 Rewrite `contracts/fees/libraries/FeeSwitchLib.ts` to operate in basis points (bps) instead of decimals
    - `calculateBaseFee(volume): number` — returns bps, decreases monotonically across volume brackets
    - `applyCongestionMultiplier(baseFee, congestion): number` — congestion is 0–100; max 50% increase at congestion=100
    - `applyUserDiscount(fee, activityScore): number` — activityScore is 0–100; max 20% discount at score=100
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 2.2 Write property test for `calculateBaseFee` monotonicity
    - **Property 6: Base fee decreases monotonically with volume**
    - **Validates: Requirements 6.1**
    - File: `tests/fees/FeeSwitchLib.test.ts`

  - [ ]* 2.3 Write property test for `applyCongestionMultiplier` bounds
    - **Property 2: Congestion multiplier is bounded**
    - **Property 3: Zero congestion is identity**
    - **Validates: Requirements 1.2, 6.2, 6.5**
    - File: `tests/fees/FeeSwitchLib.test.ts`

  - [ ]* 2.4 Write property test for `applyUserDiscount` identity at zero
    - **Property 4: Zero activity score is identity**
    - **Validates: Requirements 1.3, 6.3**
    - File: `tests/fees/FeeSwitchLib.test.ts`

- [x] 3. Implement `NetworkMonitor`
  - [x] 3.1 Rewrite `contracts/fees/monitoring/NetworkMonitor.ts` to match the design spec
    - `updateCongestion(level: number, averageBlockTime: number): void` — validates `level` in [0, 100] (throw `RangeError` otherwise) and `averageBlockTime > 0` (throw `RangeError` otherwise); stores both values and timestamp
    - `getCongestion(): number`, `getAverageBlockTime(): number`, `isUpdateStale(): boolean` (threshold: 30 000 ms)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 Write property test for valid conditions acceptance
    - **Property 11: Valid network conditions are accepted**
    - **Validates: Requirements 2.1, 2.3**
    - File: `tests/fees/NetworkMonitor.test.ts`

  - [ ]* 3.3 Write property test for invalid congestion rejection
    - **Property 12: Invalid congestion is rejected**
    - **Validates: Requirements 2.2**
    - File: `tests/fees/NetworkMonitor.test.ts`

  - [ ]* 3.4 Write unit tests for staleness detection
    - **Property 13: Staleness detection**
    - Test boundary at exactly 30 000 ms
    - **Validates: Requirements 2.4, 2.5**
    - File: `tests/fees/NetworkMonitor.test.ts`

- [x] 4. Checkpoint — ensure all tests pass so far
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `FeeDistributor`
  - [x] 5.1 Rewrite `contracts/fees/distribution/FeeDistributor.ts` to support configurable recipients
    - Add `configure(recipients: Recipient[]): void` — validates sum of `allocationBps` equals 10 000, throws `ValidationError` otherwise
    - Rewrite `distribute(amount: number): void` — validates `amount > 0`, splits by allocation, records a `DistributionRecord` with per-recipient amounts and timestamp
    - Keep `getTreasuryBalance()` and `getRewardsPoolBalance()` working against the new per-recipient balance map
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 5.2 Write property test for distribution allocation invariant
    - **Property 9: Distribution allocation invariant**
    - **Validates: Requirements 5.2**
    - File: `tests/fees/FeeDistributor.test.ts`

  - [ ]* 5.3 Write property test for distribution amount round-trip
    - **Property 10: Distribution amount round-trip**
    - **Validates: Requirements 5.1, 5.4**
    - File: `tests/fees/FeeDistributor.test.ts`

  - [ ]* 5.4 Write unit tests for `FeeDistributor` error conditions
    - Test `configure` rejection when allocations don't sum to 10 000
    - Test `distribute` rejection when `amount <= 0`
    - _Requirements: 5.2, 5.3_
    - File: `tests/fees/FeeDistributor.test.ts`

- [x] 6. Implement `FeeOptimizer`
  - [x] 6.1 Update `contracts/fees/optimization/FeeOptimizer.ts` to accept congestion as 0–100 (matching updated `FeeSwitchLib`) and return a bps value
    - `static optimize(volume: number, congestion: number, userActivity: number): number`
    - _Requirements: 6.4_

  - [ ]* 6.2 Write property test for fee pipeline composition
    - **Property 5: Fee pipeline composition stays in bounds**
    - **Validates: Requirements 6.4**
    - File: `tests/fees/FeeSwitchLib.test.ts`

- [x] 7. Implement `DynamicFeeSwitch`
  - [x] 7.1 Rewrite `contracts/fees/DynamicFeeSwitch.ts` to implement the updated `IDynamicFeeSwitch`
    - Constructor accepts a `FeeTier[]` sorted by volume threshold; validates each tier (`minFeeBps <= baseFeeBps <= maxFeeBps`, throws `ValidationError` on violation)
    - `calculateDynamicFee(userAddress, transactionVolume)` — validates non-empty `userAddress` and `transactionVolume > 0`; returns `safeFeeBps` immediately when in emergency mode; otherwise selects tier, calls `FeeOptimizer.optimize`, clamps result to `[minFeeBps, maxFeeBps]`; logs warning when conditions are stale
    - `updateNetworkConditions(conditions)` — validates `congestionLevel` in [0, 100] and `averageBlockTime > 0`, delegates to `NetworkMonitor`
    - `triggerEmergencyMode(isEmergency, safeFeeBps)` — validates `safeFeeBps > 0` when activating; sets state; emits `EmergencyModeEvent`
    - `distributeFees(amount)` — delegates to `FeeDistributor`
    - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3_

  - [ ]* 7.2 Write property test for fee within tier bounds
    - **Property 1: Fee stays within tier bounds**
    - **Validates: Requirements 1.1, 3.5**
    - File: `tests/fees/DynamicFeeSwitch.test.ts`

  - [ ]* 7.3 Write property test for emergency mode safe fee
    - **Property 7: Emergency mode returns safe fee for all inputs**
    - **Validates: Requirements 4.1, 4.2**
    - File: `tests/fees/DynamicFeeSwitch.test.ts`

  - [ ]* 7.4 Write property test for emergency mode round-trip
    - **Property 8: Emergency mode round-trip restores normal calculation**
    - **Validates: Requirements 4.3**
    - File: `tests/fees/DynamicFeeSwitch.test.ts`

  - [ ]* 7.5 Write unit tests for `DynamicFeeSwitch` error conditions and events
    - Test `ValidationError` for empty `userAddress`, `transactionVolume <= 0`, `safeFeeBps = 0` on emergency activation
    - Test `ValidationError` for invalid `FeeTier` configurations
    - Test `EmergencyModeEvent` emission on mode change
    - Test stale-conditions warning path
    - _Requirements: 4.4, 4.5, 7.2, 7.3_
    - File: `tests/fees/DynamicFeeSwitch.test.ts`

- [x] 8. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add `FeeManager` backward compatibility
  - Update `contracts/fees/FeeManager.ts` to forward `NetworkCongestionData` from `setNetworkCongestionLevel` to `DynamicFeeSwitch.updateNetworkConditions`
  - _Requirements: 7.5_

- [x] 10. Wire everything together and create deploy script
  - [x] 10.1 Create `scripts/deploy_dynamic_fees.ts`
    - Instantiate `FeeDistributor`, configure default recipients (treasury + rewards pool summing to 10 000 bps)
    - Instantiate `DynamicFeeSwitch` with default `FeeTier[]`
    - Wire `FeeManager` to forward congestion updates to `DynamicFeeSwitch`
    - _Requirements: 3.1, 5.2_

  - [ ]* 10.2 Write integration tests for end-to-end fee calculation flow
    - Test full path: `updateNetworkConditions` → `calculateDynamicFee` → `distributeFees`
    - Test `FeeManager` forwarding path
    - _Requirements: 1.1, 5.1, 7.5_
    - File: `tests/fees/DynamicFeeSwitch.test.ts`

- [x] 11. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use **fast-check** with a minimum of 100 iterations per run
- Each property test is tagged with `// Feature: dynamic-fee-switching, Property N: <text>`
- All fee values are in basis points (bps) throughout; 10 000 bps = 100%
- Existing files are stubs that need to be rewritten to match the design spec
