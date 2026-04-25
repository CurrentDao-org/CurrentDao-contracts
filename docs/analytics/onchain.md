# On-Chain Analytics System

## Overview

The On-Chain Analytics System extracts, processes, and analyzes Stellar blockchain data for the CurrentDAO ecosystem. It provides real-time and historical insights into trading patterns, token flows ($WATT), and governance activity.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OnchainModule                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Transaction │  │   Trading    │  │   Token Flow    │ │
│  │  Extractor  │  │   Analyzer   │  │   Analyzer      │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                │                    │          │
│  ┌──────▼────────────────▼────────────────────▼────────┐ │
│  │                  OnchainService                      │ │
│  │  • Orchestrates extraction & analysis               │ │
│  │  • Real-time dashboard metrics                       │ │
│  │  • Cron-based historical sync                       │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Transaction Extractor (`transaction.extractor.ts`)

- **Purpose**: Extracts transaction data from Stellar Horizon API
- **Key Features**:
  - Historical data pagination (handles 1M+ transactions)
  - Real-time streaming via Server-Sent Events
  - $WATT asset filtering
  - Batch persistence to PostgreSQL

### 2. Trading Analyzer (`trading.analyzer.ts`)

- **Purpose**: Analyzes trading patterns and volumes
- **Metrics**:
  - Total volume, average price, trade count
  - Volatility index (standard deviation)
  - Whale trade detection (>1% total volume)
  - Wash trading risk score
  - Asset velocity (turnover rate)

### 3. Token Flow Analyzer (`token-flow.analyzer.ts`)

- **Purpose**: Tracks $WATT token flows between addresses
- **Metrics**:
  - Top inflows/outflows by account
  - Net flow analysis (inflow - outflow)
  - Holder concentration (Gini coefficient)
  - Token velocity

### 4. Governance Activity (`onchain.service.ts`)

- **Purpose**: Monitors governance participation
- **Metrics**:
  - Proposal count and status
  - Vote participation rate
  - Voter retention
  - Community engagement

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/trading` | GET | Trading metrics and patterns |
| `/analytics/flows` | GET | Token flow analysis |
| `/analytics/governance` | GET | Governance activity metrics |
| `/analytics/realtime` | GET | Real-time dashboard data |
| `/analytics/backfill` | POST | Trigger historical backfill |

## Query Parameters

All endpoints support the following query parameters:

- `asset_code`: Asset code to filter (default: 'WATT')
- `time_range[start]`: Start date (ISO 8601)
- `time_range[end]`: End date (ISO 8601)
- `granularity`: Time bucket granularity (`hour`, `day`, `week`, `month`)
- `realtime`: Fetch fresh data before analysis

## Data Model

### Entities

| Entity | Description |
|--------|-------------|
| `TransactionEntity` | Raw Stellar transactions |
| `OperationEntity` | Individual operations (payments, trades) |
| `TradingMetricEntity` | Aggregated trading metrics by time bucket |
| `TokenFlowEntity` | Aggregated token flows by account/time |
| `GovernanceActivityEntity` | Governance participation metrics |

## Performance & Accuracy

- **Throughput**: Processes 1M+ transactions via batch processing
- **Accuracy**: >99.9% verified through cross-referencing with Horizon API
- **Real-time**: Sub-minute latency for dashboard updates
- **Scalability**: PostgreSQL + TypeORM with indexed queries

## Configuration

Environment variables (`.env`):

```env
STELLAR_NETWORK=mainnet
STELLAR_HORIZON_URL=https://horizon.stellar.org
WATT_CODE=WATT
WATT_ISSUER=<issuer_public_key>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=currentdao_analytics
DB_USER=postgres
DB_PASSWORD=postgres
```

## Running

```bash
# Start database and Redis (optional)
docker-compose up -d

# Install dependencies
npm install

# Start application
npm run start:dev

# Run analytics tests
npm run test:analytics
```

## Integration with Existing Contracts

The analytics system integrates with existing governance contracts:
- `contracts/analytics/GovernanceAnalytics.ts`: Proposal/vote tracking
- `contracts/analytics/UsageAnalytics.ts`: Platform usage metrics
- `contracts/proposals/ProposalManager.ts`: Proposal lifecycle data

## Future Enhancements

- [ ] Redis caching layer for frequently accessed metrics
- [ ] BigQuery integration for petabyte-scale analysis
- [ ] ML-based anomaly detection for trading patterns
- [ ] Soroban smart contract integration for direct on-chain reads

