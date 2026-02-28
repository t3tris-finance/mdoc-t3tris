---
title: Events Reference
order: 9
---

# Events Reference

Complete reference of all events emitted by the T3tris protocol contracts.

## Vault Events (`IVaultEvents`)

### Lifecycle Events

```solidity
/// @notice Emitted when the vault transitions to open (sync) mode.
/// @param depositedAssets Assets deposited from asset manager into the sync silo.
event VaultOpened(uint256 depositedAssets);

/// @notice Emitted when the vault transitions to closed (async) mode.
/// @param returnedAssets Assets returned from sync silo to the asset manager.
event VaultClosed(uint256 returnedAssets);

/// @notice Emitted when a new vault is created via the T3tris factory.
/// @param vaultAddress The deployed vault proxy address.
/// @param owner The vault owner.
/// @param referralCode Referral code used during deployment.
event VaultCreated(
    address indexed vaultAddress,
    address indexed owner,
    bytes32 referralCode
);

/// @notice Emitted when End-of-Fund mode is toggled.
/// @param enabled True if EOF was enabled, false if disabled.
event EndOfFundToggled(bool enabled);
```

### Settlement Events

```solidity
/// @notice Emitted when deposits are settled.
/// @param requestId The deposit request ID being settled.
/// @param assetsDeposited Total assets deposited from silo to vault.
/// @param sharesMinted Total shares minted for depositors.
/// @param entryFees Entry fees collected (in assets).
/// @param unclaimedFees Total unclaimed fee shares after settlement.
event DepositsSettled(
    uint256 indexed requestId,
    uint256 assetsDeposited,
    uint256 sharesMinted,
    uint256 entryFees,
    uint256 unclaimedFees
);

/// @notice Emitted when redemptions are settled.
/// @param requestId The redeem request ID being settled.
/// @param sharesToRedeem Total shares submitted for redemption.
/// @param assetsWithdrawn Total assets withdrawn from asset manager.
/// @param sharesBurned Total shares burned.
/// @param exitFeeAssets Exit fees charged (in assets).
/// @param unclaimedSharesFee Updated unclaimed shares fee balance.
/// @param feeRecipientAmount Amount sent to fee recipient during settlement.
event RedemptionsSettled(
    uint256 indexed requestId,
    uint256 sharesToRedeem,
    uint256 assetsWithdrawn,
    uint256 sharesBurned,
    uint256 exitFeeAssets,
    uint256 unclaimedSharesFee,
    uint256 feeRecipientAmount
);
```

### NAV & Fee Events

```solidity
/// @notice Emitted when NAV is updated and fees are accrued.
/// @param managementFeeShares Management fee shares minted.
/// @param perfFeeShares Performance fee shares minted.
/// @param updatedPps The new price per share after update.
/// @param totalNetAssets Total net assets after fee accrual.
/// @param totalNetSupply Total net supply after fee accrual.
event NavUpdated(
    uint256 managementFeeShares,
    uint256 perfFeeShares,
    uint256 updatedPps,
    uint256 totalNetAssets,
    uint256 totalNetSupply
);

/// @notice Emitted when accumulated fees are claimed.
/// @param claimer Address that initiated the claim.
/// @param _feeRecipient Address receiving the fees.
/// @param sharesFeeClaimed Number of fee shares burned.
/// @param assetsClaimed Equivalent assets transferred.
event FeesClaimed(
    address indexed claimer,
    address indexed _feeRecipient,
    uint256 sharesFeeClaimed,
    uint256 assetsClaimed
);

/// @notice Emitted when T3tris treasury receives profit from fee claims.
/// @param profit Amount of assets sent to T3tris treasury.
event T3trisProfit(uint256 profit);
```

### Fee Configuration Events

```solidity
/// Emitted when active fees change (at settlement time):
event EntryFeeUpdated(uint16 entryFeeBps);
event ExitFeeUpdated(uint16 exitFeeBps);
event PerformanceFeeUpdated(uint16 perfFeeBps);
event ManagementFeeUpdated(uint16 managementFeeBps);
event ManagementFeeDaysUpdated(uint32 managementFeeDays);

/// Emitted when next fees are queued (take effect at next settlement):
event NextEntryFeeSet(uint16 nextEntryFeeBps);
event NextExitFeeSet(uint16 nextExitFeeBps);
event NextPerformanceFeeSet(uint16 nextPerfFeeBps);
event NextManagementFeeSet(uint16 nextManagementFeeBps);
event NextManagementFeeDaysSet(uint32 nextManagementFeeDays);
```

### User Request Events

