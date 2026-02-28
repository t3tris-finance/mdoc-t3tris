---
title: Architecture Overview
order: 1
---

# Smart Contract Architecture

This section provides a complete technical deep-dive into the T3tris protocol smart contract architecture.

## Contract Hierarchy

```
T3tris (Factory / Registry / UUPS Proxy)
│
├── T3trisDeployer (CREATE3 deterministic deployment)
│
├── Vault (ERC-4626 + ERC-20 + AccessControl + UUPS Proxy)
│   │
│   ├── VaultAdminFallback (delegatecall target)
│   │   └── VaultGetterFallback (delegatecall target)
│   │
│   ├── SafeOracle (ERC-1167 clone, NAV reporting)
│   │
│   ├── SyncSilo (ERC-4626, single-strategy + IDLE)
│   ├── DepositSilo (ERC-4626, single-strategy + IDLE)
│   └── RedeemSilo (ERC-4626, single-strategy + IDLE)
│
└── AAVEDefaultStrategyGenerator (strategy factory)
```

## Design Patterns

### 1. Delegatecall Fallback Pattern

The Vault contract exceeds the 24KB EVM contract size limit. To solve this, logic is split across three contracts sharing the same storage:

```
User calls vault.someFunction()
  │
  ├── Found in Vault.sol? → Execute directly
  │
  └── Not found → fallback() → delegatecall to VaultAdminFallback
       │
       ├── Found in VaultAdminFallback.sol? → Execute
       │
       └── Not found → fallback() → delegatecall to VaultGetterFallback
            │
            └── Found → Execute
```

**Key detail:** Fallback contracts share the same storage layout (ERC-7201 namespaced storage). The fallback addresses are `immutable` in each contract.

### 2. ERC-7201 Namespaced Storage

All vault-specific state is stored in a single `Storage` struct at a computed slot:

```solidity
bytes32 constant STORAGE_SLOT = keccak256("t3tris.vault.storage.main") - 1;

function _getMainStorage() internal pure returns (Storage storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly { s.slot := slot }
}
```

This prevents storage collisions with inherited contracts (OZ AccessControl, Pausable, ERC20, etc.).

### 3. CREATE3 Deterministic Deployment

All contracts are deployed via `T3trisDeployer` using Solady's CREATE3:

```solidity
address deployed = T3trisDeployer.deployCreate3(initCode, salt);
// Address = f(deployer, salt) — independent of initCode
```

Benefits:

- Same address on every EVM chain
- Pre-compute addresses before deployment
- Integration partners can hardcode addresses

### 4. ERC-1167 Minimal Proxies

SafeOracle instances are deployed as **minimal proxy clones**, reducing gas costs:

```solidity
oracle = ISafeOracle(Clones.clone(safeOracleImplementation));
oracle.initialize(vault, maxDeviationUp, maxDeviationDown);
```

### 5. UUPS Upgradeable Proxies

All core contracts (Vault, Silo, T3tris) use OpenZeppelin's UUPS pattern:

```solidity
// Authorization check in Vault
function _authorizeUpgrade(address newImplementation) internal override {
    _checkRole(UPGRADE_VAULT_ROLE);
    // Verify new implementation is whitelisted by T3tris factory
    require(t3trisProtocol.implementationVersions(newImplementation) != 0);
}
```

## Library Architecture

The vault's logic is decomposed into ~40 internal libraries categorized by function:

