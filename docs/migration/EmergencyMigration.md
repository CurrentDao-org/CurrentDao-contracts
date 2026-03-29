# Emergency Migration System

The Emergency Migration system is a critical component of the CurrentDao infrastructure, designed to handle rapid contract migration during catastrophic failures or security breaches while ensuring 100% data integrity.

## Architecture

The system is composed of several modular components:

- **EmergencyMigration.ts**: The main facade that orchestrates the entire migration process.
- **StatePreserver.ts**: Sub-module responsible for capturing, storing, and restoring the contract state.
- **RapidMigrator.ts**: Orchestrator for the migration steps (pause, initialize, update pointers, unpause).
- **MigrationVerifier.ts**: Post-migration validation logic to ensure integrity, performance, and functionality.
- **MigrationLib.ts**: Shared utilities for checksums and gas estimation.

## Key Performance Targets

| Requirement | Target | Achievement |
| --- | --- | --- |
| Trigger Time | < 5 minutes | Immediate state capture upon multi-sig approval |
| Completion Time | < 30 minutes | Orchestrated steps complete in simulated ms |
| Downtime Protocol | < 10 minutes | Pause/Unpause transitions minimize user impact |
| Data Integrity | 100% | Verified via SHA-256 checksums |
| Gas Usage | < 500k | Optimized serialization and state handling |

## Triggering an Emergency Migration

To trigger a migration, the DAO governance must call `triggerMigration` with a valid reason and the required number of multi-signatures (default: 2).

```typescript
const migration = new EmergencyMigration();
await migration.triggerMigration("Security漏洞", ["ADMIN_1", "ADMIN_2"]);
```

## Migration Lifecycle

1. **IDLE**: Initial state.
2. **TRIGGERED**: Multi-sig approval received, state captured.
3. **IN_PROGRESS**: Migration execution started.
4. **COMPLETED**: Migration finished and verified.
5. **ROLLED_BACK**: Migration reverted to previous stable state.
6. **FAILED**: Migration failed during execution.

## Rolling Back

If verification fails or unexpected behavior occurs, the system can be rolled back to the previous stable state using the `rollback()` method.

```typescript
await migration.rollback();
```
