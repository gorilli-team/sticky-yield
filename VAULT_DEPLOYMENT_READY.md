# ✅ Vault Deployment - Ready to Deploy

Your OptimizerVault is ready to deploy for USD₮0 token (`0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb`) on HyperEVM!

## 🎯 What's Ready

### Contracts
- ✅ **OptimizerVault.sol** - Main vault contract (compiled successfully)
- ✅ **Whitelist.sol** - Whitelist management utility
- ✅ **Deploy.s.sol** - Enhanced deployment script with logging
- ✅ **Tests passing** - All foundry tests passed

### Configuration Files
- ✅ `foundry.toml` - Updated with HyperEVM RPC endpoint
- ✅ `env.example` - Environment variables template
- ✅ `deploy.sh` - Automated deployment script (executable)

### Documentation
- ✅ `DEPLOYMENT.md` - Detailed deployment guide
- ✅ `DEPLOYMENT_QUICKSTART.md` - Quick start guide (root directory)
- ✅ `DEPLOY_SUMMARY.md` - Deployment checklist and summary
- ✅ `README.md` - Updated with deployment instructions

## 🚀 Deploy in 3 Steps

### 1️⃣ Configure Environment

```bash
cd packages/contracts
cp env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=0xYourPrivateKeyHere
ASSET_TOKEN=0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb
HYPEREVM_RPC_URL=https://api.hyperliquid.xyz/evm
```

### 2️⃣ Deploy Vault

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

### 3️⃣ Whitelist Pools

After deployment, add the yield pools:

```bash
# Save your vault address
VAULT=0xYourVaultAddressFromDeploymentOutput

# Whitelist USD₮0 Hypurr pool (7.19% APY)
cast send $VAULT \
  "updateWhitelist(address,bool)" \
  0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007 \
  true \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY

# Whitelist Felix USD₮0 pool
cast send $VAULT \
  "updateWhitelist(address,bool)" \
  0xfc5126377f0efc0041c0969ef9ba903ce67d151e \
  true \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY
```

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] **Foundry installed** - `foundryup`
- [ ] **Private key** with HyperEVM native tokens for gas
- [ ] **RPC URL** for HyperEVM (testnet or mainnet)
- [ ] **Asset token verified** - `0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb` exists on chain
- [ ] **.env file configured** - copied from `env.example` and filled in
- [ ] **Contracts built** - `forge build` (✅ already done)
- [ ] **Tests passed** - `forge test` (✅ already done)

## 🎨 Frontend Already Updated

The frontend is already configured to display:
- ✅ Grouped yields by token
- ✅ Best APY highlighted for each token
- ✅ Alternative pool options
- ✅ Pool addresses and links
- ✅ APY breakdown (historic + rewards)
- ✅ Beautiful dark UI with gradients
- ✅ Responsive design (2 cards on desktop, 1 on mobile)

## 📊 Current Pool Data

Based on GlueX API:
- **USD₮0 Hypurr**: 7.19% APY (Historic: 7.19%, Rewards: 0%)
- **Felix USD₮0**: Coming soon...

## 🔧 Post-Deployment Tasks

After successful deployment:

### Update Backend
```bash
cd ../../apps/backend
echo "VAULT_ADDRESS=0xYourVaultAddress" >> .env
echo "VAULT_CHAIN=hyperevm" >> .env
```

### Update Frontend
Create `apps/web/src/config/contracts.ts`:
```typescript
export const VAULT_ADDRESS = "0xYourVaultAddress";
export const VAULT_CHAIN = "hyperevm";
export const ASSET_TOKEN = "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb";
```

### Test the Vault
```bash
# 1. Approve vault to spend your tokens
cast send 0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb \
  "approve(address,uint256)" \
  $VAULT \
  1000000 \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY

# 2. Deposit (1 USDT0 = 1000000 wei if 6 decimals)
cast send $VAULT \
  "deposit(uint256)" \
  1000000 \
  --rpc-url hyperevm \
  --private-key $PRIVATE_KEY

# 3. Check your balance
cast call $VAULT "balanceOf(address)" YOUR_ADDRESS --rpc-url hyperevm
```

## 🔍 Verification Commands

After deployment, verify everything is correct:

```bash
VAULT=0xYourVaultAddress

# Check owner
cast call $VAULT "owner()" --rpc-url hyperevm

# Check asset token
cast call $VAULT "asset()" --rpc-url hyperevm

# Should return: 0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb

# Check total assets (should be 0 initially)
cast call $VAULT "totalAssets()" --rpc-url hyperevm

# Check whitelisted vaults count (should be 2 after whitelisting)
cast call $VAULT "getWhitelistedVaultsCount()" --rpc-url hyperevm

# Check if specific pool is whitelisted
cast call $VAULT "isWhitelisted(address)" \
  0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007 \
  --rpc-url hyperevm
```

## 📖 Documentation References

- **Quick Start**: `DEPLOYMENT_QUICKSTART.md` (root)
- **Detailed Guide**: `packages/contracts/DEPLOYMENT.md`
- **Summary & Checklist**: `packages/contracts/DEPLOY_SUMMARY.md`
- **Contract README**: `packages/contracts/README.md`

## 🔐 Security Reminders

1. **Never commit `.env`** - Already in `.gitignore` ✅
2. **Use hardware wallet** for production/mainnet deployments
3. **Test with small amounts** first
4. **Monitor vault activity** after deployment
5. **Keep deployment addresses** in a secure location

## 🎉 What Happens After Deployment

Once deployed, users can:
1. **Deposit USD₮0** into your vault
2. **Receive shares** proportional to their deposit
3. **You (owner) can reallocate** funds to the highest yielding pools
4. **Users can withdraw** their share + earned yield anytime

The vault automatically:
- Tracks user shares
- Calculates proportional ownership
- Allows owner to optimize across whitelisted pools
- Prevents unauthorized pool access (whitelist protection)

## 🚨 Important Notes

- The deployer (your address) becomes the **vault owner**
- Only the owner can:
  - Whitelist/unwhitelist pools
  - Reallocate funds between pools
  - Withdraw from pools back to vault
- Users can always:
  - Deposit into vault
  - Withdraw their proportional share
  - Check their balance

## 📞 Support

Need help?
- Review detailed docs in `packages/contracts/DEPLOYMENT.md`
- Check contract code in `packages/contracts/src/OptimizerVault.sol`
- Test locally: `anvil --fork-url $HYPEREVM_RPC_URL`

---

**Ready to deploy?** Just run `./deploy.sh` from `packages/contracts/` directory! 🚀

