---
title: Vault Operations
order: 2
---

# Vault Operations

This guide covers the core vault lifecycle operations: opening, closing, and managing the End of Fund mode.

## Opening the Vault

Opening the vault transitions it from **closed (async)** to **open (sync)** mode. This is a complex operation that:

1. Settles all pending deposit and redemption requests
2. Transfers net assets from the asset manager to the vault
3. Deposits assets into the sync silo
4. Enables instant deposits and withdrawals

```solidity
IAsync.OpenResult memory result = IVault(vault).open(
    IAsync.FeeClaimType.FULL_CLAIM,  // Fee claim strategy
    permit2Data                        // Optional Permit2 data for asset transfer
);
```

### What Happens During `open()`

```
1. SETTLE ALL PENDING REQUESTS
   ├── Settle deposits (mint shares, apply entry fees)
   └── Settle redemptions (burn shares, apply exit fees)

2. TRANSFER ASSETS
   ├── If net positive: AM sends assets to vault
   └── If net negative: vault sends excess to AM

3. DEPOSIT INTO SYNC SILO
   └── All vault assets deposited into the sync silo for yield

4. SET STATE
   └── isVaultOpen = true
```

### Permissions Required

The caller must have `OPEN_ROLE`.

### `permit2Data` Parameter

When opening the vault, the asset manager may need to transfer assets to the vault (if redemptions exceed deposits, or for fee claims). The `permit2Data` parameter allows this transfer via Permit2 signature instead of requiring a prior `approve`.

If not using Permit2, pass an empty bytes: `""`. In this case, you need to `approve` the vault to spend your assets beforehand.

### Preview Before Opening

```solidity
IAsync.OpenResult memory preview = IVault(vault).previewOpen();
// Inspect preview.valueFromAm to know how much the AM needs to send
```

---

## Closing the Vault

Closing the vault transitions it from **open (sync)** to **closed (async)** mode:

1. Redeems all assets from the sync silo
2. Handles silo PnL (profit goes to treasury)
3. Transfers all assets to the asset manager
4. Disables instant deposits/withdrawals

```solidity
uint256 returnedAssets = IVault(vault).close();
```

### What Happens During `close()`

```
1. REDEEM FROM SYNC SILO
   └── Withdraw all assets from the sync silo

2. HANDLE SILO PnL
   ├── If profit: send excess to T3tris treasury
   └── If loss: absorbed by the vault

3. TRANSFER ASSETS TO AM
   └── All remaining vault assets sent to asset manager

4. SET STATE
   └── isVaultOpen = false
```

### Permissions Required

The caller must have `CLOSE_ROLE`.

### Preview Before Closing

```solidity
uint256 returnedAssets = IVault(vault).previewClose();
```

---

## End of Fund (EOF) Mode

EOF mode is used for **orderly fund wind-down**. It opens the vault for withdrawals while preventing new deposits.

### Enable End of Fund

```solidity
IAsync.OpenResult memory result = IVault(vault).enableEndOfFund(
    IAsync.FeeClaimType.FULL_CLAIM,
    permit2Data
);
```

This function:

1. Settles all pending requests (like `open()`)
2. Opens the vault
3. Sets `endOfFund = true`
4. `maxDeposit()` and `maxMint()` return 0
5. LPs can only withdraw/redeem

### Disable End of Fund

```solidity
uint256 returnedAssets = IVault(vault).disableEndOfFund(closeVault);
```

Parameters:

- `closeVault`: If `true`, also closes the vault after disabling EOF

### Permissions Required

- `ENABLE_END_OF_FUND_ROLE` for enabling
- `DISABLE_END_OF_FUND_ROLE` for disabling

---

## Pausing the Vault

In emergency situations, the vault can be paused to halt all operations:

```solidity
// Pause vault (requires PAUSE_ROLE)
IVault(vault).pause();

// Unpause vault (requires UNPAUSE_ROLE)
IVault(vault).unpause();
```

When paused:

- All deposits, withdrawals, settlements are blocked
- Claims are blocked
- View functions still work
- Admin functions still work

### Protocol-Level Pause

The T3tris protocol owner can also pause at the protocol or version level:

```solidity
// Pause entire protocol
IT3tris(t3tris).pauseProtocol();

// Pause all vaults of a specific version
IT3tris(t3tris).pauseVaults(versionNonce);
```

---

## NAV Reporting

In closed mode, the vault relies on an external oracle for NAV. You must update the oracle before each settlement.

```solidity
// Update total assets via the SafeOracle
ISafeOracle(oracle).setTotalAssets(currentTotalAssets);
```

### Deviation Bounds

The SafeOracle enforces price deviation bounds to prevent manipulation:

```solidity
// If PPS changes more than the max deviation, setTotalAssets() reverts
uint16 maxUp = ISafeOracle(oracle).getMaxPricePerShareDeviationUpBps();
uint16 maxDown = ISafeOracle(oracle).getMaxPricePerShareDeviationDownBps();
```

For large NAV changes (e.g., after a long period), you may need to update the deviation bounds first:

```solidity
ISafeOracle(oracle).setMaxPricePerShareDeviationUp(newMaxBps);
ISafeOracle(oracle).setMaxPricePerShareDeviationDown(newMaxBps);
```

### Updating Accrued Fees Without Settlement

You can trigger fee accrual (management + performance) without running a full settlement:

```solidity
IVault(vault).updateAccruedFees();
```

This mints fee shares based on the current NAV and time elapsed, updating the PPS and high-water mark. This is useful between settlements to keep the NAV accurate.
