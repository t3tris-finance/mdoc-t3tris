---
title: Errors Reference
order: 10
---

# Errors Reference

All custom errors defined in the T3tris protocol, organized by contract.

## Vault Errors (`IVaultErrors`)

### Input Validation

| Error                      | Cause                                         |
| -------------------------- | --------------------------------------------- |
| `Vault__ZeroAssets()`      | Attempted operation with 0 assets             |
| `Vault__ZeroShares()`      | Attempted operation with 0 shares             |
| `Vault__InvalidAddress()`  | Provided `address(0)` for a required address  |
| `Vault__InvalidReceiver()` | Receiver address is invalid for the operation |

### State Errors

| Error                                 | Cause                                             |
| ------------------------------------- | ------------------------------------------------- |
| `Vault__VaultIsOpen()`                | Tried an async-only operation while vault is open |
| `Vault__VaultIsClosed()`              | Tried a sync-only operation while vault is closed |
| `Vault__VaultIsEmpty()`               | Tried to start an epoch with zero total supply    |
| `Vault__TransferDisabled()`           | Share transfers are disabled                      |
| `Vault__DepositDisabled()`            | Deposits are disabled                             |
| `Vault__NotWhitelisted(address addr)` | Address not on the whitelist                      |

### Request Errors

| Error                                                                              | Cause                                                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Vault__NoPendingRequest(address owner)`                                           | No pending request found for this address in current cycle |
| `Vault__NoClaimDepositAvailable(address owner)`                                    | No settled deposit to claim                                |
| `Vault__NoClaimRedeemAvailable(address owner)`                                     | No settled redemption to claim                             |
| `Vault__ExceedsPendingAssets(address owner, uint256 requested, uint256 available)` | Trying to decrease deposit by more than pending            |
| `Vault__ExceedsPendingShares(address owner, uint256 requested, uint256 available)` | Trying to decrease redemption by more than pending         |

### Fee Errors

| Error                                                                         | Cause                                    |
| ----------------------------------------------------------------------------- | ---------------------------------------- |
| `Vault__InvalidFeeBps(uint16 feeBps)`                                         | Fee exceeds maximum allowed basis points |
| `Vault__InvalidManagementFeeDays(uint32 feeDays)`                             | Invalid management fee period            |
| `Vault__ExceededAvailableFee(uint256 sharesToClaim, uint256 availableShares)` | Trying to claim more fees than accrued   |

### Silo Errors

| Error                              | Cause                                      |
| ---------------------------------- | ------------------------------------------ |
| `Vault__InvalidSilo(address silo)` | Provided silo address is invalid           |
| `Vault__CannotSweepSiloShares()`   | Cannot sweep silo share tokens (protected) |

### Admin Role Errors

| Error                                          | Cause                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `Vault__SuperAdminRoleDirectGrantNotAllowed()` | Tried to `grantRole` for admin roles (must use two-step process)  |
| `Vault__NotAdminRole()`                        | Role is not `DEFAULT_ADMIN_ROLE` or `GOVERNANCE_ADMIN_ROLE`       |
| `Vault__InvalidPendingRecipient()`             | Caller is not the pending recipient for admin transfer            |
| `Vault__NotBurnOperation()`                    | Called `applyAdminBurn` but pending recipient is not `address(0)` |

---

## SafeOracle Errors (`ISafeOracle`)

| Error                                            | Cause                                 |
| ------------------------------------------------ | ------------------------------------- |
| `SafeOracle__InvalidTotalAssetsUp()`             | New NAV exceeds upper deviation bound |
| `SafeOracle__InvalidTotalAssetsDown()`           | New NAV exceeds lower deviation bound |
| `SafeOracle__InvalidMaxPricePerShareDeviation()` | Deviation bound value is invalid      |

### Deviation Bound Error Details

```
  lastPPS = 10,000 (1.000 with 4 decimals)
  maxUpBps = 300 (3%)

  Allowed range: [9,700 ... 10,300]

  setTotalAssets(X) where X → PPS = 10,500
  → Reverts: SafeOracle__InvalidTotalAssetsUp()

  setTotalAssets(Y) where Y → PPS = 9,500
  → Reverts: SafeOracle__InvalidTotalAssetsDown()
```

---

## Silo Errors (`ISilo`)

| Error                                 | Cause                                                     |
| ------------------------------------- | --------------------------------------------------------- |
| `Silo__StrategyAssetMismatch()`       | Strategy's underlying asset doesn't match the silo's      |
| `Silo__SameStrategy()`                | Setting the same strategy that's already active           |
| `Silo__WithdrawMoreThanMax()`         | Withdrawal exceeds maximum redeemable amount              |
| `Silo__RedeemMoreThanMaxAssets()`     | Redeem request exceeds available assets                   |
| `Silo__NoStrategySet()`               | Tried to allocate/deallocate with no strategy set         |
| `Silo__InsufficientIdleBalance()`     | Not enough IDLE balance for allocation                    |
| `Silo__InsufficientStrategyBalance()` | Not enough strategy balance for deallocation              |
| `Silo__ZeroAddress()`                 | Provided `address(0)`                                     |
| `Silo__NothingToSweep()`              | Token balance is zero, nothing to sweep                   |
| `Silo__VaultInsolvent()`              | Shares outstanding but zero assets (total loss scenario)  |
| `Silo__ZeroSharesMinted()`            | Deposit would mint zero shares                            |
| `Silo__StrategyReturnedZeroShares()`  | Strategy deposit returned zero shares for non-zero assets |

---

## Error Handling Patterns

### Solidity

```solidity
try vault.deposit(amount, receiver) returns (uint256 shares) {
    // Success
} catch (bytes memory reason) {
    bytes4 selector = bytes4(reason);

    if (selector == IVaultErrors.Vault__VaultIsClosed.selector) {
        // Vault is in async mode — use requestDeposit instead
    } else if (selector == IVaultErrors.Vault__DepositDisabled.selector) {
        // Deposits are currently disabled
    } else if (selector == IVaultErrors.Vault__NotWhitelisted.selector) {
        // Decode the address parameter
        address addr = abi.decode(
            bytes(reason[4:]), (address)
        );
    }
}
```

### Ethers.js / Viem

```typescript
// Viem
import { decodeErrorResult } from "viem";
import { vaultAbi } from "./abis";

try {
  await walletClient.writeContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "deposit",
    args: [amount, receiver],
  });
} catch (error) {
  const decoded = decodeErrorResult({
    abi: vaultAbi,
    data: error.data,
  });
  console.log(decoded.errorName); // "Vault__VaultIsClosed"
  console.log(decoded.args); // []
}
```

---

## Common Error Scenarios

| Scenario                           | Error You'll See                        | Solution                         |
| ---------------------------------- | --------------------------------------- | -------------------------------- |
| Deposit when vault is closed       | `Vault__VaultIsClosed`                  | Use `requestDeposit()` instead   |
| Withdraw when vault is closed      | `Vault__VaultIsClosed`                  | Use `requestRedeem()` instead    |
| Request deposit when vault is open | `Vault__VaultIsOpen`                    | Use `deposit()` instead          |
| Transfer shares when disabled      | `Vault__TransferDisabled`               | Wait for `enableTransfer()`      |
| Claim before settlement            | `Vault__NoClaimDepositAvailable`        | Wait for `settle()`              |
| Update NAV beyond bounds           | `SafeOracle__InvalidTotalAssetsUp/Down` | Adjust NAV or widen bounds first |
| Allocate with no strategy          | `Silo__NoStrategySet`                   | Call `setStrategy()` first       |
