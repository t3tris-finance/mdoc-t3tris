---
title: Oracle Management
order: 6
---

# Oracle Management

The SafeOracle is the price feed mechanism for T3tris vaults. When the vault is closed (async mode), the oracle reports the total assets under management, which determines the NAV and Price Per Share (PPS) used for settlement calculations.

## How the Oracle Works

The `SafeOracle` is an ERC-1167 minimal proxy clone deployed per vault. It stores a single value: `totalAssets` — the total value of all assets under management by the asset manager.

```
Asset Manager ──setTotalAssets(NAV)──▶ SafeOracle ──totalAssets()──▶ Vault
```

### Price Deviation Bounds

To prevent oracle manipulation (flash loans, sandwich attacks, or erroneous updates), the SafeOracle enforces **deviation bounds** on each update:

```
newPPS = newTotalAssets × BPS_DIVISOR / totalNetSupply
oldPPS = lastSavedPricePerShare

// Check bounds
if newPPS > oldPPS:
  maxAllowedPPS = oldPPS × (10,000 + maxDeviationUpBps) / 10,000
  require(newPPS ≤ maxAllowedPPS)

if newPPS < oldPPS:
  minAllowedPPS = oldPPS × (10,000 - maxDeviationDownBps) / 10,000
  require(newPPS ≥ minAllowedPPS)
```

If the new PPS exceeds the deviation bounds, the `setTotalAssets()` call reverts.

## Reporting NAV

### Basic NAV Update

```solidity
// Report current total assets to the oracle
ISafeOracle(oracle).setTotalAssets(currentTotalAssets);
```

### Required Role

The caller must have `SET_TOTAL_ASSETS` role on the oracle contract.

### When to Update

- **Before each settlement**: So the settlement uses the correct NAV
- **Periodically between settlements**: To keep PPS accurate for view functions
- **Before opening the vault**: Settlement during `open()` uses the oracle NAV

### Handling Large NAV Changes

If the NAV change exceeds the deviation bounds (e.g., after a long period or a large gain/loss), you need to update the bounds first:

```solidity
// Increase the upper deviation bound temporarily
ISafeOracle(oracle).setMaxPricePerShareDeviationUp(5000);  // 50%

// Update NAV
ISafeOracle(oracle).setTotalAssets(newTotalAssets);

// Restore tight bounds
ISafeOracle(oracle).setMaxPricePerShareDeviationUp(500);  // 5%
```

## Configuration

### Setting Deviation Bounds

```solidity
// Max PPS increase per update (in bps)
ISafeOracle(oracle).setMaxPricePerShareDeviationUp(500);  // 5%

// Max PPS decrease per update (in bps)
ISafeOracle(oracle).setMaxPricePerShareDeviationDown(500);  // 5%
```

### Required Roles

| Function                           | Required Role                |
| ---------------------------------- | ---------------------------- |
| `setTotalAssets`                   | `SET_TOTAL_ASSETS`           |
| `setMaxPricePerShareDeviationUp`   | `SET_MAX_PPS_DEVIATION_UP`   |
| `setMaxPricePerShareDeviationDown` | `SET_MAX_PPS_DEVIATION_DOWN` |
| Manage roles                       | `DEFAULT_ADMIN_ROLE`         |

### Reading Oracle State

```solidity
// Current total assets
uint256 total = ISafeOracle(oracle).totalAssets();

// Last saved PPS (used for deviation checks)
uint256 lastPPS = ISafeOracle(oracle).getLastSavedPricePerShare();

// Current deviation bounds
uint16 maxUp = ISafeOracle(oracle).getMaxPricePerShareDeviationUpBps();
uint16 maxDown = ISafeOracle(oracle).getMaxPricePerShareDeviationDownBps();
```

## Changing the Oracle

The vault's oracle can be replaced:

```solidity
// Set a new oracle (requires UPDATE_ORACLE_ROLE)
IVault(vault).setOracle(IOracle(newOracle));
```

Any contract that implements the `IOracle` interface can serve as an oracle:

```solidity
interface IOracle {
    function totalAssets() external view returns (uint256);
}
```

This means you can use custom oracles — for example, a Chainlink-based oracle, a time-weighted average oracle, or a multi-sig reporting contract.

## Open Mode vs. Closed Mode Oracle

| Mode               | NAV Source | Description                                                        |
| ------------------ | ---------- | ------------------------------------------------------------------ |
| **Open (Sync)**    | Sync Silo  | `totalAssets = syncSilo.totalAssets()` (capped at `initialAssets`) |
| **Closed (Async)** | SafeOracle | `totalAssets = oracle.totalAssets()` (reported by asset manager)   |

When the vault is open, the oracle is **not used** — the sync silo provides the NAV directly. The oracle only matters when the vault is closed.

## Best Practices

1. **Update NAV before every settlement** — Stale NAV leads to incorrect PPS and unfair share pricing
2. **Use tight deviation bounds** — Typical values: 300-500 bps (3-5%) for daily updates
3. **Widen bounds temporarily for large changes** — Don't forget to tighten them again afterward
4. **Use a multi-sig for the SET_TOTAL_ASSETS role** — This is a critical role that directly affects share pricing
5. **Automate NAV reporting** — Consider bots or keeper networks for consistent updates
6. **Document your NAV methodology** — LPs need to trust the valuation process
