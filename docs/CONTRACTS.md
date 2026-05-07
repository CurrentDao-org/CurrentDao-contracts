# CurrentDao Contracts — Stellar Testnet

All contracts are written in Rust using the [Soroban SDK](https://soroban.stellar.org) and deployed on Stellar testnet.

## Deployed Contracts

| Contract | Contract ID | Explorer |
|----------|-------------|---------|
| Carbon Credit Trading | `CBAVRNDLNEJ6DUMWFHUT2RBGQB32DVH7CTUYNKVN75VPR7CNJAWFQU2H` | [View](https://stellar.expert/explorer/testnet/contract/CBAVRNDLNEJ6DUMWFHUT2RBGQB32DVH7CTUYNKVN75VPR7CNJAWFQU2H) |
| Token (Energy) | `CA6RAANCSJKHS5FROBVZTPGYL3LIFG7ZFDIPYBFQEDKJX3TJYTJNFEG3` | [View](https://stellar.expert/explorer/testnet/contract/CA6RAANCSJKHS5FROBVZTPGYL3LIFG7ZFDIPYBFQEDKJX3TJYTJNFEG3) |
| DAO | `CC4RK4GSE7VWLCFJCFN6NEFKRJO77ITDPD7DPZFCUUNY64HA3VOUK7UA` | [View](https://stellar.expert/explorer/testnet/contract/CC4RK4GSE7VWLCFJCFN6NEFKRJO77ITDPD7DPZFCUUNY64HA3VOUK7UA) |
| Staking | `CCE2KAT2Y46G33PX5XHRKZGILA6IIZWCW2WX7FOC6PCOUDERXAJQEDLP` | [View](https://stellar.expert/explorer/testnet/contract/CCE2KAT2Y46G33PX5XHRKZGILA6IIZWCW2WX7FOC6PCOUDERXAJQEDLP) |
| Escrow | `CC3MAEGQOAF77XAYSCG7GBYF4SG4BR7W2O5PEXITFHJAAJMY2R5DW64M` | [View](https://stellar.expert/explorer/testnet/contract/CC3MAEGQOAF77XAYSCG7GBYF4SG4BR7W2O5PEXITFHJAAJMY2R5DW64M) |
| Oracles | `CBRAD72TB5WUBMPBQ2DFMF4EPNAJGVHX2K3KZEHEU6SFLJALPXZFNKIX` | [View](https://stellar.expert/explorer/testnet/contract/CBRAD72TB5WUBMPBQ2DFMF4EPNAJGVHX2K3KZEHEU6SFLJALPXZFNKIX) |
| Liquidity | `CAT7FQ6GFZGPHUIBYERWIMJOIIBQY4IF5MS2BO4W7ILIWBYML3HV7YOK` | [View](https://stellar.expert/explorer/testnet/contract/CAT7FQ6GFZGPHUIBYERWIMJOIIBQY4IF5MS2BO4W7ILIWBYML3HV7YOK) |
| Fees | `CDSQDHBZMHSIEXMTRFBU7Z3CP2D3OEDJG257IFJAPMRKEUB5AVKVQN62` | [View](https://stellar.expert/explorer/testnet/contract/CDSQDHBZMHSIEXMTRFBU7Z3CP2D3OEDJG257IFJAPMRKEUB5AVKVQN62) |
| Settlement | `CA6BFRCWVHIWW44DTNBB27KQSOAA3QSFMVMBNJDAIXDHXMJZRJVUUHKG` | [View](https://stellar.expert/explorer/testnet/contract/CA6BFRCWVHIWW44DTNBB27KQSOAA3QSFMVMBNJDAIXDHXMJZRJVUUHKG) |
| Certificates | `CDVZC2RHDSPMF56EFUVRJSLUOIZANWVVJ2QHJLJRQMATGEIWCR3XM3LW` | [View](https://stellar.expert/explorer/testnet/contract/CDVZC2RHDSPMF56EFUVRJSLUOIZANWVVJ2QHJLJRQMATGEIWCR3XM3LW) |
| Compliance | `CD3K2QBDBZFOGVYZ6UKJ3MW7XUC63X6YZG3BKFMI3IJ4DUXZEXXILDTX` | [View](https://stellar.expert/explorer/testnet/contract/CD3K2QBDBZFOGVYZ6UKJ3MW7XUC63X6YZG3BKFMI3IJ4DUXZEXXILDTX) |
| Proposals | `CANYIFDDDDTHY56I3JIGZ3EKTROAEDHKXBI55SVEII734EAJKQXQW2M33` | [View](https://stellar.expert/explorer/testnet/contract/CANYIFDDDDTHY56I3JIGZ3EKTROAEDHKXBI55SVEII734EAJKQXQW2M33) |
| NFT | `CD3CFGKJVDJRWIK6ZY7NOUL7W7FUCZFZWPA5VONEN3M2MSDON3YFBZUB` | [View](https://stellar.expert/explorer/testnet/contract/CD3CFGKJVDJRWIK6ZY7NOUL7W7FUCZFZWPA5VONEN3M2MSDON3YFBZUB) |
| Reporting | `CCXPEP22QM5OM7JJDUZSSGV2YFPIMEZZICU5Y27ROX44NQVI64BU4QSY` | [View](https://stellar.expert/explorer/testnet/contract/CCXPEP22QM5OM7JJDUZSSGV2YFPIMEZZICU5Y27ROX44NQVI64BU4QSY) |

---

## Carbon Credit Trading

**Source:** `contracts/carbon/src/lib.rs`

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Set up contract with admin address |
| `issue_credit(issuer, project_id, amount, vintage, standard, methodology, metadata_uri)` | Issue a new carbon credit |
| `verify_credit(verifier, credit_id, is_valid, report_uri, confidence)` | Verify a credit (authorized verifiers only) |
| `retire_credit(retiree, credit_id, amount, reason)` | Retire credits, returns certificate ID |
| `place_buy_order(trader, credit_id, amount, price, expires_at)` | Place a buy order |
| `place_sell_order(trader, credit_id, amount, price, expires_at)` | Place a sell order |
| `fill_order(filler, order_id, fill_amount)` | Fill an existing order |
| `batch_fill_orders(filler, order_ids, amounts)` | Fill multiple orders at once |
| `cancel_order(trader, order_id)` | Cancel an active order |
| `update_impact_metrics(caller, credit_id, ...)` | Update environmental impact data |
| `add_verifier(admin, verifier)` | Add authorized verifier |
| `set_trading_fee(admin, fee_bps)` | Set fee in basis points (max 10%) |
| `get_credit(credit_id)` | Get credit details |
| `get_balance(account, credit_id)` | Get account balance for a credit |
| `get_spot_price(credit_id)` | Get current spot price |
| `get_total_supply()` | Total credits issued |
| `get_retired_supply()` | Total credits retired |
| `get_circulating_supply()` | Total minus retired |

---

## DAO

**Source:** `contracts/dao/src/lib.rs`

Governance contract for on-chain proposals and voting.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize with admin |
| `create_proposal(proposer, title, description, voting_end)` | Create a governance proposal |
| `vote(voter, proposal_id, support)` | Cast a vote |
| `execute_proposal(caller, proposal_id)` | Execute a passed proposal |
| `get_proposal(proposal_id)` | Get proposal details |

---

## Staking

**Source:** `contracts/staking/src/lib.rs`

Stake tokens and earn rewards.

| Function | Description |
|----------|-------------|
| `initialize(admin, reward_rate)` | Initialize staking contract |
| `stake(staker, amount)` | Stake tokens |
| `unstake(staker, amount)` | Unstake tokens |
| `claim_rewards(staker)` | Claim pending rewards |
| `get_stake(staker)` | Get staked balance |
| `get_rewards(staker)` | Get pending rewards |

---

## Escrow

**Source:** `contracts/escrow/src/lib.rs`

Holds funds in escrow pending trade settlement.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize escrow |
| `deposit(depositor, trade_id, amount)` | Deposit funds into escrow |
| `release(admin, trade_id, recipient)` | Release funds to recipient |
| `refund(admin, trade_id)` | Refund depositor |
| `get_escrow(trade_id)` | Get escrow details |

---

## Oracles

**Source:** `contracts/oracles/src/lib.rs`

On-chain price feed oracle.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize oracle |
| `submit_price(oracle, asset, price)` | Submit a price update |
| `get_price(asset)` | Get latest price for an asset |
| `add_oracle(admin, oracle)` | Authorize a price feeder |

---

## Liquidity

**Source:** `contracts/liquidity/src/lib.rs`

Liquidity pool for carbon credit trading pairs.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize pool |
| `add_liquidity(provider, credit_id, amount)` | Add liquidity |
| `remove_liquidity(provider, credit_id, amount)` | Remove liquidity |
| `get_liquidity(credit_id)` | Get pool liquidity |

---

## Fees

**Source:** `contracts/fees/src/lib.rs`

Fee collection and distribution.

| Function | Description |
|----------|-------------|
| `initialize(admin, fee_bps)` | Initialize fee contract |
| `collect_fee(payer, amount)` | Collect a fee |
| `distribute(admin)` | Distribute collected fees |
| `get_collected(asset)` | Get total fees collected |

---

## Settlement

**Source:** `contracts/settlement/src/lib.rs`

Final settlement of trades.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize settlement |
| `settle_trade(settler, trade_id, buyer, seller, amount)` | Settle a trade |
| `get_settlement(trade_id)` | Get settlement record |

---

## Certificates

**Source:** `contracts/certificates/src/lib.rs`

On-chain retirement certificates for carbon credits.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize certificates contract |
| `issue_certificate(issuer, credit_id, retiree, amount, reason)` | Issue a retirement certificate |
| `get_certificate(cert_id)` | Get certificate details |
| `verify_certificate(cert_id)` | Verify a certificate is valid |

---

## Compliance

**Source:** `contracts/compliance/src/lib.rs`

Regulatory compliance checks.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize compliance contract |
| `register_entity(admin, entity, jurisdiction)` | Register a compliant entity |
| `check_compliance(entity)` | Check if entity is compliant |
| `revoke(admin, entity)` | Revoke compliance status |

---

## Proposals

**Source:** `contracts/proposals/src/lib.rs`

Proposal management for the DAO.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize proposals contract |
| `submit(proposer, title, description)` | Submit a proposal |
| `approve(admin, proposal_id)` | Approve a proposal |
| `reject(admin, proposal_id)` | Reject a proposal |
| `get_proposal(proposal_id)` | Get proposal details |

---

## NFT

**Source:** `contracts/nft/src/lib.rs`

NFT representation of carbon credit assets.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize NFT contract |
| `mint(admin, to, credit_id, metadata_uri)` | Mint an NFT for a credit |
| `transfer(from, to, token_id)` | Transfer an NFT |
| `get_token(token_id)` | Get token details |
| `owner_of(token_id)` | Get token owner |

---

## Reporting

**Source:** `contracts/reporting/src/lib.rs`

Regulatory and sustainability reporting.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize reporting contract |
| `submit_report(entity, report_type, data_uri)` | Submit a report |
| `verify_report(admin, report_id)` | Verify a submitted report |
| `get_report(report_id)` | Get report details |

---

## Build & Deploy

```bash
# Build all contracts
stellar contract build

# Deploy a contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/<contract>.wasm \
  --source deployer \
  --network testnet

# Initialize
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize --admin <ADDRESS>
```
