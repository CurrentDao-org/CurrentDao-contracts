# Advanced MultiSig

`AdvancedMultiSig` extends the baseline DAO multisig with tiered signature rules, workflow-aware approvals, signature analytics, and emergency handling.

## Features

- Hierarchical signature requirements with amount-based tiers (for example `2-of-3` for small transactions and `3-of-5` for large transactions).
- Time-based signature/execution locks through per-stage timelocks and rule-level execution delays.
- Workflow-aware approvals:
  - Sequential workflows (`stage_1` -> `stage_2`).
  - Parallel workflows (multiple stages approved concurrently).
- Signature revocation before execution.
- Batch transaction submission and execution with estimated gas savings.
- Emergency override requests requiring super-majority owner approvals.
- Integration hooks for platform contracts (`Governance`, `FeeManager`, `TimelockController`, etc.).
- Signature analytics with signer-level delay and revocation tracking.

## Contract Layout

- Contract: `contracts/multisig/AdvancedMultiSig.ts`
- Interface: `contracts/multisig/interfaces/IAdvancedMultiSig.ts`
- Structures:
  - `contracts/multisig/structures/WorkflowStructure.ts`
  - `contracts/multisig/structures/SignatureStructure.ts`
- Library: `contracts/multisig/libraries/MultiSigLib.ts`

## Core Flow

1. Submit a transaction using `submitTransaction(...)` or many transactions with `submitBatch(...)`.
2. Confirm approvals with `confirmTransaction(...)`, optionally by stage in workflow mode.
3. Revoke with `revokeSignature(...)` before execution when needed.
4. Execute with `executeTransaction(...)` or `executeBatch(...)` once threshold + workflow + timelock checks pass.
5. If critical recovery is needed, use emergency override:
   - `requestEmergencyOverride(...)`
   - `approveEmergencyOverride(...)`
   - `executeEmergencyOverride(...)` (requires super-majority)

## Risk and Safety Controls

- Tier-based signer eligibility prevents under-secured high-value approvals.
- Workflow stage constraints enforce governance process order and segregation.
- Timelocks prevent rushed approvals/executions.
- Revocation support allows signers to withdraw approvals before execution.
- Emergency actions require super-majority and are auditable through request records.

## Analytics

- `getSignerAnalytics(signer)` exposes:
  - signed count
  - revoked count
  - average signature delay
  - last activity timestamps
- `getSystemAnalytics()` exposes aggregate counters:
  - transaction state totals
  - total signatures/revocations
  - average confirmation delay
  - cumulative batch gas savings

## Deployment

Use the deployment helper:

```bash
ts-node scripts/deploy_advanced_multisig.ts
```

This script seeds:

- 5 owners
- 2-tier signature policy
- A sample sequential workflow
- Default integration hooks for major platform contracts
