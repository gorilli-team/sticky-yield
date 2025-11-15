# Sticky Yield

A sophisticated yield optimization platform built on GlueX Protocol. Automatically reallocates funds across whitelisted vaults to maximize returns.

## Architecture

This is a **Turborepo monorepo** containing:

- **`apps/web`**: Next.js frontend with Privy wallet integration
- **`apps/backend`**: Node.js/Express API for yield optimization
- **`packages/contracts`**: Foundry Solidity smart contracts
- **`packages/shared`**: Shared TypeScript types

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Foundry (for contracts)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env.local with your Privy App ID and backend URL

# Run all apps in development mode
pnpm dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Project Structure

```
sticky-yield/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── pages/       # Next.js pages
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utilities & API clients
│   │   │   └── styles/      # CSS styles
│   │   └── package.json
│   │
│   └── backend/             # Express backend
│       ├── src/
│       │   ├── routes/      # API routes
│       │   ├── services/    # Business logic
│       │   ├── config/      # Configuration
│       │   └── utils/       # Utilities
│       └── package.json
│
└── packages/
    ├── contracts/           # Solidity contracts
    │   ├── src/
    │   │   ├── OptimizerVault.sol
    │   │   ├── Interfaces.sol
    │   │   └── whitelist.sol
    │   ├── test/
    │   └── script/
    │
    └── shared/              # Shared TypeScript types
        └── types/
```

## Development

### Frontend (Next.js)

```bash
cd apps/web
pnpm dev
```

Features:
- Privy wallet authentication
- Real-time yield display
- Vault status monitoring
- Modern, responsive UI

### Backend (Node.js)

```bash
cd apps/backend
pnpm dev
```

API Endpoints:
- `GET /yields/best` - Get best current yields
- `GET /yields/historical?days=7` - Get historical yield data
- `POST /optimize` - Calculate optimal allocation
- `GET /health` - Health check

### Smart Contracts (Foundry)

```bash
cd packages/contracts

# Build
forge build

# Test
forge test

# Deploy
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

Contracts:
- **OptimizerVault**: Main vault for deposits/withdrawals and reallocations
- **Whitelist**: Vault whitelist management
- **Interfaces**: ERC20, ERC7540, and vault interfaces

## Environment Variables

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Backend (`apps/backend/.env`)

```env
PORT=3001
NODE_ENV=development
GLUEX_API_KEY=your_api_key
RPC_URL=your_rpc_url
```

### Contracts (`packages/contracts/.env`)

```env
PRIVATE_KEY=your_private_key
ASSET_TOKEN=0x... # USDC or base asset address
RPC_URL=your_rpc_url
ETHERSCAN_API_KEY=your_etherscan_key
```

## Testing

```bash
# Test all packages
pnpm test

# Test specific package
cd packages/contracts
forge test -vvv
```

## Key Features

1. **Automated Yield Optimization**: Continuously monitors and reallocates funds to highest-yielding vaults
2. **Privy Wallet Integration**: Seamless wallet connection and authentication
3. **GlueX Protocol Integration**: 
   - Yield API for real-time APY data
   - Router API for optimal swap routes
4. **ERC-7540 Compatible**: Async vault standard for hackathon acceptance
5. **Whitelist System**: Only approved vaults can receive allocations
6. **Turborepo**: Fast, efficient monorepo builds

## Hackathon Acceptance Criteria

- **Node.js Backend**: Express API with GlueX integration  
- **TypeScript**: Full TypeScript across frontend & backend  
- **Next.js Frontend**: Modern React with SSR  
- **Privy Login**: Wallet authentication implemented  
- **GlueX Yields API**: Real-time yield data fetching  
- **GlueX Router**: Optimal allocation calculation  
- **ERC-7540 Vault**: OptimizerVault contract  
- **Whitelist Contract**: Vault approval system  

## Deployment

### Frontend (Vercel)

```bash
cd apps/web
vercel deploy
```

### Backend (Railway/Render)

```bash
cd apps/backend
# Deploy via Railway CLI or connect GitHub repo
```

### Contracts (Mainnet)

```bash
cd packages/contracts
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

## Contributing

This is a hackathon project. For production use, additional features needed:
- Enhanced security audits
- Gas optimization
- Comprehensive error handling
- Rate limiting
- Advanced rebalancing strategies

## License

MIT

## Acknowledgments

- GlueX Protocol for yield optimization infrastructure
- Privy for wallet authentication
- Foundry for Solidity development
- Turborepo for monorepo tooling