```
libraries/
├── Core/
│   ├── Access/
│   │   ├── Operators/          — Operator management
│   │   └── Roles/              — Role hierarchy, admin transfers
│   ├── Accounting/
│   │   ├── ValuationLib.sol    — Total assets, net supply, TVL
│   │   └── PendingFeesLib.sol  — Fee accrual and claiming
│   ├── Constants/
│   │   ├── CoreConstantLib.sol — BPS_DIVISOR, PERMIT2
│   │   └── VaultRolesLib.sol   — 40+ role hashes
│   ├── Infrastructure/
│   │   └── StorageLib.sol      — Storage initialization
│   └── CoreSiloLib.sol         — Silo PnL computation
│
├── Async/
│   ├── Fees/
│   │   ├── CoreFeesLib.sol         — Fee parameter updates
│   │   ├── CoreFlowFeesLib.sol     — Entry/exit fee routing
│   │   └── PeriodFees/
│   │       ├── CorePeriodFeesLib.sol   — Management→PPS→performance chain
│   │       ├── ManagementFeesLib.sol   — Time-proportional management fees
│   │       ├── PerformanceFeesLib.sol  — HWM-based performance fees
│   │       ├── InflowFeesLib.sol       — Entry fee computation
│   │       └── OutflowFeesLib.sol      — Exit fee computation
│   │
│   ├── Flows/
│   │   ├── AsyncFlow/
│   │   │   ├── AsyncFlowExecutionLib.sol  — settle() + transfer routing
│   │   │   └── AsyncFlowHelpersLib.sol    — Settlement previews
│   │   ├── AsyncInflow/
│   │   │   ├── DepositRequestLib.sol      — Async deposit requests
│   │   │   ├── SettleDepositsLib.sol      — Deposit settlement
│   │   │   └── ClaimDepositsLib.sol       — Deposit claiming
│   │   └── AsyncOutflow/
│   │       ├── RedeemRequestLib.sol       — Async redemption requests
│   │       ├── SettleRedemptionsLib.sol   — Redemption settlement
│   │       ├── ClaimRedeemLib.sol         — Redemption claiming
│   │       └── OpenLib.sol               — Vault opening lifecycle
│   │
│   └── Silo/
│       ├── DepositSiloLib.sol  — Deposit silo management
│       ├── RedeemSiloLib.sol   — Redeem silo management
│       └── SyncSiloLib.sol     — Sync silo management
│
└── Sync/
    └── Flows/
        ├── SyncInflow/
        │   ├── SyncDepositLib.sol  — Sync deposits with PnL routing
        │   └── SyncMintLib.sol     — Sync mints
        └── SyncOutflow/
            ├── SyncRedeemLib.sol   — Sync redemptions
            ├── SyncWithdrawLib.sol — Sync withdrawals
            └── CloseLib.sol       — Vault closing
```

## Contract Sizes

| Contract                  | Lines  | Description                                                      |
| ------------------------- | ------ | ---------------------------------------------------------------- |
| `Vault.sol`               | ~828   | Core vault: ERC-20, AccessControl, Pausable, UUPS, Multicallable |
| `VaultGetterFallback.sol` | ~856   | All view/getter functions                                        |
| `T3tris.sol`              | ~465   | Factory: CREATE3 deployment, version management                  |
| `Silo.sol`                | ~753   | Single-strategy + IDLE, ERC-20, UUPS                             |
| `SafeOracle.sol`          | ~212   | PPS deviation bounds, ERC-1167 clone                             |
| Libraries (total)         | ~4,013 | 40 library files                                                 |
| Interfaces (total)        | ~2,283 | 13 interface files                                               |

## Dependencies

| Package         | Version | Usage                                                        |
| --------------- | ------- | ------------------------------------------------------------ |
| OpenZeppelin    | 5.4.0   | AccessControl, Pausable, UUPS, ReentrancyGuard, ERC1967Proxy |
| Solady          | 0.1.26  | ERC20, CREATE3, FixedPointMathLib, Multicallable, Clones     |
| Uniswap Permit2 | —       | Gasless token approvals                                      |
| Aave v3 Origin  | 3.5.0   | StataTokenFactory for default strategy                       |

## Inheritance Diagram

### Vault

```
Vault
├── OwnableUpgradeable (Solady)
├── ERC20 (Solady) — custom, not upgradeable
├── AccessControlUpgradeable (OZ)
├── PausableUpgradeable (OZ)
├── ReentrancyGuardUpgradeable (OZ)
├── UUPSUpgradeable (OZ)
└── Multicallable (Solady)
```

### Silo

```
Silo
├── ERC20 (Solady)
├── OwnableUpgradeable (Solady) — 2-step
├── PausableUpgradeable (OZ)
├── ReentrancyGuardUpgradeable (OZ)
└── UUPSUpgradeable (OZ)
```
