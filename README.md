# CurrentDao Carbon Credit Trading Marketplace

A carbon credit trading smart contract built on **Stellar** using **Soroban** (Rust).

## Deployed Contract

| Network | Contract ID |
|---------|-------------|
| Testnet | `CBAVRNDLNEJ6DUMWFHUT2RBGQB32DVH7CTUYNKVN75VPR7CNJAWFQU2H` |

- [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBAVRNDLNEJ6DUMWFHUT2RBGQB32DVH7CTUYNKVN75VPR7CNJAWFQU2H)
- [View on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CBAVRNDLNEJ6DUMWFHUT2RBGQB32DVH7CTUYNKVN75VPR7CNJAWFQU2H)

## Features

- **Credit Issuance** — Issue verified carbon credits with project metadata
- **Verification** — Authorized verifiers validate credits with confidence scores
- **Trading** — Place and fill buy/sell orders with fee calculation
- **Batch Trading** — Fill multiple orders in a single transaction
- **Retirement** — Retire credits and receive on-chain certificates
- **Impact Metrics** — Track CO2 equivalent, trees preserved, water saved, biodiversity index
- **Standards** — VCS, Gold Standard, CDM, Carbon Registry
- **Admin Controls** — Manage verifiers, standards, and trading fees

## Contract Architecture

```
contracts/carbon/
├── Cargo.toml
└── src/
    └── lib.rs        # Soroban smart contract (Rust)
```

## Installation

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none

# Install Stellar CLI
curl -fsSL https://github.com/stellar/stellar-cli/releases/download/v26.0.0/stellar-cli-26.0.0-x86_64-unknown-linux-gnu.tar.gz | tar -xz
mv stellar ~/.local/bin/
```

## Build

```bash
stellar contract build --package carbon-credit-trading
```

## Deploy

```bash
# Generate and fund a keypair
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet

# Deploy
stellar contract deploy \
  --wasm target/wasm32v1-none/release/carbon_credit_trading.wasm \
  --source deployer \
  --network testnet

# Initialize
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_ADDRESS>
```

## Usage

### Issue a Credit

```bash
stellar contract invoke --id <CONTRACT_ID> --source deployer --network testnet \
  -- issue_credit \
  --issuer <ADDRESS> \
  --project_id "PROJ001" \
  --amount 1000 \
  --vintage 1704067200 \
  --standard "VCS" \
  --methodology "Forestry" \
  --metadata_uri "https://api.currentdao.io/metadata/1"
```

### Verify a Credit

```bash
stellar contract invoke --id <CONTRACT_ID> --source verifier --network testnet \
  -- verify_credit \
  --verifier <ADDRESS> \
  --credit_id 1 \
  --is_valid true \
  --report_uri "https://api.currentdao.io/reports/1" \
  --confidence 95
```

### Place a Buy Order

```bash
stellar contract invoke --id <CONTRACT_ID> --source trader --network testnet \
  -- place_buy_order \
  --trader <ADDRESS> \
  --credit_id 1 \
  --amount 100 \
  --price 100 \
  --expires_at 0
```

### Retire a Credit

```bash
stellar contract invoke --id <CONTRACT_ID> --source holder --network testnet \
  -- retire_credit \
  --retiree <ADDRESS> \
  --credit_id 1 \
  --amount 50 \
  --reason "Carbon offset for Q1 2025"
```

## Contract Functions

| Function | Description |
|----------|-------------|
| `initialize` | Set up contract with admin |
| `issue_credit` | Issue a new carbon credit |
| `verify_credit` | Verify a credit (verifiers only) |
| `retire_credit` | Retire credits, returns certificate ID |
| `place_buy_order` | Place a buy order |
| `place_sell_order` | Place a sell order |
| `fill_order` | Fill an existing order |
| `batch_fill_orders` | Fill multiple orders at once |
| `cancel_order` | Cancel an active order |
| `update_impact_metrics` | Update environmental impact data |
| `add_verifier` | Add authorized verifier (admin) |
| `set_trading_fee` | Set fee in basis points (admin) |
| `get_credit` | Get credit details |
| `get_spot_price` | Get current spot price for a credit |
| `get_balance` | Get account balance for a credit |

## Environmental Standards Supported

- VCS (Verified Carbon Standard)
- Gold Standard
- CDM (Clean Development Mechanism)
- Carbon Registry

## License

MIT
