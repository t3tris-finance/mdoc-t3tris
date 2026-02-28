---
title: Deployment Guide
order: 11
---

# Deployment Guide

This guide covers how the T3tris protocol is deployed, how to deploy new vaults, and how to perform upgrades.

## Protocol Architecture

The T3tris deployment follows a layered architecture:

```
┌────────────────────────────────────────────────────┐
│  Layer 0: T3trisDeployer                           │
│  Deployed via ERC-2470 Singleton Factory           │
│  Provides CREATE3 deterministic deployments        │
│                                                    │
│  Address: 0x4Ddf8a9e7C43c1D1496c9760C5A7AD86097Ba5C7
└─────────────────────┬──────────────────────────────┘
                      │ deploys
┌─────────────────────▼──────────────────────────────┐
│  Layer 1: Implementation Contracts                 │
│  • Silo implementation                             │
│  • SafeOracle implementation                       │
│  • VaultGetterFallback implementation              │
│  • Vault implementation                            │
│  • T3tris implementation                           │
│  • AAVEDefaultStrategyGenerator                    │
└─────────────────────┬──────────────────────────────┘
                      │ referenced by
┌─────────────────────▼──────────────────────────────┐
│  Layer 2: T3tris Protocol (ERC-1967 Proxy)         │
│  UUPS upgradeable proxy → T3tris implementation    │
│  Factory for deploying new vaults                  │
│                                                    │
│  Address: 0x7DD63c4eE5CD277B7870155371a6d62A2f7b1652
└─────────────────────┬──────────────────────────────┘
                      │ creates
┌─────────────────────▼──────────────────────────────┐
│  Layer 3: Per-Vault Contracts                      │
│  • Vault proxy (ERC-1967, UUPS)                    │
│  • 3x Silo proxies (ERC-1967, UUPS)               │
│  • 1x SafeOracle clone (ERC-1167)                  │
└────────────────────────────────────────────────────┘
```

## CREATE3 Deterministic Addresses

All protocol contracts are deployed via CREATE3, which makes addresses deterministic and independent of constructor arguments:

```solidity
// Address = f(deployer, salt) — constructor args don't affect the address
address deployed = T3trisDeployer.deployCreate3(initCode, salt);
address predicted = T3trisDeployer.previewCreate3(salt);
```

The salt is scoped per-deployer via:

```solidity
bytes32 effectiveSalt = keccak256(abi.encodePacked(msg.sender, salt));
```

## Full Deployment Sequence

### Step 0: Deploy T3trisDeployer