```solidity
/// @notice Emitted when a user requests a deposit (async mode).
event DepositRequest(
    address indexed receiver,
    address indexed owner,
    uint256 indexed requestId,
    address sender,
    uint256 assets
);

/// @notice Emitted when a user decreases their pending deposit request.
event DecreaseDepositRequest(
    uint256 indexed requestId,
    address indexed owner,
    uint256 newRequestedAssets
);

/// @notice Emitted when a user claims settled deposit shares.
event ClaimDeposit(
    uint256 indexed requestId,
    address indexed owner,
    address indexed receiver,
    uint256 assets,
    uint256 shares
);

/// @notice Emitted when a user requests a redemption (async mode).
event RedeemRequest(
    address indexed receiver,
    address indexed owner,
    uint256 indexed requestId,
    address sender,
    uint256 shares
);

/// @notice Emitted when a user decreases their pending redeem request.
event DecreaseRedeemRequest(
    uint256 indexed requestId,
    address indexed owner,
    uint256 newRequestedShares
);

/// @notice Emitted when a user claims settled redemption assets.
event ClaimRedeem(
    uint256 indexed requestId,
    address indexed owner,
    address indexed receiver,
    uint256 assets,
    uint256 shares
);
```

### Silo PnL Events

```solidity
/// @notice Emitted when deposit silo PnL is realized during settlement.
event DepositSiloPnl(
    uint256 indexed requestId,
    IERC4626 indexed silo,
    bool indexed isProfit,
    uint256 pnl
);

/// @notice Emitted when redeem silo PnL is realized during settlement.
event RedeemSiloPnl(
    uint256 indexed requestId,
    IERC4626 indexed silo,
    bool indexed isProfit,
    uint256 pnl
);

/// @notice Emitted when sync silo PnL is realized during open/close.
event SyncSiloPnl(
    IERC4626 indexed silo,
    bool indexed isProfit,
    uint256 pnl
);
```

### Configuration Events

```solidity
event OracleUpdated(IOracle oracle);
event AssetManagerUpdated(address indexed assetManager);
event FeeRecipientUpdated(address indexed feeRecipient);
event T3treasuryUpdated(address indexed t3treasury);
event SyncSiloUpdated(IERC4626 syncSilo);
event DepositSiloUpdated(IERC4626 depositSilo);
event RedeemSiloUpdated(IERC4626 redeemSilo);
event DepositEnabledUpdated(bool enabled);
event TransferEnabledUpdated(bool enabled);
event DepositWhitelistStatusUpdated(bool enabled);
event WithdrawWhitelistStatusUpdated(bool enabled);
event DepositWhitelistUpdated(address indexed account, bool whitelisted);
event WithdrawWhitelistUpdated(address indexed account, bool whitelisted);
event NameSymbolUpdated(string name, string symbol);
event IpfsHashUpdated(string ipfsHash);
```

### Admin Transfer Events

```solidity
/// @notice Emitted when a two-step admin role grant is initiated.
event AdminRoleGrantInitiated(bytes32 indexed role, address indexed account);

/// @notice Emitted when a pending admin role grant is cancelled.
event AdminRoleGrantCancelled(bytes32 indexed role);
```

### Token Events

```solidity
/// @notice Emitted when tokens (or native ETH) are swept from the vault.
/// @param token Token address (0xEeee...EEeE for native ETH).
/// @param to Recipient address.
/// @param amount Amount swept.
event Sweep(address indexed token, address indexed to, uint256 amount);
```

---

## SafeOracle Events (`ISafeOracle`)

```solidity
/// @notice Emitted when the NAV is updated.
/// @param newTotalAssets The new total assets value.
/// @param newPricePerShare The new PPS calculated from this update.
event TotalAssetsUpdated(uint256 newTotalAssets, uint256 newPricePerShare);

/// @notice Emitted when the upper deviation bound is changed.
event MaxPricePerShareDeviationUpUpdated(uint256 newMaxPricePerShareDeviationUpBps);

/// @notice Emitted when the lower deviation bound is changed.
event MaxPricePerShareDeviationDownUpdated(uint256 newMaxPricePerShareDeviationDownBps);
```

---

## Silo Events (`ISilo`)

```solidity
/// @notice Emitted when the active yield strategy is changed.
event StrategySet(IERC4626 indexed oldStrategy, IERC4626 indexed newStrategy);

/// @notice Emitted when assets are moved between IDLE and strategy.
event Allocated(bool indexed toStrategy, uint256 assets);

/// @notice Emitted when assets are deposited into the strategy.
event StrategyDeposit(IERC4626 indexed strategy, uint256 assets, uint256 sharesReceived);

/// @notice Emitted when assets are withdrawn from the strategy.
event StrategyWithdraw(IERC4626 indexed strategy, uint256 assets, uint256 sharesBurned);

/// @notice Emitted when stuck tokens are swept.
event Sweep(address indexed token, address indexed recipient, uint256 amount);
```

---

## Indexing Guide

For off-chain indexing (e.g., The Graph, Ponder), the most important events to track are:

| Event                                    | Use Case                       |
| ---------------------------------------- | ------------------------------ |
| `VaultCreated`                           | Discover newly deployed vaults |
| `DepositRequest` / `RedeemRequest`       | Track pending user requests    |
| `DepositsSettled` / `RedemptionsSettled` | Mark requests as claimable     |
| `ClaimDeposit` / `ClaimRedeem`           | Track claimed positions        |
| `NavUpdated`                             | Build PPS history charts       |
| `FeesClaimed`                            | Track protocol revenue         |
| `VaultOpened` / `VaultClosed`            | Track vault mode transitions   |
