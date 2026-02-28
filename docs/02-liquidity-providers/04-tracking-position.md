---
title: Tracking Your Position
order: 4
---

# Tracking Your Position

T3tris provides comprehensive view functions to help you monitor your holdings, pending requests, and overall vault performance.

## Your Balance

### Owned Shares

```solidity
// Your current share balance (settled, owned shares)
uint256 shares = IVault(vault).balanceOf(yourAddress);
```

### Shares Value in Assets

```solidity
// What your shares are worth in underlying assets
uint256 assetsValue = IVault(vault).sharesBalanceInAsset(yourAddress);
```

### Full Balance (Including Pending)

The `getFullBalanceOf` function provides a complete picture of your position:

```solidity
(
    uint256 ownedShares,         // Settled shares you own
    uint256 claimableShares,     // Shares ready to claim from settled deposits
    uint256 pendingDepositAssets // Assets in pending (unsettled) deposit requests
) = IVault(vault).getFullBalanceOf(yourAddress);
```

This is the most comprehensive view — it shows:

- **Owned shares**: Shares already in your wallet
- **Claimable shares**: Shares minted during settlement but not yet claimed
- **Pending deposit assets**: Assets you've deposited that haven't been settled yet

## Pending Requests

### Deposit Request Status

```solidity
// Do you have claimable shares from a settled deposit?
bool canClaim = IVault(vault).hasClaimableDeposit(yourAddress);

// How many shares can you claim?
uint256 claimableShares = IVault(vault).previewClaimDeposit(yourAddress);

// Your last deposit request ID (0 = no pending request)
uint256 requestId = IVault(vault).getLastDepositRequestId(yourAddress);
```

### Redemption Request Status

```solidity
// How many assets can you claim from a settled redemption?
uint256 claimableAssets = IVault(vault).previewClaimRedeem(yourAddress);

// Your last redeem request ID
uint256 requestId = IVault(vault).getLastRedeemRequestId(yourAddress);
```

## Vault State & Performance

### Current Vault State

```solidity
// Is the vault open (sync mode)?
bool isOpen = IVault(vault).getIsVaultOpen();

// Is End of Fund mode active?
bool isEOF = IVault(vault).getEndOfFund();

// Are deposits enabled?
bool depositsEnabled = IVault(vault).getDepositEnabled();

// What is the current request cycle ID?
uint256 depositReqId = IVault(vault).getCurrentDepositRequestId();
uint256 redeemReqId = IVault(vault).getCurrentRedeemRequestId();
```

### NAV & Supply

```solidity
// Total assets under management (reported by oracle or sync silo)
uint256 totalAssets = IVault(vault).totalAssets();

// Net assets (total assets minus unclaimed fees)
uint256 netAssets = IVault(vault).totalNetAssets();

// Total share supply
uint256 totalSupply = IVault(vault).totalSupply();

// Net supply (total supply minus unclaimed fee shares)
uint256 netSupply = IVault(vault).totalNetSupply();
```

### Price Per Share

You can derive the PPS from the conversion functions:

```solidity
// Value of 1 share in assets
uint256 pps = IVault(vault).convertToAssets(1e18); // For 18-decimal shares

// Shares per 1 unit of asset
uint256 sps = IVault(vault).convertToShares(1e18);
```

Or use the recorded high-water mark:

```solidity
// The highest PPS ever recorded (used for performance fee calculations)
uint256 hwm = IVault(vault).getPpsHighWaterMark();
```

### Fee Information

```solidity
uint16 entryFee = IVault(vault).getEntryFeeBps();       // Entry fee in basis points
uint16 exitFee = IVault(vault).getExitFeeBps();         // Exit fee in basis points
uint16 mgmtFee = IVault(vault).getManagementFeeBps();   // Management fee in bps
uint16 perfFee = IVault(vault).getPerfFeeBps();          // Performance fee in bps
uint32 mgmtDays = IVault(vault).getManagementFeeDays();  // Management fee period
```

### Key Addresses

```solidity
address assetManager = IVault(vault).getAssetManager();
address feeRecipient = IVault(vault).getFeeRecipient();
address treasury = IVault(vault).getT3treasury();
IOracle oracle = IVault(vault).getOracle();
```

## Vault Assets & Silos

```solidity
// Underlying asset (e.g., USDC)
IERC20Metadata asset = IERC20Metadata(IVault(vault).asset());
uint8 decimals = IVault(vault).decimals();

// Silos
IERC4626 syncSilo = IVault(vault).getSyncSilo();
IERC4626 depositSilo = IVault(vault).getDepositSilo();
IERC4626 redeemSilo = IVault(vault).getRedeemSilo();
```

## Settlement Previews

You can preview the next settlement to understand what would happen:

```solidity
// Preview a full settlement with NO_CLAIM fee strategy
IAsync.SettleResult memory result = IVault(vault).previewSettle(
    IAsync.FeeClaimType.NO_CLAIM
);

// Preview vault opening
IAsync.OpenResult memory openResult = IVault(vault).previewOpen();

// Preview vault closing
uint256 returnedAssets = IVault(vault).previewClose();
```

## Whitelist Status

If the vault uses deposit or withdrawal whitelists, you can check your status:

```solidity
// Is deposit whitelist active?
bool whitelistActive = IVault(vault).getDepositWhitelistEnabled();

// Am I whitelisted for deposits?
bool amWhitelisted = IVault(vault).getDepositWhitelisted(yourAddress);

// Same for withdrawals
bool withdrawWhitelistActive = IVault(vault).getWithdrawWhitelistEnabled();
bool canWithdraw = IVault(vault).getWithdrawWhitelisted(yourAddress);
```
