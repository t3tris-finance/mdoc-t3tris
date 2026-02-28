---
title: Vault Contract
order: 2
---

# Vault Contract Reference

The `Vault.sol` contract is the core of the T3tris protocol. It implements the ERC-4626 tokenized vault standard with dual-phase (sync/async) operations.

## Constructor & Initialization

The Vault is deployed behind a UUPS proxy. The constructor only sets the immutable fallback address:

```solidity
constructor(address vaultAdminFallback) {
    VAULT_ADMIN_FALLBACK = vaultAdminFallback;
    _disableInitializers();
}
```

Initialization is called once via the proxy:

```solidity
function initialize(
    VaultParams calldata params
) external initializer {
    // Sets up:
    // - ERC-20 name/symbol
    // - Underlying asset
    // - All fee parameters
    // - Oracle, silos, addresses
    // - Role hierarchy
    // - Initial state
}
```

### `VaultParams` Struct

```solidity
struct VaultParams {
    string shareName;
    string shareSymbol;
    string ipfsHash;
    GlobalFeesParams globalFeesParams;
    IERC20Metadata underlyingAsset;
    IOracle oracle;
    address owner;
    address assetManager;
    address feeRecipient;
    address t3treasury;
    bool transferEnabled;
    bool depositEnabled;
    bool depositWhitelistEnabled;
    bool withdrawWhitelistEnabled;
    bool vaultOpened;
    IT3tris t3trisProtocol;
    IERC4626 syncSilo;
    IERC4626 depositSilo;
    IERC4626 redeemSilo;
}
```

## ERC-4626 Functions (Sync Mode)

These functions only work when `isVaultOpen = true`:

### Deposit

```solidity
function deposit(uint256 assets, address receiver)
    external returns (uint256 shares);

function deposit(uint256 assets, address receiver, bytes memory permit2Data)
    external returns (uint256 shares);
```

Deposits `assets` into the vault and mints proportional `shares` to `receiver`. Assets are deposited into the sync silo. Entry fees are applied.

### Mint

```solidity
function mint(uint256 shares, address receiver)
    external returns (uint256 assets);

function mint(uint256 shares, address receiver, bytes memory permit2Data)
    external returns (uint256 assets);
```

Mints exactly `shares` to `receiver`, pulling the required `assets`.

### Withdraw

```solidity
function withdraw(uint256 assets, address to, address owner)
    external returns (uint256 shares);
```

Withdraws exactly `assets` from the vault, burning the required `shares` from `owner`. If `msg.sender != owner`, requires ERC-20 approval.

### Redeem

```solidity
function redeem(uint256 shares, address to, address owner)
    external returns (uint256 shares);
```

Burns `shares` from `owner` and sends the proportional `assets` to `to`.

## Async Functions (Closed Mode)

### Request Deposit

```solidity
function requestDeposit(uint256 assets, address receiver) external;
function requestDeposit(uint256 assets, address receiver, bytes memory permit2Data) external;
```

Transfers `assets` to the deposit silo and records a pending deposit for `receiver`. Auto-claims any outstanding deposit from a previous settlement.

### Decrease Deposit Request

```solidity
function decreaseDepositRequest(uint256 assets, address receiver) external;
```

Reduces a pending deposit by `assets` and returns them to `receiver`. Only works before settlement.

### Claim Deposit

```solidity
function claimDeposit(address receiver) external returns (uint256 shares);
```

Claims minted shares from a settled deposit request. Transfers shares to `receiver`.

### Request Redeem

```solidity
function requestRedeem(
    uint256 shares,
    address receiver,
    address owner,
    address previousClaimReceiver
) external;
```

Locks `shares` and records a pending redemption for `receiver`. If a previous unclaimed redemption exists, it is automatically claimed and sent to `previousClaimReceiver`.

### Decrease Redeem Request

```solidity
function decreaseRedeemRequest(uint256 shares, address owner, address receiver) external;
```

Reduces a pending redemption by `shares`, returning shares to `receiver`.

### Claim Redeem

```solidity
function claimRedeem(address owner, address receiver) external returns (uint256 assets);
```

Claims assets from a settled redemption request.

## Settlement Functions

### Full Settlement

