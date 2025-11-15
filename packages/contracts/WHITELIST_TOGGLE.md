# Whitelist Toggle Feature

## Overview

The `OptimizerVault` supports **two modes** via a toggleable whitelist:

1. **Whitelist Mode (ENABLED)** - Only whitelisted pools can receive allocations
2. **Permissionless Mode (DISABLED)** - Any pool can receive allocations

## Key Features

### State Variable
```solidity
bool public whitelistEnabled;
```

### Toggle Function
```solidity
function setWhitelistMode(bool enabled) external onlyOwner
```

### Modified Allocation Logic
```solidity
function reallocate(address vault, uint256 amount) external onlyOwner {
    // Only check whitelist if enabled
    if (whitelistEnabled) {
        require(isWhitelisted[vault], "Vault not whitelisted");
    }
    // ... allocate funds
}
```

## Deployment

### Constructor
```solidity
constructor(
    address _asset,
    address[] memory _whitelist,
    bool _whitelistEnabled
)
```

### Deploy in Permissionless Mode (Testing)
```bash
./deploy.sh
# Deploys with whitelistEnabled = false by default
```

### Deploy in Whitelist Mode (Production)
```solidity
address[] memory trustedPools = [...];
bool whitelistEnabled = true;
vault = new OptimizerVault(assetToken, trustedPools, whitelistEnabled);
```

## Usage

### Check Current Mode
```bash
cast call $VAULT "whitelistEnabled()" --rpc-url hyperevm
```

### Toggle Mode
```bash
# Enable whitelist (restrict to approved pools)
cast send $VAULT "setWhitelistMode(bool)" true \
  --rpc-url hyperevm --private-key $PRIVATE_KEY

# Disable whitelist (allow any pool)
cast send $VAULT "setWhitelistMode(bool)" false \
  --rpc-url hyperevm --private-key $PRIVATE_KEY
```

### Manage Whitelist
```bash
# Add pool
cast send $VAULT "updateWhitelist(address,bool)" \
  0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007 true \
  --rpc-url hyperevm --private-key $PRIVATE_KEY

# Remove pool
cast send $VAULT "updateWhitelist(address,bool)" \
  0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007 false \
  --rpc-url hyperevm --private-key $PRIVATE_KEY

# Check if whitelisted
cast call $VAULT "isWhitelisted(address)" \
  0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007 \
  --rpc-url hyperevm
```

### Allocate to Pools
```bash
# When whitelistEnabled = false (any pool works)
cast send $VAULT "reallocate(address,uint256)" \
  0xAnyPoolAddress 1000000000 \
  --rpc-url hyperevm --private-key $PRIVATE_KEY

# When whitelistEnabled = true (only whitelisted pools)
cast send $VAULT "reallocate(address,uint256)" \
  0xWhitelistedPool 1000000000 \
  --rpc-url hyperevm --private-key $PRIVATE_KEY
```

## Use Cases

### Testing (Recommended)
```
Deploy with whitelistEnabled = false
↓
Test all 7 pools from backend immediately
↓
No whitelist management needed
```

### Production
```
Deploy with whitelistEnabled = true
↓
Add only audited, trusted pools to whitelist
↓
Allocations restricted to safe pools
```

### Migration: Testing → Production
```bash
# 1. Deploy for testing (whitelist disabled)
./deploy.sh

# 2. Test with all pools
# ... test allocations ...

# 3. Add trusted pools to whitelist
cast send $VAULT "updateWhitelist(address,bool)" $TRUSTED_POOL true

# 4. Enable whitelist mode
cast send $VAULT "setWhitelistMode(bool)" true

# 5. Now only whitelisted pools work
```

## Events

```solidity
event WhitelistModeChanged(bool enabled);
event WhitelistUpdated(address indexed vault, bool allowed);
```

## Security

### Permissionless Mode (whitelistEnabled = false)
**Pros:**
- ✅ Maximum flexibility
- ✅ Quick testing
- ✅ No setup overhead

**Cons:**
- ⚠️ Owner can allocate to any address
- ⚠️ Requires trusted owner
- ⚠️ Not recommended for mainnet

### Whitelist Mode (whitelistEnabled = true)
**Pros:**
- ✅ Only approved pools
- ✅ Additional security layer
- ✅ Recommended for production

**Cons:**
- ⚠️ Requires whitelist management
- ⚠️ Less flexible
- ⚠️ Still requires trusted owner

## Quick Reference

| Function | Purpose | Access |
|----------|---------|--------|
| `whitelistEnabled()` | Check mode | Anyone |
| `setWhitelistMode(bool)` | Toggle mode | Owner |
| `updateWhitelist(address, bool)` | Manage whitelist | Owner |
| `isWhitelisted(address)` | Check status | Anyone |
| `getWhitelistedVaultsCount()` | Get count | Anyone |
| `reallocate(address, uint256)` | Allocate funds | Owner |
| `withdrawFromVault(address, uint256)` | Withdraw funds | Owner |

## Summary

**TL;DR**: 
- Deploy with `whitelistEnabled = false` for testing ✅
- Allocate to any pool immediately 🚀
- Toggle to `whitelistEnabled = true` for production 🔒
- Best of both worlds! 🎉

## Test Results

All 8 tests passing:
```
[PASS] testAssetAddress()
[PASS] testDeposit()
[PASS] testOnlyOwnerCanToggleWhitelistMode()
[PASS] testOwnerAddress()
[PASS] testToggleWhitelistMode()
[PASS] testTotalAssetsInitiallyZero()
[PASS] testWhitelistModeInitiallyDisabled()
[PASS] testWhitelistUpdate()
```

Ready to deploy! 🚀

