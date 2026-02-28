---
title: Protocol Factory
order: 4
---

# Protocol Factory (T3tris.sol)

The `T3tris.sol` contract serves as the protocol's central factory and registry. It deploys vaults, manages implementation versions, and provides protocol-wide controls.

## Overview

```solidity
contract T3tris is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
```

The T3tris contract is itself deployed behind a UUPS proxy and uses Solady's 2-step `OwnableUpgradeable`.

## Initialization

```solidity
function initialize(
    address owner_,
    IT3trisDeployer t3trisDeployer_,
    address safeOracleImplementation_,
    address siloImplementation_
) external initializer;
```

Sets the protocol owner, deployer, and base implementations for oracles and silos.

## Vault Deployment

### `deployVault`

```solidity
function deployVault(
    VaultDeploymentParams calldata params,
    IOracle oracle,
    bytes32 salt,
    bytes32 referralCode
) external returns (address vault_);
```

Deploys a new vault with deterministic addressing via CREATE3.

**Deployment flow:**

```
1. Deploy 3 Silo clones (sync, deposit, redeem)
   └── Each initialized with the same underlying asset and strategy

2. If oracle == address(0):
   └── Deploy a SafeOracle clone for the vault

3. Deploy Vault via CREATE3
   └── ERC1967Proxy(vaultImplementation, initData)

4. Configure silos
   └── Transfer silo ownership to the new vault

5. Configure oracle roles
   └── Grant SET_TOTAL_ASSETS to vault owner

6. Emit VaultCreated event
```

### Deployment Parameters

```solidity
struct VaultDeploymentParams {
    string shareName;                   // ERC-20 share token name
    string shareSymbol;                 // ERC-20 share token symbol
    string ipfsHash;                    // Metadata IPFS hash
    GlobalFeesParams globalFeesParams;  // All fee rates
    IERC20Metadata underlyingAsset;     // Base asset (USDC, WETH, etc.)
    IOracle oracle;                     // External oracle (or address(0) for auto)
    address owner;                      // Vault owner
    address assetManager;               // Asset manager
    address feeRecipient;               // Fee recipient
    bool transferEnabled;               // Allow share transfers
    bool depositEnabled;                // Allow deposits
    bool depositWhitelistEnabled;       // Restrict deposits
    bool withdrawWhitelistEnabled;      // Restrict withdrawals
    bool vaultOpened;                   // Initial vault state
}
```

### Fee Parameters

```solidity
struct GlobalFeesParams {
    uint16 entryFeeBps;
    uint16 exitFeeBps;
    uint16 perfFeeBps;
    uint16 managementFeeBps;
    uint32 managementFeeDays;
}
```

## Implementation Management

### Adding Vault Implementations

```solidity
function addVaultImplementation(uint16 version, address implementation) external onlyOwner;
```

Registers a new vault implementation version. Each version maps to an implementation address. The latest version is tracked automatically.

### Version Whitelisting

```solidity
function setVersionWhitelist(uint16 version, bool status) external onlyOwner;
```

Controls which vault versions can be deployed. Only whitelisted versions can be used.

### Querying Versions

```solidity
function latestVaultVersion() external view returns (uint16);
function vaultImplementations(uint16 version) external view returns (address);
function implementationVersions(address implementation) external view returns (uint16);
```

## Protocol-Level Pause

```solidity
// Pause entire protocol (all vaults)
function pauseProtocol() external onlyOwner;
function unpauseProtocol() external onlyOwner;

// Pause/unpause by version
function pauseVaults(uint16 nonce) external onlyOwner;
function unpauseVaults(uint16 nonce) external onlyOwner;
```

When the protocol is paused, all vaults inherit the pause state. Version-level pauses affect only vaults of that specific implementation version.

## Default Strategy Generator

```solidity
function setDefaultStrategyGenerator(IDefaultStrategyGenerator generator) external;
function setDefaultSilo(IERC20 asset, IERC4626 silo) external;
```

### How It Works

When deploying a vault, the protocol uses the default strategy generator to create yield strategies for silos:

```
deployVault()
  └── defaultStrategyGenerator.generateDefaultStrategy(underlyingAsset)
        └── Returns an ERC-4626 strategy (e.g., AAVE wrapper)
              └── Used as the strategy for all three silos
```

### AAVE Default Strategy Generator

The reference implementation wraps any AAVE v3 supported asset:

```solidity
contract AAVEDefaultStrategyGenerator is IDefaultStrategyGenerator {
    IPoolAddressesProvider public immutable POOL_ADDRESSES_PROVIDER;

    function generateDefaultStrategy(IERC20 asset)
        external returns (IERC4626 strategy_)
    {
        // Uses AAVE's StataTokenFactory to deploy a wrapper
    }
}
```

### Custom Strategy Generators

Implement the `IDefaultStrategyGenerator` interface:

```solidity
interface IDefaultStrategyGenerator {
    function generateDefaultStrategy(IERC20 asset)
        external returns (IERC4626 strategy_);
}
```

## Treasury Management

```solidity
function setT3treasury(address treasury) external onlyOwner;
```

Updates the T3tris treasury address that receives silo profits across all vaults.

## Silo & Oracle Implementation Management

```solidity
function setSiloImplementation(address newImplementation) external onlyOwner;
function setSafeOracleImplementation(address newImplementation) external onlyOwner;
```

Update the base implementations used for deploying new silo clones and oracle clones.

## T3trisDeployer (CREATE3)

A simple wrapper around Solady's CREATE3:

```solidity
contract T3trisDeployer {
    function deployCreate3(bytes memory initCode, bytes32 salt)
        external returns (address deployed);

    function deployCreate3(uint256 value, bytes memory initCode, bytes32 salt)
        external returns (address deployed);

    function previewCreate3(bytes32 salt)
        external view returns (address deployed);
}
```

**Address determinism:**

- Address = `f(deployer_address, salt)` — independent of init code
- Same deployer + same salt = same address on every chain
- The T3trisDeployer itself is deployed via the ERC-2470 Singleton Factory for cross-chain consistency

## Production Addresses

| Contract           | Address                                      |
| ------------------ | -------------------------------------------- |
| Singleton Factory  | `0xce0042B868300000d44A59004Da54A005ffdcf9f` |
| T3tris Deployer    | `0x4Ddf8a9e7C43c1D1496c9760C5A7AD86097Ba5C7` |
| T3tris Protocol V1 | `0x7DD63c4eE5CD277B7870155371a6d62A2f7b1652` |
| T3tris Owner       | `0x22545BFE233C9070D5d9A2c4fea2E7a214d37249` |
| T3 Treasury        | `0x7378153914Ec167e1f2548D2FF03F4E8e68Bf18a` |
| Aave Pool Provider | `0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e` |