```solidity
function settle(
    IAsync.FeeClaimType feeClaimType,
    bytes memory permit2Data
) external returns (IAsync.SettleResult memory result);
```

Settles both deposits and redemptions in one transaction. See the [Settlement guide](/docs/03-asset-managers/03-settlement) for details.

### Settle Deposits Only

```solidity
function settleDeposits(IAsync.FeeClaimType feeClaimType)
    external returns (IAsync.SettleDepositResult memory result);
```

### Settle Redemptions Only

```solidity
function settleRedemptions(bool fullClaim)
    external returns (IAsync.SettleRedemptionsResult memory result);
```

## Lifecycle Functions

### Open

```solidity
function open(
    IAsync.FeeClaimType feeClaimType,
    bytes memory permit2DataOpen
) external returns (IAsync.OpenResult memory result);
```

### Close

```solidity
function close() external returns (uint256 returnedAssets);
```

### End of Fund

```solidity
function enableEndOfFund(
    IAsync.FeeClaimType feeClaimType,
    bytes memory permit2DataOpen
) external returns (IAsync.OpenResult memory result);

function disableEndOfFund(bool closeVault) external returns (uint256 returnedAssets);
```

## Fee Functions

```solidity
function updateAccruedFees() external;
function claimFees(uint256 sharesFeeToClaim) external;

function setNextEntryFee(uint16 newEntryFeeBps) external;
function setNextExitFee(uint16 newExitFeeBps) external;
function setNextPerformanceFee(uint16 newPerfFeeBps) external;
function setNextManagementFee(uint16 newManagementFeeBps, uint32 newManagementFeeDays) external;
```

## Access Control Functions

### Two-Step Admin Transfer

```solidity
function initGrantAdminRole(bytes32 role, address account) external;
function cancelGrantAdminRole(bytes32 role) external;
function acceptAdminRole(bytes32 role) external;
function applyAdminBurn(bytes32 role) external;
```

### Whitelist Functions

```solidity
function setDepositWhitelistEnabled(bool enabled) external;
function setWithdrawWhitelistEnabled(bool enabled) external;
function setDepositWhitelisted(address account, bool whitelisted) external;
function setWithdrawWhitelisted(address account, bool whitelisted) external;
```

### Configuration Functions (via VaultAdminFallback)

```solidity
function setAssetManager(address assetManager) external;
function setFeeRecipient(address feeRecipient) external;
function setT3treasury(address t3treasury) external;
function setOracle(IOracle oracle) external;
function setSyncSilo(IERC4626 syncSilo) external;
function setDepositSilo(IERC4626 depositSilo) external;
function setRedeemSilo(IERC4626 redeemSilo) external;
function setTransferEnabled(bool enabled) external;
function setDepositEnabled(bool enabled) external;
function setNameSymbol(string calldata name, string calldata symbol) external;
function setIpfsHash(string calldata ipfsHash) external;
```

## ERC-20 Overrides

The Vault inherits from Solady's ERC-20 with custom overrides:

```solidity
// Transfer is only allowed when transferEnabled = true
function transfer(address to, uint256 value) public override returns (bool);
function transferFrom(address from, address to, uint256 value) public override returns (bool);

// name() and symbol() read from Storage, not immutable
function name() public view override returns (string memory);
function symbol() public view override returns (string memory);

// decimals() matches the underlying asset
function decimals() public view override returns (uint8);
```

## Fallback

```solidity
fallback() external payable {
    address target = VAULT_ADMIN_FALLBACK;
    assembly {
        calldatacopy(0, 0, calldatasize())
        let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
        returndatacopy(0, 0, returndatasize())
        switch result
        case 0 { revert(0, returndatasize()) }
        default { return(0, returndatasize()) }
    }
}
```

The fallback delegates to `VaultAdminFallback`, which in turn delegates to `VaultGetterFallback` if the function is not found.

## Modifiers & Guards

| Guard                | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `whenNotPaused`      | Reverts if vault or protocol is paused                            |
| `nonReentrant`       | Prevents reentrancy                                               |
| `onlyRole(role)`     | Requires caller to have the specified role                        |
| Whitelist checks     | Applied to deposit/withdraw functions when whitelists are enabled |
| Protocol pause check | Checks both vault-level and protocol-level pause state            |
