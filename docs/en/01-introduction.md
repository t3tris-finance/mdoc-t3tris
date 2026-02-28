---
title: Introduction
order: 1
---

# T3tris Protocol Documentation

T3tris is a tokenized vault protocol built on the **ERC-4626** standard, designed for professional asset management with institutional-grade features. The protocol implements a dual-phase operational model enabling both instant (synchronous) and batched (asynchronous) deposit/withdrawal flows — making it ideal for strategies that require periodic NAV calculations or off-chain asset management.

## Who Is This Documentation For?

This documentation is organized into three main sections, each tailored to a specific audience:

### Liquidity Providers (LPs)

If you want to deposit assets, earn yield, and manage your positions in T3tris vaults, the [LP Guide](/docs/02-liquidity-providers) is for you. It covers depositing, withdrawing, tracking your position, and understanding fees.

### Asset Managers

If you operate a vault — managing assets, running settlements, configuring fees, and handling silos — the [Asset Manager Guide](/docs/03-asset-managers) is your reference. It covers daily operations, settlement strategies, fee management, and silo operations.

### Developers

If you are integrating with T3tris contracts, building on top of the protocol, or contributing to the codebase, the [Developer Guide](/docs/04-developers) provides a complete technical reference. It covers the smart contract architecture, storage layout, access control, events, errors, and deployment.

## Core Value Proposition

- **Flexible Asset Management** — Supports both on-chain DeFi strategies and off-chain managed funds
- **Dual-Phase Operations** — Seamless switching between sync (instant) and async (batched) modes
- **Settlement Flow Optimization** — Net flow calculations minimize token transfers, reducing gas costs
- **Delayed Fee Claims** — Accumulate fees across settlements and claim in batches for operational efficiency
- **Professional Fee Structure** — Entry, exit, management, and performance fees with high-water mark protection
- **Yield on Idle Assets** — Multi-strategy silo system generates yield on pending deposits and redemptions
- **Oracle Manipulation Protection** — Configurable price deviation bounds prevent flash loan and sandwich attacks
- **Permit2 Integration** — Gasless approvals via Uniswap Permit2 for improved UX
- **Institutional Access Control** — 40+ role-based permissions with two-step transfers for critical admin functions
- **Deterministic Deployments** — CREATE3 enables predictable vault addresses across all EVM chains
- **UUPS Upgradeable** — Version-controlled upgrades with implementation whitelisting

## Architecture at a Glance

```
┌───────────────────────────────────────────────────────────────────────┐
│                              T3TRIS PROTOCOL                          │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐  │
│  │   T3tris.sol    │────▶│    Vault.sol    │◀────│  SafeOracle.sol │  │
│  │  (Factory)      │     │   (ERC-4626)    │     │   (NAV Oracle)  │  │
│  └─────────────────┘     └────────┬────────┘     └─────────────────┘  │
│                                   │                                   │
│                    ┌──────────────┼──────────────┐                    │
│                    │              │              │                    │
│              ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐              │
│              │ SyncSilo  │  │DepositSilo│  │RedeemSilo │              │
│              │(Open Mode)│  │(Async Dep)│  │(Async Red)│              │
│              └─────┬─────┘  └─────┬─────┘  └─────┬─────┘              │
│                    │              │              │                    │
│              ┌─────▼──────────────▼──────────────▼─────┐              │
│              │           Underlying Strategies         │              │
│              │     (AAVE, Compound, Custom, etc.)      │              │
│              └─────────────────────────────────────────┘              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

| Component            | Contract             | Purpose                                                          |
| -------------------- | -------------------- | ---------------------------------------------------------------- |
| **Protocol Factory** | `T3tris.sol`         | Deploys vaults, manages implementations, protocol-level controls |
| **Vault**            | `Vault.sol`          | ERC-4626 vault with dual-phase operations                        |
| **Silo**             | `Silo.sol`           | ERC-4626 wrapper managing yield strategies                       |
| **Oracle**           | `SafeOracle.sol`     | NAV reporting with manipulation protection                       |
| **Deployer**         | `T3trisDeployer.sol` | CREATE3 deterministic deployment                                 |

## Technical Details

- **Solidity**: ^0.8.34 (EVM target: Prague)
- **Framework**: Foundry + Soldeer dependency management
- **License**: BUSL-1.1 (core contracts), MIT (interfaces/oracles/scripts)
- **Dependencies**: OpenZeppelin 5.4.0, Solady 0.1.26, Uniswap Permit2, Aave v3 Origin 3.5.0
- **Testing**: 235 test files — unit, fuzz (10,000 runs), and invariant tests (10,000 runs, depth 15)
