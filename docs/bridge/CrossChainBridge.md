# Cross-Chain Bridge Architecture

## Overview
The Cross-Chain Bridge system facilitates secure energy asset trading across multiple blockchains (Stellar, Ethereum, Polygon). It features dynamic fees, emergency controls, and multi-chain off-chain validation.

## Components
- **CrossChainBridge.ts**: Core entry point handling lock/release mechanics and liquidity pools.
- **MultiChainValidator.ts**: Verifies relayed signatures and guards against double-spend/replay attacks.
- **BridgeLib.ts**: Core state-less math dealing with fee derivations and slippage checks.

## Flows

### Wrap Asset (Lock on Source → Mint on Target)
1. `User` calls `bridge.wrapAsset(caller, "Polygon", tokenAddr, amount, minOut)`.
2. Bridge computes dynamic fee.
3. Bridge checks `amount - fee >= minOut` (slippage protection).
4. Bridge transfers tokens from `User` to `Admin`.
5. Bridge emits `AssetWrapped` and pushes execution to internal `initiateBridge` hook.

### Unwrap Asset (Burn on Source → Release on Target)
1. Relayer calls `bridge.unwrapAsset(originChain, tokenAddr, amount, user, validationProof)`.
2. Bridge calls `validator.validateProof()` to ensure proof contains adequate valid signatures.
3. Bridge verifies sufficient available liquidity in the token pool.
4. Bridge transfers the underlying localized asset from `Admin` to `User`.

## Security Considerations
- **Replay Attacks**: Prevented by strict nonce mapping coupled to unique transaction hashes generated via `BridgeLib.generateTxHash()`. Hashes are aggressively deduplicated inside the Validator.
- **Liquidity Draining**: Hard caps maintained per-asset. The system restricts withdrawals precisely down to available `balance` counts tracking valid wrap inflows minus unwrap outflows.
- **Pause Capability**: Admin has explicit `pauseBridge` control that freezes `wrapAsset`, `unwrapAsset`, and `finalizeBridge`.
