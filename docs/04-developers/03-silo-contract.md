---
title: Silo Contract
order: 3
---

# Silo Contract Reference

The `Silo.sol` contract is an ERC-4626 compliant vault that manages underlying yield strategies. Each T3tris vault uses three silos: SyncSilo, DepositSilo, and RedeemSilo.

## Overview

The Silo implements a **single-strategy + IDLE bucket** architecture:

- An optional ERC-4626 strategy where assets earn yield
- An IDLE bucket where excess assets are stored directly in the Silo contract
- The IDLE balance (`_localBalance`) is tracked in storage (not via `balanceOf(this)`) to prevent donation attacks

## Constructor & Initialization

```solidity
constructor() {
    _disableInitializers();
}

function initialize(
    IERC20Metadata underlying_,
    IERC4626 strategy_,
    string memory name_,
    string memory symbol_,
    address owner_
) external initializer {
    // Sets underlying asset, strategy, ERC-20 metadata, and owner
}
```

## Core ERC-4626 Functions

### Deposit

```solidity
function deposit(uint256 assets, address receiver)
    external returns (uint256 shares);
```

Deposits `assets` into the silo. The assets are first added to the IDLE bucket, then optionally routed to the strategy based on `maxDeposit()` availability.

### Mint

```solidity
function mint(uint256 shares, address receiver)
    external returns (uint256 assets);
```

### Withdraw

```solidity
function withdraw(uint256 assets, address receiver, address owner)
    external returns (uint256 shares);
```

Withdraws from IDLE first, then from the strategy if needed.

### Redeem

```solidity
function redeem(uint256 shares, address receiver, address owner)
    external returns (uint256 assets);
```

## Strategy Management

### Set Strategy

```solidity
function setStrategy(IERC4626 newStrategy) external onlyOwner;
```

Changes the silo's yield strategy. When called:

1. All assets are withdrawn from the current strategy to IDLE
2. The strategy reference is updated
3. Assets must be manually allocated to the new strategy

Pass `address(0)` for IDLE-only mode (no yield strategy).

### Allocate to Strategy

```solidity
function allocateToStrategy(uint256 assets) external onlyOwner;
```

Moves `assets` from the IDLE bucket into the active strategy.

### Deallocate from Strategy

```solidity
function deallocateFromStrategy(uint256 assets) external onlyOwner;
```

Moves `assets` from the strategy back to the IDLE bucket.

## View Functions

### Total Assets

```solidity
function totalAssets() public view returns (uint256);
```

Returns `_localBalance + strategy.maxWithdraw(address(this))` — the sum of IDLE and strategy holdings.

### Conversion Functions

```solidity
function convertToShares(uint256 assets) public view returns (uint256);
function convertToAssets(uint256 shares) public view returns (uint256);
```

Standard ERC-4626 conversion with virtual offset protection against inflation attacks.

### Max Functions

```solidity
function maxDeposit(address) public view returns (uint256);
function maxMint(address) public view returns (uint256);
function maxWithdraw(address owner) public view returns (uint256);
function maxRedeem(address owner) public view returns (uint256);
```

### Preview Functions

```solidity
function previewDeposit(uint256 assets) public view returns (uint256);
function previewMint(uint256 shares) public view returns (uint256);
function previewWithdraw(uint256 assets) public view returns (uint256);
function previewRedeem(uint256 shares) public view returns (uint256);
```

## IDLE Bucket

The IDLE bucket holds assets directly in the silo contract without earning yield. It provides:

1. **Overflow handling**: When `strategy.maxDeposit()` is reached, excess stays in IDLE
2. **Donation attack prevention**: Using `_localBalance` instead of `IERC20.balanceOf(address(this))` prevents attackers from manipulating the silo's NAV via direct transfers
3. **Fast withdrawals**: Assets in IDLE can be withdrawn without touching the strategy

```solidity
// Internal tracking
uint256 _localBalance;

// Updated on every deposit/withdrawal
function _addToLocalBalance(uint256 amount) internal;
function _removeFromLocalBalance(uint256 amount) internal;
```

## Pausability & Security

```solidity
function pause() external onlyOwner;
function unpause() external onlyOwner;
```

When paused:

- `deposit()` and `mint()` revert
- `withdraw()` and `redeem()` revert
- View functions still work
- Owner functions still work

## Sweep

```solidity
function sweep(IERC20 token, address to, uint256 amount) external onlyOwner;
```

Sweeps stuck tokens. Cannot sweep:

- The underlying asset
- The strategy's share token

## Upgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal override onlyOwner;
```

The silo uses UUPS upgradeability. Only the owner (typically the T3tris protocol or vault) can authorize upgrades.

## Ownership

The silo uses Solady's 2-step `OwnableUpgradeable`:

```solidity
function transferOwnership(address newOwner) external onlyOwner;
function acceptOwnership() external; // Called by new owner
```

## Important Implementation Details

### Virtual Offset (Inflation Attack Protection)

The silo uses a virtual offset of 1 for share calculations:

```solidity
function _decimalsOffset() internal pure returns (uint8) {
    return 1; // 10^1 = 10 virtual shares
}
```

This prevents the classic ERC-4626 inflation attack where an attacker donates assets to the vault to steal deposits.

### Withdrawal Order

When withdrawing/redeeming, the silo withdraws from IDLE first, then from the strategy:

```
withdraw(100):
  IDLE has 30 → take 30 from IDLE
  Need 70 more → withdraw 70 from strategy
  Total: 100 assets out
```

### Deposit Routing

When depositing, assets go to IDLE first, then are routed to the strategy based on availability:

```
deposit(100):
  strategy.maxDeposit() = 80
  → 80 deposited into strategy
  → 20 stays in IDLE
```
