---
title: Integration Guide
order: 8
---

# Integration Guide

This guide covers how to integrate with T3tris vaults programmatically, whether you're building a frontend, a keeper bot, or composing with other smart contracts.

## Interface Imports

### Solidity

```solidity
import {IVault} from "@t3tris/vault-contracts/src/interfaces/IVault.sol";
import {IAsync} from "@t3tris/vault-contracts/src/interfaces/IVaultTypes.sol";
import {ISafeOracle} from "@t3tris/vault-contracts/src/interfaces/ISafeOracle.sol";
import {ISilo} from "@t3tris/vault-contracts/src/interfaces/ISilo.sol";
import {IT3tris} from "@t3tris/vault-contracts/src/interfaces/IT3tris.sol";
```

### Key Types

```solidity
// Fee claim type enum
enum FeeClaimType { NO_CLAIM, SOFT_CLAIM, FULL_CLAIM }

// Vault deployment params
struct VaultDeploymentParams { ... }

// Settlement results
struct SettleResult { ... }
struct SettleDepositResult { ... }
struct SettleRedemptionsResult { ... }
struct OpenResult { ... }
```

## For Frontend Developers

### Reading Vault State

```solidity
// Basic vault info
string name = IVault(vault).name();
string symbol = IVault(vault).symbol();
uint8 decimals = IVault(vault).decimals();
address asset = IVault(vault).asset();
bool isOpen = IVault(vault).getIsVaultOpen();
bool isEOF = IVault(vault).getEndOfFund();

// NAV info
uint256 totalAssets = IVault(vault).totalAssets();
uint256 totalSupply = IVault(vault).totalSupply();
uint256 netAssets = IVault(vault).totalNetAssets();
uint256 netSupply = IVault(vault).totalNetSupply();

// User position
uint256 balance = IVault(vault).balanceOf(user);
uint256 assetValue = IVault(vault).sharesBalanceInAsset(user);
(uint256 owned, uint256 claimable, uint256 pending) =
    IVault(vault).getFullBalanceOf(user);
```

### Determining User Actions

```solidity
// Can the user deposit?
uint256 maxDep = IVault(vault).maxDeposit(user);
// maxDep > 0 → sync deposit available

// Can the user request a deposit?
bool canRequest = !IVault(vault).getIsVaultOpen()
    && IVault(vault).getDepositEnabled()
    && !IVault(vault).getEndOfFund();

// Can the user claim?
bool canClaimDeposit = IVault(vault).hasClaimableDeposit(user);
uint256 claimableAssets = IVault(vault).previewClaimRedeem(user);

// Can the user withdraw?
uint256 maxRedeem = IVault(vault).maxRedeem(user);
```

### PPS Calculation

```solidity
// Method 1: Use conversion functions
uint256 pps = IVault(vault).convertToAssets(10 ** IVault(vault).decimals());

// Method 2: Compute from totals
uint256 pps = (IVault(vault).totalNetAssets() * 1e18) / IVault(vault).totalNetSupply();
```

## For Keeper Bots

### Daily Operations Script

```solidity
contract DailyKeeper {
    IVault public vault;
    ISafeOracle public oracle;

    function dailySettle(uint256 newNav) external {
        // 1. Update oracle NAV
        oracle.setTotalAssets(newNav);

        // 2. Update accrued fees
        vault.updateAccruedFees();

        // 3. Settle with NO_CLAIM (batch fee claims later)
        vault.settle(IAsync.FeeClaimType.NO_CLAIM, "");
    }

    function weeklyClaimFees() external {
        uint256 unclaimed = vault.getUnclaimedSharesFee();
        if (unclaimed > 0) {
            vault.claimFees(unclaimed);
        }
    }
}
```

### Monitoring Settlement Readiness

```solidity
// Check if there are pending requests to settle
uint256 pendingDeposits = IVault(vault).getTotalRequestDeposit();
uint256 currentDepReqId = IVault(vault).getCurrentDepositRequestId();
uint256 currentRedReqId = IVault(vault).getCurrentRedeemRequestId();

// Preview the settlement to check feasibility
IAsync.SettleResult memory preview = IVault(vault).previewSettle(
    IAsync.FeeClaimType.NO_CLAIM
);
```

