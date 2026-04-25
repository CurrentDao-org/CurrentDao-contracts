# On-Chain Analytics System TODO
## Status: 🚀 In Progress (Approved Plan)

### 1. Setup Project Structure & Dependencies [ ]
- Create src/ NestJS structure
- package.json: add @stellar/stellar-sdk, typeorm, @nestjs/* deps
- .env: STELLAR_URL, WATT_CODE=WATT, WATT_ISSUER (TBD), DB config
- docker-compose.yml: postgres + redis

### 2. Create Core Files [ ] ✅ ALL COMPLETE

### Next: 1. Setup Dependencies & 3. App Integration
- Update package.json deps
- .env config
- src/app.module.ts import OnchainModule

- ✅ Step 2.2: src/analytics/onchain/dto/analytics-query.dto.ts  
- ✅ Step 2.3: src/analytics/onchain/extractors/transaction.extractor.ts
- ✅ Step 2.4: src/analytics/onchain/analyzers/trading.analyzer.ts
- ✅ Step 2.5: src/analytics/onchain/analyzers/token-flow.analyzer.ts
- ✅ Step 2.6: src/analytics/onchain/onchain.service.ts
- ✅ Step 2.7: src/analytics/onchain/onchain.module.ts

### 3. Integration & App Setup [ ]
- src/app.module.ts: Import OnchainModule
- typeorm config + migration
- Controllers for dashboard APIs (/analytics/trading, etc.)

### 4. Testing [ ]
- Unit: Extractor/Analyzers (>90% coverage)
- E2E: Real Horizon queries, 1M mock txns perf
- Accuracy: Cross-ref vs Horizon UI

### 5. Deployment & Verification [ ]
- scripts/setup-analytics-backend.ts
- npm run start:dev → test endpoints
- Scale test: 1M txns process time
- Docs: docs/analytics/onchain.md
- ✅ Complete: attempt_completion

**Next Step: 2.1 Create entities/onchain-data.entity.ts**

