---
title: Withdrawing Assets
order: 3
---

# Withdrawing Assets

Like deposits, withdrawals work differently depending on whether the vault is **open** (synchronous) or **closed** (asynchronous).

## Synchronous Withdrawals (Open Vault)

When the vault is open, you can withdraw instantly.

### `redeem(shares, receiver, owner)`

Burn a specific number of **shares** and receive the corresponding assets:

```solidity
uint256 assetsReceived = IVault(vault).redeem(shares, receiverAddress, yourAddress);
```

### `withdraw(assets, receiver, owner)`

Alternatively, specify the exact amount of **assets** you want to receive:

```solidity
uint256 sharesBurned = IVault(vault).withdraw(desiredAssets, receiverAddress, yourAddress);
```

### Preview Functions

```solidity
// How many assets will I get for `shares`?
uint256 expectedAssets = IVault(vault).previewRedeem(shares);

// How many shares will be burned for `assets`?
uint256 requiredShares = IVault(vault).previewWithdraw(assets);
```

### Limits

```solidity
// Maximum shares you can redeem
uint256 maxShares = IVault(vault).maxRedeem(yourAddress);

// Maximum assets you can withdraw
uint256 maxAssets = IVault(vault).maxWithdraw(yourAddress);
```

> **Note:** During open mode, withdrawals draw from the **sync silo**. The maximum withdrawal is limited to the assets currently held in the sync silo.

---

## Asynchronous Redemptions (Closed Vault)

When the vault is closed, redemptions are a two-step process:

1. **Request**: Lock your shares and submit a redemption request
2. **Claim**: After settlement, claim your assets from the redeem silo

### Step 1: Request a Redemption

```solidity
IVault(vault).requestRedeem(
    shares,              // Number of shares to redeem
    receiverAddress,     // Who receives the assets after claim
    yourAddress,         // Owner of the shares
    previousClaimReceiver // Who should receive any unclaimed assets from prior request
);
```

**Parameters explained:**

- `shares`: Number of shares you want to redeem
- `receiver`: The address that will claim and receive assets
- `owner`: The current owner of the shares (your address, or the address you have approval from)
- `previousClaimReceiver`: If you had a previous unclaimed redemption, assets are automatically claimed and sent to this address

### Step 2: Wait for Settlement

The asset manager runs settlement, which:

1. Calculates how many assets correspond to the pending shares
2. Applies exit fees
3. Deposits the appropriate assets into the **redeem silo**
4. Burns the redeemed shares

### Step 3: Claim Your Assets

```solidity
uint256 assetsReceived = IVault(vault).claimRedeem(
    yourAddress,      // Owner of the original request
    receiverAddress   // Where to send the assets
);
```

### Preview Before Claiming

```solidity
uint256 expectedAssets = IVault(vault).previewClaimRedeem(yourAddress);
```

### Decreasing a Pending Request

Before settlement, you can reduce or cancel your redemption request:

```solidity
IVault(vault).decreaseRedeemRequest(
    sharesToRemove,    // Number of shares to un-request
    yourAddress,       // Owner of the shares
    receiverAddress    // Who receives the shares back
);
```

> **Important:** Shares are returned to the specified `receiver`, not necessarily to the owner.

---

## Redemption Lifecycle Diagram

```
OPEN VAULT (Synchronous)
═══════════════════════════
  You ──redeem()──▶ Vault ──▶ Assets returned instantly


CLOSED VAULT (Asynchronous)
═══════════════════════════
  1. You ──requestRedeem()──▶ Shares locked in Vault
  2. Asset Manager ──settle()──▶ Assets deposited to RedeemSilo
  3. You ──claimRedeem()──▶ Assets transferred from RedeemSilo to you
```

## Exit Fees

When redeeming from a vault with an exit fee, the fee is deducted from your redemption at settlement:

```
shares redeemed = 1,000 shares
exit fee = 0.5% (50 bps)

net shares redeemed = 1,000 × (1 - 0.005) = 995 shares
exit fee shares = 5 shares (kept as fee)
assets received = 995 × PPS
```

Check the current exit fee:

```solidity
uint16 exitFeeBps = IVault(vault).getExitFeeBps();
// 50 = 0.5%, 100 = 1%, 0 = no fee
```

## End of Fund Mode

When a vault enters **End of Fund (EOF)** mode, the vault is opened for withdrawals only — no new deposits are accepted. This is used for orderly fund wind-down.

```solidity
// Check if vault is in EOF mode
bool isEOF = IVault(vault).getEndOfFund();

// In EOF mode:
// maxDeposit() returns 0
// maxMint() returns 0
// Withdrawals and redemptions still work normally
```

If you see EOF mode active, it means the fund is winding down. You should redeem your shares before the fund is fully closed.

## Share Transfers

Some vaults enable share transfers, allowing you to send your vault shares to another address like any ERC-20 token:

```solidity
// Check if transfers are enabled
bool transfersEnabled = IVault(vault).getTransferEnabled();

// Transfer shares (only works if transfers are enabled)
IVault(vault).transfer(recipient, shares);
```

If share transfers are disabled, calling `transfer()` or `transferFrom()` will revert with `TransferDisabled()`.
