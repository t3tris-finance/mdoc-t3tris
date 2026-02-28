---
title: Access Control
order: 6
---

# Access Control System

The T3tris protocol implements a comprehensive role-based access control system with ~40 granular roles, two-step transfers for critical admin roles, and a dual-admin hierarchy.

## Dual-Admin Architecture

The vault has two independent admin hierarchies:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     VAULT ADMIN (DEFAULT_ADMIN_ROLE)                │
│                     Role ID: 0x00                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Admin for most operational roles:                                  │
│  • PAUSE_ROLE / UNPAUSE_ROLE                                        │
│  • OPEN_ROLE / CLOSE_ROLE                                           │
│  • SETTLE_ROLE / SETTLE_DEPOSITS_ROLE / SETTLE_REDEMPTIONS_ROLE     │
│  • UPDATE_ACCRUED_FEES_ROLE / CLAIM_FEES_ROLE                       │
│  • UPDATE_ENTRY_FEE_BPS_ROLE / UPDATE_EXIT_FEE_BPS_ROLE             │
│  • UPDATE_PERF_FEE_BPS_ROLE / UPDATE_MGMT_FEE_BPS_ROLE             │
│  • UPGRADE_VAULT_ROLE                                               │
│  • ENABLE_END_OF_FUND_ROLE / DISABLE_END_OF_FUND_ROLE              │
│  • ENABLE_TRANSFER_ROLE / ENABLE_DEPOSIT_ROLE                       │
│  • ENABLE_WHITELIST_ROLE / SET_WHITELISTED_ROLE                     │
│  • UPDATE_ASSET_MANAGER_ROLE                                        │
│  • UPDATE_ORACLE_ROLE / SET_NAME_SYMBOL_ROLE / SET_IPFS_HASH_ROLE  │
│  • MINT_SHARES_ROLE                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              GOVERNANCE ADMIN (GOVERNANCE_ADMIN_ROLE)                │
│              Self-administered (its own admin)                       │
├─────────────────────────────────────────────────────────────────────┤
│  Admin for critical protocol roles:                                 │
│  • UPDATE_FEE_RECIPIENT_ROLE                                        │
│  • UPDATE_T3TREASURY_ROLE                                           │
│  • SET_SYNC_SILO_ROLE                                               │
│  • SET_DEPOSIT_SILO_ROLE                                            │
│  • SET_REDEEM_SILO_ROLE                                             │
│  • SWEEP_ROLE                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Two Admins?

This separation ensures:

- The **Vault Admin** controls operational aspects (opening, closing, settling, fees)
- The **Governance Admin** controls critical infrastructure (silos, treasury, fee recipient, sweep)
- Neither admin can control the other's roles
- Both use two-step transfer for safety

## Two-Step Admin Transfer

Critical admin roles use a two-step transfer process to prevent accidental loss:

```solidity
// Step 1: Current admin initiates transfer
vault.initGrantAdminRole(VAULT_ADMIN_ROLE, newAdmin);

// Step 2: New admin accepts
vault.acceptAdminRole(VAULT_ADMIN_ROLE); // Called by newAdmin

// Optional: Cancel pending transfer
vault.cancelGrantAdminRole(VAULT_ADMIN_ROLE);

// Burn: Permanently renounce admin role
vault.applyAdminBurn(VAULT_ADMIN_ROLE);
```

**Applicable to:**

- `DEFAULT_ADMIN_ROLE` (Vault Admin)
- `GOVERNANCE_ADMIN_ROLE`

## Complete Role Reference

### Operational Roles (Admin: DEFAULT_ADMIN_ROLE)

| Role Constant              | keccak256 Hash                          | Permission                     |
| -------------------------- | --------------------------------------- | ------------------------------ |
| `PAUSE_ROLE`               | `keccak256("PAUSE_ROLE")`               | Pause vault operations         |
| `UNPAUSE_ROLE`             | `keccak256("UNPAUSE_ROLE")`             | Resume vault operations        |
| `OPEN_ROLE`                | `keccak256("OPEN_ROLE")`                | Open vault (async → sync)      |
| `CLOSE_ROLE`               | `keccak256("CLOSE_ROLE")`               | Close vault (sync → async)     |
| `SETTLE_ROLE`              | `keccak256("SETTLE_ROLE")`              | Full settlement                |
| `SETTLE_DEPOSITS_ROLE`     | `keccak256("SETTLE_DEPOSITS_ROLE")`     | Settle deposits only           |
| `SETTLE_REDEMPTIONS_ROLE`  | `keccak256("SETTLE_REDEMPTIONS_ROLE")`  | Settle redemptions only        |
| `UPDATE_ACCRUED_FEES_ROLE` | `keccak256("UPDATE_ACCRUED_FEES_ROLE")` | Accrue fees without settlement |
| `CLAIM_FEES_ROLE`          | `keccak256("CLAIM_FEES_ROLE")`          | Claim accumulated fees         |
| `ENABLE_END_OF_FUND_ROLE`  | `keccak256("ENABLE_END_OF_FUND_ROLE")`  | Enable EOF mode                |
| `DISABLE_END_OF_FUND_ROLE` | `keccak256("DISABLE_END_OF_FUND_ROLE")` | Disable EOF mode               |
| `UPGRADE_VAULT_ROLE`       | `keccak256("UPGRADE_VAULT_ROLE")`       | Authorize UUPS upgrades        |
| `MINT_SHARES_ROLE`         | `keccak256("MINT_SHARES_ROLE")`         | Mint shares directly           |