Uses the [ERC-2470 Singleton Factory](https://eips.ethereum.org/EIPS/eip-2470) for cross-chain deterministic deployment:

```bash
forge script script/deployment/production/00_Periphery/00_DeployT3trisDeployer.s.sol \
  --rpc-url $RPC_URL \
  --broadcast
```

### Step 1: Deploy Periphery

```bash
# Deploy AAVEDefaultStrategyGenerator
forge script script/deployment/production/00_Periphery/01_DeployDefaultStrategyGenerator.s.sol \
  --rpc-url $RPC_URL \
  --broadcast
```

### Step 2: Deploy Implementations

Each implementation is deployed as a standalone contract (not behind a proxy):

```bash
# Deploy in order:
forge script script/deployment/production/01_Implementations/00_DeploySilo.s.sol \
  --rpc-url $RPC_URL --broadcast

forge script script/deployment/production/01_Implementations/01_DeploySafeOracle.s.sol \
  --rpc-url $RPC_URL --broadcast

forge script script/deployment/production/01_Implementations/02_DeployVaultGettersFallback.s.sol \
  --rpc-url $RPC_URL --broadcast

forge script script/deployment/production/01_Implementations/04_DeployVault.s.sol \
  --rpc-url $RPC_URL --broadcast

forge script script/deployment/production/01_Implementations/05_DeployT3tris.s.sol \
  --rpc-url $RPC_URL --broadcast
```

### Step 3: Deploy Protocol Proxy

Creates an ERC-1967 proxy pointing to the T3tris implementation:

```bash
forge script script/deployment/production/02_Protocol/00_DeployT3trisProtocol.s.sol \
  --rpc-url $RPC_URL \
  --broadcast
```

This proxy call `T3tris.initialize()` with:

- Strategy generator address
- SafeOracle implementation address
- Silo implementation address
- Vault implementation address
- T3tris treasury address
- Protocol owner address

### Full Deploy (All Steps)

```bash
forge script script/deployment/fork/00_DeployT3trisProtocol.sol \
  --rpc-url $RPC_URL \
  --broadcast
```

## Production Registry

All deployed addresses and salt values are stored in a central registry:

```solidity
// script/deployment/production/Utils/Constant.sol
library ProductionRegistry {
    // Deployer
    address constant T3TRIS_DEPLOYER =
        0x4Ddf8a9e7C43c1D1496c9760C5A7AD86097Ba5C7;

    // Implementations
    address constant SILO_IMPLEMENTATION_V1 =
        0xDb1f19666b074EDB670B42C408db227349d3771a;
    address constant SAFE_ORACLE_IMPLEMENTATION_V1 =
        0x6D159888740d7571f7f3EB52F195407cfEb1Bb54;
    address constant VAULT_GETTER_FALLBACK_IMPLEMENTATION_V1 =
        0x837bD6a51B582af08619d630313EB940059CeeB2;
    address constant VAULT_IMPLEMENTATION_V1 =
        0x845050d9D2CeD528625A0dDbB867BfA5e5eA3043;
    address constant T3TRIS_PROTOCOL_IMPLEMENTATION_V1 =
        0xDf1920C3d6195F9de7C2141fa98B33a3ec758A76;

    // Protocol Proxy
    address constant T3TRIS_PROTOCOL_V1 =
        0x7DD63c4eE5CD277B7870155371a6d62A2f7b1652;

    // Periphery
    address constant DEFAULT_STRATEGY_GENERATOR =
        0x55Ff61101A9915a1fEC210324f8A8b9b0babEAe8;

    // Admin
    address constant T3TRIS_OWNER =
        0x22545BFE233C9070D5d9A2c4fea2E7a214d37249;
    address constant T3TREASURY =
        0x7378153914Ec167e1f2548D2FF03F4E8e68Bf18a;
}
```

## Deploying a New Vault

Once the protocol is deployed, new vaults are created via `T3tris.deployVault()`:

```solidity
IT3tris protocol = IT3tris(0x7DD63c...);

IT3tris.VaultDeploymentParams memory params = IT3tris.VaultDeploymentParams({
    owner: msg.sender,
    underlying: IERC20Metadata(USDC_ADDRESS),
    shareName: "T3tris USDC Yield",
    shareSymbol: "t3USDC",
    assetManager: assetManagerAddress,
    feeRecipient: feeRecipientAddress,
    entryFeeBps: 50,       // 0.5%
    exitFeeBps: 50,        // 0.5%
    perfFeeBps: 2000,      // 20%
    managementFeeBps: 200, // 2%
    managementFeeDays: 365,
    maxPricePerShareDeviationUpBps: 500,   // 5%
    maxPricePerShareDeviationDownBps: 500, // 5%
    depositEnabled: true,
    transferEnabled: true,
    referralCode: bytes32(0)
});

(address vault, address oracle, address syncSilo, address depositSilo, address redeemSilo) =
    protocol.deployVault(params);
```

This single call deploys:

1. **Vault proxy** (ERC-1967 → Vault implementation)
2. **SafeOracle clone** (ERC-1167 minimal proxy)
3. **3 Silo proxies** (ERC-1967 → Silo implementation, one per flow: sync, deposit, redeem)

All with deterministic addresses via CREATE3.

## Upgrading Contracts

### Upgrade Silo

```bash
IMPLEMENTATION_SALT="new-silo-v2-salt" \
forge script script/upgrade/production/UpgradeSilo.s.sol \
  --sig "run(address)" $SILO_PROXY_ADDRESS \
  --rpc-url $RPC_URL \
  --broadcast
```

For batch upgrades:

```bash
forge script script/upgrade/production/UpgradeSilo.s.sol \
  --sig "upgradeMultipleSilos(address[])" "[$SILO1,$SILO2,$SILO3]" \
  --rpc-url $RPC_URL \
  --broadcast
```

### Upgrade T3tris Protocol

```bash
IMPLEMENTATION_SALT="new-t3tris-v2-salt" \
forge script script/upgrade/production/UpgradeT3tris.s.sol \
  --rpc-url $RPC_URL \
  --broadcast
```

### Vault Upgrades

Vault upgrades require the `UPGRADE_VAULT_ROLE` and are performed via the UUPS pattern:

```solidity
// Caller must have UPGRADE_VAULT_ROLE
vault.upgradeToAndCall(newImplementation, "");
```

## Operational Scripts

### Pause Operations

```bash
# Pause a single vault
forge script script/actions/production/pause/PauseVault.s.sol \
  --rpc-url $RPC_URL --broadcast

# Pause all vaults of a specific version
forge script script/actions/production/pause/PauseVaultVersion.s.sol \
  --rpc-url $RPC_URL --broadcast

# Pause the entire protocol
forge script script/actions/production/pause/PauseProtocol.s.sol \
  --rpc-url $RPC_URL --broadcast
```

### Ownership Transfers

Two-step ownership transfer scripts:

```bash
# Step 1: Initiate transfer
forge script script/actions/production/roles/TransferOwnershipVault.s.sol \
  --rpc-url $RPC_URL --broadcast

# Step 2: Accept transfer (from new owner)
forge script script/actions/production/roles/AcceptOwnershipVault.s.sol \
  --rpc-url $RPC_URL --broadcast
```

### Silo Operations

```bash
# Change strategy
forge script script/actions/production/silo/SetStrategySilo.s.sol \
  --rpc-url $RPC_URL --broadcast

# Rebalance between IDLE and strategy
forge script script/actions/production/silo/RebalanceSilo.s.sol \
  --rpc-url $RPC_URL --broadcast

# Sweep stuck tokens
forge script script/actions/production/silo/SweepSilo.s.sol \
  --rpc-url $RPC_URL --broadcast
```

## Vanity Address Mining

The project includes a vanity address miner (`script/helpers/vanity.ts`) that finds salt values producing addresses with desired prefixes (e.g., `0x0000000000...`):

```bash
bun run script/helpers/vanity.ts
```

This uses multi-threaded workers to brute-force salt values compatible with CREATE3 deterministic deployment.

## Environment Setup

Required environment variables:

```bash
# Private key for deployment
export PRIVATE_KEY=0x...

# RPC URL for target chain
export RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...

# For upgrades
export IMPLEMENTATION_SALT=some-unique-salt-string
```

## Chain Support

The protocol uses deterministic deployment (CREATE3 via ERC-2470), so the same addresses can be achieved on any EVM-compatible chain where:

1. The ERC-2470 Singleton Factory is deployed at `0xce0042B868300000d44A59004Da54A005ffdcf9f`
2. The deployer uses the same private key and salts
