---
title: Settlement
order: 3
---

# Settlement

Settlement is the core operation that processes pending deposit and redemption requests. It calculates fees, mints/burns shares, and transfers assets between the vault, asset manager, fee recipient, and T3tris treasury.

## Settlement Functions

### Full Settlement

Processes both deposits and redemptions in a single transaction:

```solidity
IAsync.SettleResult memory result = IVault(vault).settle(
    IAsync.FeeClaimType feeClaimType,
    bytes memory permit2Data
);
```

### Deposit-Only Settlement

```solidity
IAsync.SettleDepositResult memory result = IVault(vault).settleDeposits(
    IAsync.FeeClaimType feeClaimType
);
```

### Redemption-Only Settlement

```solidity
IAsync.SettleRedemptionsResult memory result = IVault(vault).settleRedemptions(
    bool fullClaim  // true = FULL_CLAIM, false = NO_CLAIM
);
```

## Settlement Flow

### Deposit Settlement

```
1. RETRIEVE PENDING DEPOSITS
   └── Count total assets in deposit requests

2. REDEEM FROM DEPOSIT SILO
   └── Convert silo shares to underlying assets

3. CALCULATE SILO PnL
   ├── If profit: send excess to T3tris treasury
   └── If loss: absorbed (reduces deposited amount)

4. COMPUTE PERIOD FEES
   ├── Management fee (time-proportional)
   └── Performance fee (if PPS > HWM)

5. APPLY ENTRY FEE
   └── Deduct entry fee from deposited assets

6. MINT SHARES
   └── Mint shares at settlement PPS to depositors

7. HANDLE FEE DISTRIBUTION (based on FeeClaimType)
   ├── NO_CLAIM: accumulate fee shares
   ├── SOFT_CLAIM: distribute from deposit flow only
   └── FULL_CLAIM: distribute all accumulated fees

8. TRANSFER ASSETS
   ├── Net deposits → Asset Manager
   ├── Fee claim → Fee Recipient (if applicable)
   └── Silo profit → T3tris Treasury
```

### Redemption Settlement

```
1. CALCULATE SHARES TO REDEEM
   └── Sum pending redemption shares

2. APPLY EXIT FEE
   └── Deduct exit fee shares (kept as fee)

3. CALCULATE REQUIRED ASSETS
   └── Convert net shares to asset amount at current PPS

4. RECEIVE ASSETS
   └── Asset Manager transfers required assets to vault

5. DEPOSIT INTO REDEEM SILO
   └── Assets deposited for user claims

6. BURN SHARES
   └── Burn redeemed shares (minus fee shares)

7. INCREMENT REQUEST ID
   └── Move to next redemption cycle
```

## Fee Claim Types

The `FeeClaimType` enum controls how accumulated fees are handled during settlement:

### `NO_CLAIM` — Maximum Efficiency

```solidity
FeeClaimType.NO_CLAIM
```

- Fees are calculated and minted as shares but **not distributed**
- `unclaimedSharesFee` accumulates
- 100% of net deposits flow to asset manager
- **Best for:** Daily/frequent settlements where fee distribution can be batched

```
Settlement 1: +1,000 shares fee → unclaimed = 1,000
Settlement 2: +800 shares fee  → unclaimed = 1,800
Settlement 3: +1,200 shares fee → unclaimed = 3,000
→ Claim all later via claimFees()
```

### `SOFT_CLAIM` — Opportunistic Distribution

```solidity
FeeClaimType.SOFT_CLAIM
```

- Claims fees **up to** the available deposit assets
- Fee recipient receives assets from the deposit flow
- No additional capital needed from asset manager
- **Best for:** Regular operations with partial fee distribution

```
Deposits: $100,000 | Unclaimed fees: $150,000

With SOFT_CLAIM:
  Fee recipient gets: $100,000 (capped at deposit amount)
  Asset manager gets: $0
  Remaining unclaimed: $50,000 (as shares)
```

