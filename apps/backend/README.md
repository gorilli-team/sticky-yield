# Backend API

Express.js backend for yield optimization and GlueX integration.

## Getting Started

```bash
pnpm install
pnpm dev
```

Server runs on [http://localhost:3001](http://localhost:3001)

## Environment Setup

Create `.env`:

```env
PORT=3001
NODE_ENV=development
GLUEX_API_KEY=your_api_key
RPC_URL=your_rpc_url
```

## API Endpoints

### GET `/yields/best`
Get current best yields from GlueX

### GET `/yields/historical?days=7`
Get historical yield data

### POST `/optimize`
Calculate optimal allocation strategy

Request body:
```json
{
  "vaultAddress": "0x...",
  "amount": "1000"
}
```

### GET `/health`
Health check endpoint

## Tech Stack

- Node.js
- Express
- TypeScript
- Axios
- GlueX API

