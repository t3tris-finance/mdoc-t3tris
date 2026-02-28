---
title: Getting Started
order: 1
---

# Getting Started as a Liquidity Provider

As a Liquidity Provider (LP) in the T3tris protocol, you deposit assets into vaults to earn yield. Each vault is managed by an asset manager who deploys your capital into various strategies — either on-chain (DeFi protocols) or off-chain (managed funds).

## Key Concepts

### What Is a T3tris Vault?

A T3tris vault is an **ERC-4626 compliant** tokenized vault. When you deposit assets (e.g., USDC, WETH), you receive **shares** that represent your proportional ownership of the vault's total assets. As the vault generates yield, the value of your shares increases.

### Two Operational Modes

T3tris vaults operate in two modes, and the mode determines how your deposits and withdrawals work:

| Mode               | Deposits                                          | Withdrawals                                       | When                                                |
| ------------------ | ------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| **Open (Sync)**    | Instant — you get shares immediately              | Instant — you get assets immediately              | Vault is actively managing assets on-chain          |
| **Closed (Async)** | Request-based — shares delivered after settlement | Request-based — assets delivered after settlement | Vault is managing assets off-chain or computing NAV |

> **Note:** You don't choose the mode — it's set by the vault's asset manager. Most vaults alternate between open and closed modes as part of their normal operational cycle.

### Shares and Price Per Share (PPS)

Your shares represent a proportional claim on the vault's total assets. The **Price Per Share (PPS)** determines the conversion rate:

```
assets = shares × PPS
shares = assets / PPS
```

As the vault earns yield, PPS increases, and your shares become worth more assets.

## Before You Start

1. **Choose a vault** — Each vault has a specific underlying asset (e.g., USDC), fee structure, and strategy
2. **Approve spending** — You'll need to approve the vault to spend your tokens (standard ERC-20 `approve`)
3. **Check whitelist** — Some vaults restrict deposits or withdrawals to whitelisted addresses

### Checking If a Vault Is Open

You can check the vault's current state:

```solidity
// Returns true if vault is in open (synchronous) mode
bool isOpen = IVault(vault).getIsVaultOpen();

// Returns true if vault is in End of Fund mode (withdrawals only)
bool isEOF = IVault(vault).getEndOfFund();
```

### Checking Deposit/Withdrawal Limits

```solidity
// Maximum assets you can deposit right now
uint256 maxDep = IVault(vault).maxDeposit(yourAddress);

// Maximum shares you can redeem right now
uint256 maxRed = IVault(vault).maxRedeem(yourAddress);
```

A return value of `0` means deposits or redemptions are currently disabled (vault may be closed, paused, or you may not be whitelisted).

## Using Permit2 (Gasless Approvals)

T3tris integrates with **Uniswap Permit2**, which lets you approve token spending via a signature instead of a separate transaction, saving gas and improving UX.

Instead of:

1. `token.approve(vault, amount)` (transaction 1)
2. `vault.deposit(amount, receiver)` (transaction 2)

You can do:

1. Sign a Permit2 message off-chain (free)
2. `vault.deposit(amount, receiver, permit2Data)` (single transaction)

The `permit2Data` parameter is encoded as:

```solidity
bytes memory permit2Data = abi.encode(
    IAllowanceTransfer.PermitSingle permit,
    bytes signature
);
```
