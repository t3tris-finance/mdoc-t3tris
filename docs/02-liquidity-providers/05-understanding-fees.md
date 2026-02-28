---
title: Understanding Fees
order: 5
---

# Understanding Fees

T3tris vaults can charge up to four types of fees, all configurable by the vault operator. Not all vaults charge every fee — check the vault's fee parameters before depositing.

## Fee Types Overview

| Fee                 | When Applied                             | What It Charges                | Range             |
| ------------------- | ---------------------------------------- | ------------------------------ | ----------------- |
| **Entry Fee**       | On deposit (at settlement for async)     | Percentage of deposited assets | 0–100%            |
| **Exit Fee**        | On redemption (at settlement for async)  | Percentage of redeemed shares  | 0–100%            |
| **Management Fee**  | Accrued over time, applied at settlement | Percentage of AUM per period   | 0–100% per period |
| **Performance Fee** | When PPS exceeds high-water mark         | Percentage of profit above HWM | 0–100%            |

All fees are expressed in **basis points (bps)**, where `10,000 bps = 100%`. A fee of `200 bps = 2%`.

## Entry Fee

The entry fee is a one-time charge applied when you deposit assets.

**Calculation:**

```
fee = depositedAssets × entryFeeBps / 10,000
netDeposit = depositedAssets - fee
sharesReceived = netDeposit / PPS
```

**Example:**

- Deposit: 10,000 USDC
- Entry fee: 50 bps (0.5%)
- Fee: 10,000 × 50 / 10,000 = 50 USDC
- Net deposit: 9,950 USDC
- At PPS of 1.0: you receive 9,950 shares

## Exit Fee

The exit fee is applied when you redeem shares for assets.

**Calculation:**

```
feeShares = redeemedShares × exitFeeBps / 10,000
netShares = redeemedShares - feeShares
assetsReceived = netShares × PPS
```

**Example:**

- Redeem: 1,000 shares
- Exit fee: 100 bps (1%)
- Fee shares: 1,000 × 100 / 10,000 = 10 shares
- Net redemption: 990 shares
- At PPS of 1.05: you receive 990 × 1.05 = 1,039.50 USDC

## Management Fee

The management fee is a time-proportional charge on the vault's net asset value (NAV). It accrues continuously and is calculated at each settlement.

**Calculation:**

```
feeAssets = totalNetAssets × managementFeeBps × timeElapsed
            / (10,000 × managementFeeDays × 1 day)

feeShares = feeAssets × totalNetSupply / totalNetAssets
```

**Key points:**

- `managementFeeDays` defines the period (e.g., 365 = annual fee)
- The fee is pro-rated based on actual elapsed time since last settlement
- Fee is minted as new shares, diluting existing holders proportionally
- Fee shares go to the fee recipient (or accumulate as unclaimed)

**Example:**

- NAV: 1,000,000 USDC
- Management fee: 200 bps (2%)
- Period: 365 days (annual)
- Time since last settlement: 30 days
- Fee = 1,000,000 × 200 × 30 / (10,000 × 365) = 1,643.84 USDC

## Performance Fee

The performance fee is charged on profits **above the high-water mark (HWM)**. The HWM is the highest PPS ever recorded at settlement time.

**Calculation:**

```
currentPPS = totalNetAssets × BPS_DIVISOR / totalNetSupply
profit = (currentPPS - ppsHighWaterMark) × totalNetSupply / BPS_DIVISOR
performanceFee = profit × perfFeeBps / 10,000
```

**How the HWM works:**

1. At vault creation, HWM = initial PPS
2. At each settlement, if current PPS > HWM:
   - Performance fee is charged on the difference
   - HWM is updated to the new PPS
3. If current PPS ≤ HWM: no performance fee is charged (the manager must recover losses before earning performance fees)

**Example:**

- HWM: 1.0000
- Current PPS: 1.0500 (5% gain)
- Total supply: 100,000 shares
- Performance fee: 2,000 bps (20%)
- Profit: (1.05 - 1.00) × 100,000 / 1 = 5,000 USDC
- Fee: 5,000 × 2,000 / 10,000 = 1,000 USDC
- New HWM: 1.0500

## Fee Distribution

Fees are minted as vault shares and can be distributed in three ways, controlled by the asset manager's settlement strategy:

| Strategy       | Behavior                            | Impact on LPs                                     |
| -------------- | ----------------------------------- | ------------------------------------------------- |
| **NO_CLAIM**   | Fees accumulate as unclaimed shares | No immediate dilution beyond share minting        |
| **SOFT_CLAIM** | Fees claimed from deposit flow only | No additional capital needed from asset manager   |
| **FULL_CLAIM** | All accumulated fees distributed    | Asset manager may need to send additional capital |

As an LP, the fee impact is the same regardless of claim strategy — fees are always minted as new shares, which dilutes your percentage ownership proportionally.

## Checking Current Fees

```solidity
// Current fee rates
uint16 entryFee = IVault(vault).getEntryFeeBps();
uint16 exitFee = IVault(vault).getExitFeeBps();
uint16 perfFee = IVault(vault).getPerfFeeBps();
uint16 mgmtFee = IVault(vault).getManagementFeeBps();
uint32 mgmtDays = IVault(vault).getManagementFeeDays();

// Since fee changes apply at the next settlement,
// you can also check pending fee updates
uint16 nextEntryFee = IVault(vault).getNextEntryFeeBps();
uint16 nextExitFee = IVault(vault).getNextExitFeeBps();
uint16 nextPerfFee = IVault(vault).getNextPerfFeeBps();
uint16 nextMgmtFee = IVault(vault).getNextManagementFeeBps();

// Check if a fee change is pending
bool entryPending = IVault(vault).getIsNextEntryFeePending();
bool exitPending = IVault(vault).getIsNextExitFeePending();
// etc.
```

## Silo Yield and the T3tris Treasury

While your assets are pending in the deposit or redeem silo, they may generate yield through the silo's underlying strategy (e.g., deposited in AAVE). However, **silo yield does not accrue to LPs** — it goes to the T3tris protocol treasury.

This means:

- You don't earn extra yield while waiting for settlement
- You also don't bear additional risk from silo strategies
- Your deposit/redemption amount remains exactly as requested

The silo yield model funds the T3tris protocol's operations without directly affecting LP returns.
