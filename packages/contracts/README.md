# OptimizerVault Contracts

Solidity smart contracts for the GlueX Yield Optimizer.

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install
```

## Build

```bash
forge build
```

## Test

```bash
forge test
forge test -vvv  # verbose output
```

## Deploy

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export ASSET_TOKEN=0x...  # USDC or other base asset
export RPC_URL=your_rpc_url

# Deploy
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

## Contracts

- **OptimizerVault.sol**: Main vault contract that manages deposits and reallocations
- **Interfaces.sol**: Interface definitions for ERC20, ERC7540, and external vaults
- **whitelist.sol**: Standalone whitelist management contract

