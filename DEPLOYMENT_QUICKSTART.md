# Quick Start: Deploy Vault for USD₮0

This guide will help you deploy the OptimizerVault contract for token `0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb` on HyperEVM.

## Prerequisites

- Foundry installed (`forge`, `cast`)
- Private key with HyperEVM native tokens for gas
- Basic knowledge of deploying smart contracts

## Quick Deployment (3 Steps)

### Step 1: Configure Environment

```bash
cd packages/contracts
cp env.example .env
```

Edit `.env` file:
```env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
ASSET_TOKEN=0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb
HYPEREVM_RPC_URL=https://api.hyperliquid.xyz/evm
```

### Step 2: Run Deployment Script

```bash
./deploy.sh
```

Or manually:
```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url hyperevm \
  --broadcast \
  -vvvv
```

### Step 3: Save Vault Address

The deployment will output:
```
[2/2] OptimizerVault deployed at: 0xYourVaultAddress
```

**Save this address!** You'll need it for:
- Backend configuration
- Frontend integration
- Managing the vault

## Post-Deployment Configuration

### 1. Whitelist Pools

Add the yield-bearing pools that users can deposit into:

```bash
# Whitelist USD₮0 Hypurr pool
cast send 0xYourVaultAddress \
  "updateWhitelist(address,bool)" \
  0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007 \
  true \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY

# Whitelist Felix USD₮0 pool
cast send 0xYourVaultAddress \
  "updateWhitelist(address,bool)" \
  0xfc5126377f0efc0041c0969ef9ba903ce67d151e \
  true \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY
```

### 2. Update Backend

Edit `apps/backend/.env`:
```env
VAULT_ADDRESS=0xYourVaultAddress
VAULT_CHAIN=hyperevm
```

### 3. Update Frontend

Edit `apps/web/src/config/contracts.ts` (create if doesn't exist):
```typescript
export const VAULT_ADDRESS = "0xYourVaultAddress";
export const VAULT_CHAIN = "hyperevm";
export const ASSET_TOKEN = "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb";
```

## Verify Deployment

Check that everything is working:

```bash
# Set vault address
VAULT=0xYourVaultAddress

# Check owner
cast call $VAULT "owner()" --rpc-url hyperevm

# Check asset token
cast call $VAULT "asset()" --rpc-url hyperevm

# Check whitelisted vaults
cast call $VAULT "getWhitelistedVaultsCount()" --rpc-url hyperevm
```

## Test Deposit

To test the vault with a small deposit:

```bash
# 1. Approve vault to spend your tokens
cast send 0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb \
  "approve(address,uint256)" \
  $VAULT \
  1000000 \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY

# 2. Deposit tokens
cast send $VAULT \
  "deposit(uint256)" \
  1000000 \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY

# 3. Check your shares
cast call $VAULT "userShares(address)" YOUR_ADDRESS --rpc-url hyperevm
```

## Key Contract Functions

### User Functions
- `deposit(uint256 assets)` - Deposit tokens and receive shares
- `withdraw(uint256 shares)` - Withdraw by burning shares
- `balanceOf(address user)` - Check user's token balance
- `userShares(address user)` - Check user's share balance

### Owner Functions (You)
- `reallocate(address vault, uint256 amount)` - Move funds to a pool
- `withdrawFromVault(address vault, uint256 amount)` - Pull funds back
- `updateWhitelist(address vault, bool allowed)` - Manage pool whitelist

### View Functions
- `totalAssets()` - Total value locked in vault
- `totalShares()` - Total shares issued
- `asset()` - Asset token address
- `owner()` - Vault owner address
- `isWhitelisted(address vault)` - Check if pool is whitelisted

## Architecture

```
User deposits USD₮0 → OptimizerVault → Allocates to best yield pools
                                     ↓
                              [Hypurr Pool] (7.19% APY)
                              [Felix Pool]  (XX% APY)
```

## Common Issues

### "Insufficient gas"
- Make sure your deployer address has native tokens on HyperEVM

### "Transfer failed"
- The vault needs approval from users to transfer their tokens
- Users must call `approve()` on the asset token first

### "Vault not whitelisted"
- Only whitelisted pools can receive allocations
- Use `updateWhitelist()` to add pools

## Security Considerations

1. **Private Keys**: Never commit `.env` files with real keys
2. **Owner Role**: The deployer becomes the owner and can:
   - Manage whitelisted pools
   - Reallocate funds between pools
   - Cannot steal user funds directly (they must withdraw proportional to shares)
3. **Testing**: Test thoroughly with small amounts first
4. **Audits**: Consider professional audits before handling significant TVL

## Next Steps

After deployment:
1. ✅ Whitelist yield-bearing pools
2. ✅ Update backend and frontend configurations
3. ✅ Test deposit and withdrawal flows
4. ✅ Implement automatic rebalancing in backend
5. ✅ Monitor vault performance
6. ✅ Set up alerts for significant events

## Need Help?

- Check `packages/contracts/DEPLOYMENT.md` for detailed documentation
- Review contract code in `packages/contracts/src/OptimizerVault.sol`
- Test locally with Anvil: `anvil --fork-url $HYPEREVM_RPC_URL`

## Useful Links

- Foundry Book: https://book.getfoundry.sh/
- HyperEVM Docs: (check Hyperliquid documentation)
- GlueX Protocol: https://gluex.xyz

