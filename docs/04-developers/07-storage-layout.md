---
title: Storage Layout
order: 7
---

# Storage Layout

The T3tris vault uses **ERC-7201 namespaced storage** to isolate its state from inherited contracts. All vault-specific data is contained in a single `Storage` struct at a deterministic storage slot.

## Storage Slot

```solidity
bytes32 constant STORAGE_SLOT = keccak256("t3tris.vault.storage.main") - 1;

function _getMainStorage() internal pure returns (Storage storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
        s.slot := slot
    }
}
```

## Complete Storage Struct

The struct is organized into 36 slots with careful packing for gas efficiency:

### Slot 0: Version, Flags & Fees (29/32 bytes)

```solidity
uint16 version;                    // 2 bytes
bool isVaultOpen;                  // 1 byte
bool endOfFund;                    // 1 byte
bool depositWhitelistEnabled;      // 1 byte
bool withdrawWhitelistEnabled;     // 1 byte
bool transferEnabled;              // 1 byte
bool depositEnabled;               // 1 byte
bool isNextEntryFeePending;        // 1 byte
bool isNextExitFeePending;         // 1 byte
bool isNextPerfFeePending;         // 1 byte
bool isNextManagementFeePending;   // 1 byte
bool isNextManagementFeeDaysPending; // 1 byte
uint16 entryFeeBps;                // 2 bytes
uint16 exitFeeBps;                 // 2 bytes
uint16 perfFeeBps;                 // 2 bytes
uint16 managementFeeBps;           // 2 bytes
uint16 nextEntryFeeBps;            // 2 bytes
uint16 nextExitFeeBps;             // 2 bytes
uint16 nextPerfFeeBps;             // 2 bytes
uint16 nextManagementFeeBps;       // 2 bytes
// Total: 29 bytes (3 bytes gap)
```

### Slot 1: Fee Periods & Asset Manager (28/32 bytes)

```solidity
uint32 managementFeeDays;          // 4 bytes
uint32 nextManagementFeeDays;      // 4 bytes
address assetManager;              // 20 bytes
// Total: 28 bytes (4 bytes gap)
```

### Slots 2-4: Key Addresses

```solidity
address feeRecipient;              // Slot 2 (20 bytes)
IERC20Metadata underlyingAsset;    // Slot 3 (20 bytes)
IAllowanceTransfer permit2;        // Slot 4 (20 bytes)
```

### Slots 5-6: Protocol References

```solidity
IT3tris t3trisProtocol;            // Slot 5 (20 bytes)
address t3treasury;                // Slot 6 (20 bytes)
```

### Slots 7-8: Pending Admin Transitions

```solidity
address nextGovernanceAdminRecipient;  // Slot 7 (20 bytes)
address nextDefaultAdminRecipient;     // Slot 8 (20 bytes)
```

### Slots 9-13: Oracle & Fee Accounting

```solidity
IOracle oracle;                    // Slot 9 (20 bytes)
IOracle nextOracle;                // Slot 10 (20 bytes)
uint256 lastSettlementTimestamp;   // Slot 11 (32 bytes)
uint256 ppsHighWaterMark;          // Slot 12 (32 bytes) — init to BPS_DIVISOR
uint256 unclaimedSharesFee;        // Slot 13 (32 bytes)
```

### Slots 14-20: Deposit Silo & Flow State

```solidity
IERC4626 depositSilo;                              // Slot 14 (20 bytes)
uint256 currentDepositRequestId;                    // Slot 15 (32 bytes) — starts at 1
uint256 totalRequestDeposit;                        // Slot 16 (32 bytes)
uint256 totalDepositSiloTrueShares;                 // Slot 17 (32 bytes)
uint256 totalDepositSiloVirtualShares;              // Slot 18 (32 bytes)
mapping(uint256 => DepositRequestData) depositRequestsData;   // Slot 19
mapping(address => uint256) lastDepositRequestId;              // Slot 20
```

### Slots 21-27: Redeem Silo & Flow State

```solidity
IERC4626 redeemSilo;                               // Slot 21 (20 bytes)
uint256 currentRedeemRequestId;                     // Slot 22 (32 bytes)
uint256 totalRedeemSiloVirtualShares;               // Slot 23 (32 bytes)
uint256 totalRedeemSiloTrueShares;                  // Slot 24 (32 bytes)
uint256 totalAssetsSettled;                         // Slot 25 (32 bytes)
mapping(uint256 => RedeemRequestData) redeemRequestsData;    // Slot 26
mapping(address => uint256) lastRedeemRequestId;             // Slot 27
```

### Slots 28-30: Sync Silo State

```solidity
IERC4626 syncSilo;                 // Slot 28 (20 bytes)
uint256 initialAssets;             // Slot 29 (32 bytes)
uint256 ownedSyncSiloShares;       // Slot 30 (32 bytes)
```

### Slots 31-32: Whitelists

```solidity
mapping(address => bool) depositWhitelisted;    // Slot 31
mapping(address => bool) withdrawWhitelisted;   // Slot 32
```

### Slots 33-35: Metadata Strings

```solidity
string ipfsHash;                   // Slot 33
string shareName;                  // Slot 34
string shareSymbol;                // Slot 35
```

## Request Data Structures

### DepositRequestData

```solidity
struct DepositRequestData {
    uint256 totalAssetsDeposited;    // Total assets for this request ID
    uint256 totalSharesMinted;       // Shares minted at settlement
    uint256 totalEntryFeeAssets;     // Entry fee charged
    uint256 totalEntryFeeShares;     // Entry fee in shares
}
```

### RedeemRequestData

```solidity
struct RedeemRequestData {
    uint256 totalSharesRedeemable;   // Total shares to redeem
    uint256 totalAssetsSettled;      // Assets settled for this request
    uint256 totalSharesBurned;       // Shares burned at settlement
    uint256 totalExitFeeAssets;      // Exit fee charged
}
```

## Per-User Data

User-specific data is stored in separate mappings:

```solidity
// Deposit tracking
mapping(address => uint256) lastDepositRequestId;
mapping(address => uint256) siloVirtualShares;     // Virtual shares in deposit silo
mapping(address => uint256) pendingDepositAssets;   // Original deposit amount

// Redeem tracking (similar pattern)
mapping(address => uint256) lastRedeemRequestId;
```

## Inherited Storage

The vault also inherits storage from OpenZeppelin upgradeable contracts:

| Contract                     | Storage                                    |
| ---------------------------- | ------------------------------------------ |
| `ERC20` (Solady)             | `_balances`, `_allowances`, `_totalSupply` |
| `AccessControlUpgradeable`   | `_roles` mapping                           |
| `PausableUpgradeable`        | `_paused` flag                             |
| `ReentrancyGuardUpgradeable` | `_status` lock                             |

These are all at standard slots, isolated from the ERC-7201 namespaced storage.

## Storage Verification

The project includes a storage layout checker test (`VaultStorageChecker`) that ensures the storage layout doesn't change between upgrades:

```
test/
└── unit/vault/StorageLayout/
    └── VaultStorageChecker.t.sol
```

This test compares the current storage layout against a reference to detect accidental slot changes that could corrupt data during upgrades.