### `FULL_CLAIM` — Complete Distribution

```solidity
FeeClaimType.FULL_CLAIM
```

- Distributes **all** accumulated fees
- `unclaimedSharesFee` reset to 0
- If fees exceed deposits, asset manager must send the difference
- **Best for:** Periodic full fee settlement (monthly/quarterly), vault opening/closing

```
Deposits: $100,000 | Unclaimed fees: $150,000

With FULL_CLAIM:
  Fee recipient gets: $150,000
  Asset manager SENDS: $50,000 (covers shortfall)
  Remaining unclaimed: $0
```

## Net Flow Optimization

The protocol calculates net flows to minimize token transfers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NET FLOW CALCULATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AVAILABLE (from deposits):        $100,000                         │
│  REQUIRED OUTFLOWS:                                                 │
│    → Redeem Silo:                  $30,000 (for pending redemptions) │
│    → Fee Recipient:                $5,000 (if claiming fees)        │
│                                                                     │
│  NET = $100K - $30K - $5K = +$65K                                   │
│                                                                     │
│  NET > 0 → Vault sends $65K to Asset Manager                       │
│  NET < 0 → Asset Manager sends shortfall to Vault                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Optimized Transfer Paths

The protocol includes special shortcuts for simple cases:

- **All to AM**: No fees, no redemptions, no treasury profit → Deposit silo redeems directly to Asset Manager (1 transfer)
- **All to Fee Recipient**: No AM transfer, no redemptions → Direct to Fee Recipient
- **All to Treasury**: Only treasury profit → Direct to Treasury
- **Complex case**: Multiple recipients → Deposit silo redeems to Vault, then distributes

## Settlement Previews

Always preview before settling to understand the expected flows:

```solidity
// Preview full settlement
IAsync.SettleResult memory preview = IVault(vault).previewSettle(
    IAsync.FeeClaimType.SOFT_CLAIM
);

// Key fields in the result:
// preview.settleDepositResult.valueToAm      — assets you'll receive
// preview.settleDepositResult.valueFromAm    — assets you need to send
// preview.settleDepositResult.valueToFr      — assets to fee recipient
// preview.settleDepositResult.valueToT3treasury — silo profit to treasury
```

## Practical Settlement Strategies

### High-Frequency (Daily)

```solidity
// Use NO_CLAIM for daily settlements. Claim fees weekly.
vault.settle(FeeClaimType.NO_CLAIM, "");
// ... repeat daily ...

// Weekly: claim all accumulated fees
uint256 unclaimed = vault.getUnclaimedSharesFee();
vault.claimFees(unclaimed);
```

### Balanced (Weekly)

```solidity
// Use SOFT_CLAIM to distribute fees when deposits allow
vault.settle(FeeClaimType.SOFT_CLAIM, "");
// Fees distributed opportunistically, no AM capital needed
```

### Full Settlement (Monthly)

```solidity
// Use FULL_CLAIM for complete fee distribution
vault.settle(FeeClaimType.FULL_CLAIM, permit2Data);
// All fees distributed, clean slate. AM may need to send capital.
```

## Settlement Result Data

Both settlement functions return comprehensive result data:

```solidity
struct SettleDepositResult {
    LastPeriodData lastPeriodData;       // Management/perf fees, PnL
    EntryFees entryFees;                  // Entry fee in assets/shares
    NetDepositFlowData netDepositFlowData; // Net deposits after fees
    NetTvlData netTvlData;                // Updated NAV data
    UnclaimedFeesData unclaimedFeesData;  // Accumulated unclaimed fees
    uint256 valueToT3treasury;            // Silo profit to treasury
    uint256 valueToAm;                    // Assets TO asset manager
    uint256 valueFromAm;                  // Assets FROM asset manager
    uint256 sharesValueToFr;              // Shares sent to fee recipient
    uint256 updatedUnclaimedSharesFee;    // New unclaimed balance
}
```

Use these return values for accounting, auditing, and monitoring.
