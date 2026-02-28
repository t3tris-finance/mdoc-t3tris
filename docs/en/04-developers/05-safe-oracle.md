---
title: SafeOracle
order: 5
---

# SafeOracle Contract Reference

The `SafeOracle.sol` contract provides NAV reporting with manipulation protection via configurable price deviation bounds.

## Overview

```solidity
contract SafeOracle is Initializable, AccessControlUpgradeable, ISafeOracle
```

SafeOracle instances are deployed as **ERC-1167 minimal proxy clones** — each vault gets its own oracle instance cloned from a shared implementation.

## Initialization

```solidity
function initialize(
    address vault_,
    uint16 maxPricePerShareDeviationUpBps_,
    uint16 maxPricePerShareDeviationDownBps_
) external initializer;
```

**Parameters:**

- `vault_`: The vault this oracle serves (used for PPS calculations)
- `maxPricePerShareDeviationUpBps_`: Maximum allowed PPS increase per update (in bps)
- `maxPricePerShareDeviationDownBps_`: Maximum allowed PPS decrease per update (in bps)

## Core Functions

### Set Total Assets

```solidity
function setTotalAssets(uint256 newTotalAssets) external onlyRole(SET_TOTAL_ASSETS);
```

Updates the total assets value reported by the oracle. This function:

1. Computes the new PPS: `newPPS = newTotalAssets × BPS_DIVISOR / totalNetSupply`
2. Checks against deviation bounds:
   - Upper: `newPPS ≤ lastPPS × (10,000 + maxUpBps) / 10,000`
   - Lower: `newPPS ≥ lastPPS × (10,000 - maxDownBps) / 10,000`
3. If within bounds: updates `_totalAssets` and `lastSavedPricePerShare`
4. If out of bounds: **reverts**

### Total Assets (View)

```solidity
function totalAssets() external view returns (uint256);
```

Returns the last reported total assets value. This is the `IOracle` interface function that the vault calls.

## Configuration

### Set Deviation Bounds

```solidity
function setMaxPricePerShareDeviationUp(uint16 newMaxBps)
    external onlyRole(SET_MAX_PPS_DEVIATION_UP);

function setMaxPricePerShareDeviationDown(uint16 newMaxBps)
    external onlyRole(SET_MAX_PPS_DEVIATION_DOWN);
```

### Get Deviation Bounds

```solidity
function getMaxPricePerShareDeviationUpBps() external view returns (uint16);
function getMaxPricePerShareDeviationDownBps() external view returns (uint16);
```

### Get Last PPS

```solidity
function getLastSavedPricePerShare() external view returns (uint256);
```

## Access Control Roles

The SafeOracle uses OpenZeppelin's `AccessControl`:

| Role                         | Permission             | Typical Holder      |
| ---------------------------- | ---------------------- | ------------------- |
| `DEFAULT_ADMIN_ROLE` (0x00)  | Manage all other roles | Vault owner         |
| `SET_TOTAL_ASSETS`           | Update NAV             | Asset manager / bot |
| `SET_MAX_PPS_DEVIATION_UP`   | Change upper bound     | Vault owner         |
| `SET_MAX_PPS_DEVIATION_DOWN` | Change lower bound     | Vault owner         |

Role hashes:

```solidity
bytes32 constant SET_TOTAL_ASSETS = keccak256("SET_TOTAL_ASSETS");
bytes32 constant SET_MAX_PPS_DEVIATION_UP = keccak256("SET_MAX_PPS_DEVIATION_UP");
bytes32 constant SET_MAX_PPS_DEVIATION_DOWN = keccak256("SET_MAX_PPS_DEVIATION_DOWN");
```

## Deployment (Clone Factory)

SafeOracle instances are deployed as ERC-1167 minimal proxies via the T3tris factory:

```solidity
// In T3tris.deployVault():
address oracleClone = Clones.clone(safeOracleImplementation);
ISafeOracle(oracleClone).initialize(
    vault,
    maxDeviationUpBps,
    maxDeviationDownBps
);
```

This saves ~90% gas compared to deploying full contract instances.

## IOracle Interface

The vault interacts with the oracle via the minimal `IOracle` interface:

```solidity
interface IOracle {
    function totalAssets() external view returns (uint256);
}
```

This means **any contract implementing `IOracle`** can serve as a vault's NAV provider — not just SafeOracle. Custom implementations could use:

- Chainlink price feeds
- TWAP (Time-Weighted Average Price)
- Multi-sig controlled values
- Automated NAV calculation from on-chain positions

## Deviation Bound Examples

| Scenario           | Max Up           | Max Down         | Effect                             |
| ------------------ | ---------------- | ---------------- | ---------------------------------- |
| Conservative daily | 300 bps (3%)     | 300 bps (3%)     | Max ±3% PPS change per update      |
| Moderate weekly    | 1000 bps (10%)   | 500 bps (5%)     | Allows larger gains, limits losses |
| Volatile assets    | 2000 bps (20%)   | 2000 bps (20%)   | For crypto-native strategies       |
| Temporary unlock   | 10000 bps (100%) | 10000 bps (100%) | Effectively no bounds              |

## Security Considerations

1. **Always use tight bounds** — Loose bounds reduce protection against manipulation
2. **Order of operations matters** — Update bounds before large NAV changes, then tighten again
3. **Multi-sig for SET_TOTAL_ASSETS** — This role directly controls share pricing
4. **PPS is stored per-update** — Each update checks against the last saved PPS, not the initial PPS
5. **First update** — On the very first `setTotalAssets()` call after initialization, `lastSavedPricePerShare` is 0, so bounds are not enforced