## For Smart Contract Composability

### Wrapping a T3tris Vault

```solidity
contract VaultWrapper {
    IVault public immutable vault;
    IERC20 public immutable asset;

    constructor(address _vault) {
        vault = IVault(_vault);
        asset = IERC20(vault.asset());
        asset.approve(_vault, type(uint256).max);
    }

    // Deposit with custom logic
    function depositWithCallback(uint256 amount, address receiver)
        external returns (uint256 shares)
    {
        asset.transferFrom(msg.sender, address(this), amount);

        if (vault.getIsVaultOpen()) {
            // Sync deposit
            shares = vault.deposit(amount, receiver);
        } else {
            // Async deposit request
            vault.requestDeposit(amount, receiver);
            shares = 0; // Will be claimable later
        }
    }
}
```

### Listening to Events

Key events to monitor:

```solidity
// Settlement events
event DepositsSettled(uint256 indexed requestId, ...);
event RedemptionsSettled(uint256 indexed requestId, ...);

// Lifecycle events
event VaultOpened(uint256 depositedAssets);
event VaultClosed(uint256 returnedAssets);

// User events
event DepositRequest(address indexed receiver, address indexed owner, uint256 indexed requestId, ...);
event ClaimDeposit(uint256 indexed requestId, address indexed owner, ...);

// NAV events
event NavUpdated(uint256 managementFeeShares, uint256 perfFeeShares, uint256 updatedPps, ...);
```

## Permit2 Integration

### Encoding Permit2 Data

```solidity
// 1. Get the Permit2 data from off-chain signature
IAllowanceTransfer.PermitSingle memory permit = IAllowanceTransfer.PermitSingle({
    details: IAllowanceTransfer.PermitDetails({
        token: address(underlying),
        amount: uint160(depositAmount),
        expiration: uint48(block.timestamp + 3600),
        nonce: currentNonce
    }),
    spender: address(vault),
    sigDeadline: block.timestamp + 3600
});

bytes memory signature = signPermit(permit, userPrivateKey);

// 2. Encode for the vault
bytes memory permit2Data = abi.encode(permit, signature);

// 3. Call with permit2
vault.deposit(depositAmount, receiver, permit2Data);
```

### Permit2 Address

The Permit2 contract address is the same on all chains:

```solidity
address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
```

## Multicall

The vault supports Solady's `Multicallable`, allowing multiple function calls in a single transaction:

```solidity
bytes[] memory calls = new bytes[](3);
calls[0] = abi.encodeCall(IVault.updateAccruedFees, ());
calls[1] = abi.encodeCall(IVault.settleDeposits, (IAsync.FeeClaimType.NO_CLAIM));
calls[2] = abi.encodeCall(IVault.settleRedemptions, (false));

vault.multicall(calls);
```

## Error Handling

All vault errors are custom Solidity errors for gas-efficient reverts:

```solidity
try vault.deposit(amount, receiver) returns (uint256 shares) {
    // Success
} catch (bytes memory reason) {
    // Decode error
    if (bytes4(reason) == IVaultErrors.VaultIsClosed.selector) {
        // Vault is closed, use async deposit
        vault.requestDeposit(amount, receiver);
    } else if (bytes4(reason) == IVaultErrors.DepositDisabled.selector) {
        // Deposits are disabled
    } else if (bytes4(reason) == IVaultErrors.NotWhitelisted.selector) {
        // User not whitelisted
    }
}
```

## Gas Optimization Tips

1. **Use `multicall`** for batching multiple operations
2. **Use Permit2** to save one approval transaction
3. **Use `NO_CLAIM`** for daily settlements to minimize transfers
4. **Batch fee claims** weekly/monthly instead of per-settlement
5. **Preview before executing** to estimate gas and check feasibility
6. **Use `settleDeposits` / `settleRedemptions` separately** when only one side has pending requests
