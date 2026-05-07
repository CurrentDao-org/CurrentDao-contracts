# CurrentDao Carbon Credit Trading Marketplace

A carbon credit trading smart contract built on **Stellar** using **Soroban** (Rust).

## Deployed Contracts (Testnet)

| Contract | Contract ID |
|----------|-------------|
| Carbon Credit Trading | `CBAVRNDLNEJ6DUMWFHUT2RBGQB32DVH7CTUYNKVN75VPR7CNJAWFQU2H` |
| Token (Energy) | `CA6RAANCSJKHS5FROBVZTPGYL3LIFG7ZFDIPYBFQEDKJX3TJYTJNFEG3` |
| DAO | `CC4RK4GSE7VWLCFJCFN6NEFKRJO77ITDPD7DPZFCUUNY64HA3VOUK7UA` |
| Staking | `CCE2KAT2Y46G33PX5XHRKZGILA6IIZWCW2WX7FOC6PCOUDERXAJQEDLP` |
| Escrow | `CC3MAEGQOAF77XAYSCG7GBYF4SG4BR7W2O5PEXITFHJAAJMY2R5DW64M` |
| Oracles | `CBRAD72TB5WUBMPBQ2DFMF4EPNAJGVHX2K3KZEHEU6SFLJALPXZFNKIX` |
| Liquidity | `CAT7FQ6GFZGPHUIBYERWIMJOIIBQY4IF5MS2BO4W7ILIWBYML3HV7YOK` |
| Fees | `CDSQDHBZMHSIEXMTRFBU7Z3CP2D3OEDJG257IFJAPMRKEUB5AVKVQN62` |
| Settlement | `CA6BFRCWVHIWW44DTNBB27KQSOAA3QSFMVMBNJDAIXDHXMJZRJVUUHKG` |
| Certificates | `CDVZC2RHDSPMF56EFUVRJSLUOIZANWVVJ2QHJLJRQMATGEIWCR3XM3LW` |
| Compliance | `CD3K2QBDBZFOGVYZ6UKJ3MW7XUC63X6YZG3BKFMI3IJ4DUXZEXXILDTX` |
| Proposals | `CANYIFDDDDTHY56I3JIGZ3EKTROAEDHKXBI55SVEII734EAJKQXQW2M33` |
| NFT | `CD3CFGKJVDJRWIK6ZY7NOUL7W7FUCZFZWPA5VONEN3M2MSDON3YFBZUB` |
| Reporting | `CCXPEP22QM5OM7JJDUZSSGV2YFPIMEZZICU5Y27ROX44NQVI64BU4QSY` |

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