### Fee Roles (Admin: DEFAULT_ADMIN_ROLE)

| Role Constant               | Permission               |
| --------------------------- | ------------------------ |
| `UPDATE_ENTRY_FEE_BPS_ROLE` | Set next entry fee       |
| `UPDATE_EXIT_FEE_BPS_ROLE`  | Set next exit fee        |
| `UPDATE_PERF_FEE_BPS_ROLE`  | Set next performance fee |
| `UPDATE_MGMT_FEE_BPS_ROLE`  | Set next management fee  |

### Configuration Roles (Admin: DEFAULT_ADMIN_ROLE)

| Role Constant               | Permission                   |
| --------------------------- | ---------------------------- |
| `UPDATE_ASSET_MANAGER_ROLE` | Change asset manager address |
| `UPDATE_ORACLE_ROLE`        | Change oracle address        |
| `ENABLE_TRANSFER_ROLE`      | Toggle share transfers       |
| `ENABLE_DEPOSIT_ROLE`       | Toggle deposits              |
| `ENABLE_WHITELIST_ROLE`     | Toggle whitelist mode        |
| `SET_WHITELISTED_ROLE`      | Add/remove from whitelist    |
| `SET_NAME_SYMBOL_ROLE`      | Update share name/symbol     |
| `SET_IPFS_HASH_ROLE`        | Update metadata IPFS hash    |

### Governance Roles (Admin: GOVERNANCE_ADMIN_ROLE)

| Role Constant               | Permission             |
| --------------------------- | ---------------------- |
| `UPDATE_FEE_RECIPIENT_ROLE` | Change fee recipient   |
| `UPDATE_T3TREASURY_ROLE`    | Change T3tris treasury |
| `SET_SYNC_SILO_ROLE`        | Change sync silo       |
| `SET_DEPOSIT_SILO_ROLE`     | Change deposit silo    |
| `SET_REDEEM_SILO_ROLE`      | Change redeem silo     |
| `SWEEP_ROLE`                | Sweep stuck tokens     |

## Role Initialization

During vault deployment, roles are initialized via `CoreRolesSettersLib`:

```solidity
// Owner gets DEFAULT_ADMIN_ROLE and GOVERNANCE_ADMIN_ROLE
_grantRole(DEFAULT_ADMIN_ROLE, owner);
_grantRole(GOVERNANCE_ADMIN_ROLE, owner);

// GOVERNANCE_ADMIN_ROLE is self-administered
_setRoleAdmin(GOVERNANCE_ADMIN_ROLE, GOVERNANCE_ADMIN_ROLE);

// Each governance role gets GOVERNANCE_ADMIN_ROLE as its admin
_setRoleAdmin(UPDATE_FEE_RECIPIENT_ROLE, GOVERNANCE_ADMIN_ROLE);
_setRoleAdmin(UPDATE_T3TREASURY_ROLE, GOVERNANCE_ADMIN_ROLE);
// ... etc
```

## Role Checking

```solidity
// Check if an address has a role
bool has = vault.hasRole(SETTLE_ROLE, someAddress);

// Get the admin role for a given role
bytes32 admin = vault.getRoleAdmin(SETTLE_ROLE);
```

## Granting and Revoking Roles

Standard OpenZeppelin AccessControl:

```solidity
// Grant a role (caller must have the role's admin)
vault.grantRole(SETTLE_ROLE, settlerAddress);

// Revoke a role
vault.revokeRole(SETTLE_ROLE, settlerAddress);

// Renounce your own role
vault.renounceRole(SETTLE_ROLE, msg.sender);
```

## Oracle Roles

The SafeOracle has its own independent role system:

```solidity
// Oracle-specific roles
bytes32 constant SET_TOTAL_ASSETS = keccak256("SET_TOTAL_ASSETS");
bytes32 constant SET_MAX_PPS_DEVIATION_UP = keccak256("SET_MAX_PPS_DEVIATION_UP");
bytes32 constant SET_MAX_PPS_DEVIATION_DOWN = keccak256("SET_MAX_PPS_DEVIATION_DOWN");
```

These are managed via the oracle's `DEFAULT_ADMIN_ROLE`, which is typically granted to the vault owner during deployment.

## Silo Ownership

Silos use Solady's `OwnableUpgradeable` (not AccessControl):

```solidity
// Silo owner can:
// - setStrategy()
// - allocateToStrategy()
// - deallocateFromStrategy()
// - pause() / unpause()
// - sweep()
// - transferOwnership()
```

The silo owner is typically the vault contract itself.
