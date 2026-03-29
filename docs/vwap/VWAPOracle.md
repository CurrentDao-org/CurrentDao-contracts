# VWAP Oracle

## Overview

The `VWAPOracle` contract provides volume-weighted price discovery for trading pairs using:

- **Standard VWAP formula**: `sum(price * volume) / sum(volume)`
- **Volume tracking** for high-frequency trade ingestion (10,000+ trades/day)
- **Time period management** from **5 minutes to 24 hours**
- **Accuracy monitoring** with target **< 0.5% error (50 bps)**
- **Historical VWAP retention** for **90 days**
- **Volume + trend analytics** for market momentum
- **Market depth integration** (bid/ask imbalance adjustment)

## Architecture

- `contracts/vwap/VWAPOracle.ts`: main orchestrator.
- `contracts/vwap/interfaces/IVWAPOracle.ts`: canonical interfaces and data types.
- `contracts/vwap/libraries/VWAPLib.ts`: formula logic, bounds, and utility calculations.
- `contracts/vwap/volume/VolumeTracker.ts`: trade storage, range queries, and volume metrics.
- `contracts/vwap/analysis/VolumeAnalyzer.ts`: volume trend classification.
- `contracts/vwap/trends/TrendAnalyzer.ts`: momentum and directional trend outputs.

## Core Flows

1. `recordTrade` captures trade price, size, timestamp, and depth.
2. `getVWAP(period)` computes period VWAP, applies depth adjustment, stores historical point.
3. `getAccuracyReport` summarizes error bps against baseline VWAP.
4. `getTrendMetrics` compares short/long VWAP windows to produce momentum.

## Gas and Performance Notes

- The implementation uses linear scans scoped by caller-selected period windows.
- The library enforces a **<40k gas target** design goal for core VWAP math by minimizing nested loops and avoiding extra allocations in critical calculations.
- Historical error arrays are capped for bounded storage growth.

## Operational Targets Mapped to Requirements

- VWAP formula ✅
- 10,000+ daily trades ✅
- 5m–24h period support ✅
- <0.5% error monitoring ✅
- 90-day historical data ✅
- Volume trend and momentum analysis ✅
- Market depth-informed output ✅

