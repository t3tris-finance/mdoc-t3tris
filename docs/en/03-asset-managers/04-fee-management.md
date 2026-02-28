---
title: Fee Management
order: 4
---

# Fee Management

As an asset manager, you have control over fee configuration, accrual, and distribution. This guide covers the practical aspects of managing fees.

## Fee Configuration

### Updating Fee Rates

Fee changes are **deferred** — they don't take effect immediately. Instead, they are applied at the next settlement:

```solidity
// Set new entry fee (applied at next settlement)
IVault(vault).setNextEntryFee(50);  // 50 bps = 0.5%

// Set new exit fee
IVault(vault).setNextExitFee(100);  // 100 bps = 1%

// Set new performance fee
IVault(vault).setNextPerformanceFee(2000);  // 2000 bps = 20%

// Set new management fee (with period in days)
IVault(vault).setNextManagementFee(200, 365);  // 200 bps / 365 days = 2% annual
```

### Required Roles

| Function                | Required Role               |
| ----------------------- | --------------------------- |
| `setNextEntryFee`       | `UPDATE_ENTRY_FEE_BPS_ROLE` |
| `setNextExitFee`        | `UPDATE_EXIT_FEE_BPS_ROLE`  |
| `setNextPerformanceFee` | `UPDATE_PERF_FEE_BPS_ROLE`  |
| `setNextManagementFee`  | `UPDATE_MGMT_FEE_BPS_ROLE`  |

### Checking Pending Fee Changes

```solidity
// Check if a fee change is pending
bool pending = IVault(vault).getIsNextEntryFeePending();

// Read the pending value
uint16 nextEntryFee = IVault(vault).getNextEntryFeeBps();
```

## Fee Accrual

### Management Fee Accrual

Management fees accrue continuously based on time elapsed and current NAV:

```
fee = NAV × managementFeeBps × timeElapsed / (10,000 × managementFeeDays × 1 day)
```

The fee is computed and minted as new shares at each settlement or when `updateAccruedFees()` is called.

### Performance Fee Accrual

Performance fees are only charged when PPS exceeds the high-water mark (HWM):

```
profit = (currentPPS - HWM) × totalNetSupply / BPS_DIVISOR
fee = profit × perfFeeBps / 10,000
```

The HWM ensures the manager only earns performance fees on **new** profits — they must recover any losses before earning performance fees again.

### Updating Fees Without Settlement

```solidity
// Trigger fee accrual without running a full settlement
IVault(vault).updateAccruedFees();
```

This is useful for keeping the NAV accurate between settlements, or before reporting to LPs.

## Fee Distribution

### Claiming Fees

Accumulated fee shares can be claimed at any time:

```solidity
// Check unclaimed fee shares
uint256 unclaimedShares = IVault(vault).getUnclaimedSharesFee();

// Preview the asset value of claiming all fees
uint256 assetValue = IVault(vault).previewMaxClaimFees();

// Preview a specific claim amount
uint256 claimValue = IVault(vault).previewClaimFees(sharesToClaim);

// Claim fees (sends assets to fee recipient)
IVault(vault).claimFees(sharesToClaim);
```

### Claiming Requires

- Role: `CLAIM_FEES_ROLE`
- Vault must have sufficient liquidity to convert shares to assets
- `sharesToClaim` ≤ `unclaimedSharesFee`

### Distribution During Settlement

Fees can also be distributed during settlement via the `FeeClaimType`:

| Strategy     | When to Use                                            |
| ------------ | ------------------------------------------------------ |
| `NO_CLAIM`   | Daily settlements — batch fee claims weekly/monthly    |
| `SOFT_CLAIM` | Regular operations — distribute fees from deposit flow |
| `FULL_CLAIM` | Periodic full settlement — distribute everything       |

See the [Settlement guide](/docs/03-asset-managers/03-settlement) for details.

## Fee Recipient

The fee recipient address receives claimed fees. It's typically a multi-sig wallet or a splitter contract:

```solidity
// Check current fee recipient
address fr = IVault(vault).getFeeRecipient();

// Update fee recipient (requires UPDATE_FEE_RECIPIENT_ROLE)
IVault(vault).setFeeRecipient(newRecipient);
```

> **Note:** `UPDATE_FEE_RECIPIENT_ROLE` is managed by the **Governance Admin**, not the default admin.

## Fee Accounting Example

Here's a complete example of a multi-settlement fee cycle:

```
Week 1 Settlement (NO_CLAIM):
  NAV: $1,000,000 | Mgmt fee (7 days): $383.56 worth of shares
  → unclaimedSharesFee: 383 shares

Week 2 Settlement (NO_CLAIM):
  NAV: $1,050,000 | Mgmt fee (7 days): $402.74 worth of shares
  PPS rose above HWM → Performance fee: $1,000 worth of shares
  → unclaimedSharesFee: 383 + 402 + 1000 = 1,785 shares

Week 3 Settlement (SOFT_CLAIM):
  NAV: $1,100,000 | Mgmt fee: $421.92
  Deposits: $200,000 | Fees in assets: ~$1,893 (from 1,785+421 shares)
  SOFT_CLAIM: distribute $1,893 from $200K deposit flow
  → Fee recipient receives $1,893
  → AM receives $198,107
  → unclaimedSharesFee: 0

Week 4 Settlement (NO_CLAIM):
  → Cycle begins again...
```

## Important Considerations

1. **Fee shares dilute all holders** — When management/performance fees are minted, they dilute all existing shareholders proportionally
2. **HWM persists** — The high-water mark is never reset (except during vault initialization)
3. **Fee changes are deferred** — They apply at the next settlement, not immediately
4. **Management fee period matters** — A 200 bps fee over 365 days ≠ 200 bps over 30 days
5. **Unclaimed fees are stored as shares** — Their asset value fluctuates with PPS
