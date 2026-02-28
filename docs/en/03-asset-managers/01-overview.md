---
title: Asset Manager Overview
order: 1
---

# Asset Manager Overview

As an Asset Manager in the T3tris protocol, you are responsible for managing the capital deposited by Liquidity Providers. You control the vault's lifecycle, run settlements, manage fees, configure silos, and report NAV.

## Your Role

The asset manager is one of the two primary privileged roles in a T3tris vault (the other being the vault admin/governance admin). You are responsible for:

1. **Managing capital** — Deploy LP capital into strategies when the vault is closed
2. **Reporting NAV** — Update the oracle with the current total asset value
3. **Running settlements** — Process pending deposit and redemption requests
4. **Operating the vault lifecycle** — Open and close the vault as needed
5. **Managing fees** — Claim accumulated fees and distribute to the fee recipient
6. **Managing silos** — Configure silo strategies for yield generation on idle assets

## Vault Lifecycle

A T3tris vault alternates between two operational modes:

```
    ┌──────────────────────────────────────────────────────────┐
    │                                                          │
    │    ┌─────────┐                         ┌─────────┐       │
    │    │ CLOSED  │──── open() ────────────▶│  OPEN   │       │
    │    │ (Async) │                         │ (Sync)  │       │
    │    │         │◀─── close() ───────────│         │       │
    │    └─────────┘                         └─────────┘       │
    │         │                                                │
    │         ├── requestDeposit()                              │
    │         ├── requestRedeem()                               │
    │         ├── settle()                                      │
    │         ├── setTotalAssets()                              │
    │         └── claimFees()                                  │
    │                                                          │
    │    ┌──────────────────────────────────────────────────┐   │
    │    │               End of Fund (EOF)                  │   │
    │    │  Vault is open, but deposits are disabled.       │   │
    │    │  Used for orderly fund wind-down.                │   │
    │    └──────────────────────────────────────────────────┘   │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
```

### Typical Operating Cycle

1. **Vault starts closed** — LPs submit async deposit/redeem requests
2. **You manage capital off-chain** — Deploy assets into strategies
3. **Periodically update NAV** — Report total assets via the oracle
4. **Run settlements** — Process pending requests (mint/burn shares, transfer assets)
5. **Optionally open the vault** — Enable instant sync deposits/withdrawals
6. **Close the vault** — Return to async mode for the next cycle

## Key Addresses

As an asset manager, several addresses are relevant:

| Address             | Role                                                  | Configured By    |
| ------------------- | ----------------------------------------------------- | ---------------- |
| **Asset Manager**   | Receives assets on settlement, returns assets on open | Vault admin      |
| **Fee Recipient**   | Receives claimed fee shares/assets                    | Governance admin |
| **T3tris Treasury** | Receives silo yield profits                           | Governance admin |
| **Oracle**          | Reports NAV for settlement calculations               | Vault admin      |

Check current configuration:

```solidity
address am = IVault(vault).getAssetManager();
address fr = IVault(vault).getFeeRecipient();
address treasury = IVault(vault).getT3treasury();
IOracle oracle = IVault(vault).getOracle();
```

## Required Permissions

To operate a vault, you need specific roles. The most common roles for an asset manager are:

| Role                       | Permission                                   |
| -------------------------- | -------------------------------------------- |
| `SETTLE_ROLE`              | Run full settlement (deposits + redemptions) |
| `SETTLE_DEPOSITS_ROLE`     | Settle deposits only                         |
| `SETTLE_REDEMPTIONS_ROLE`  | Settle redemptions only                      |
| `OPEN_ROLE`                | Open the vault (transition to sync mode)     |
| `CLOSE_ROLE`               | Close the vault (transition to async mode)   |
| `UPDATE_ACCRUED_FEES_ROLE` | Update accrued management/performance fees   |
| `CLAIM_FEES_ROLE`          | Claim accumulated fee shares                 |
| `ENABLE_END_OF_FUND_ROLE`  | Enable End of Fund mode                      |
| `DISABLE_END_OF_FUND_ROLE` | Disable End of Fund mode                     |

These roles are granted by the vault admin (`DEFAULT_ADMIN_ROLE`) during vault setup.
