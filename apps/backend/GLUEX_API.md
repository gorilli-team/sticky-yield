# GlueX API Integration

## Current Implementation

### 1. Yield API

**Base URL:** `https://yield-api.gluex.xyz`

#### Calculate Historical APY

**Endpoint:** `POST /historical-apy`

**Request:**
```json
{
  "pool_address": "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
  "lp_token_address": "0x1234567890123456789012345678901234567890",
  "chain": "hyperevm",
  "input_token": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
}
```

**Example:**
```bash
curl --request POST \
  --url https://yield-api.gluex.xyz/historical-apy \
  --header 'Content-Type: application/json' \
  --data '{
    "pool_address": "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
    "lp_token_address": "0x1234567890123456789012345678901234567890",
    "chain": "hyperevm",
    "input_token": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
  }'
```

### 2. Router API (TODO)

**Base URL:** `https://router-api.gluex.xyz` *(needs verification)*

**Note:** Router API endpoint needs to be confirmed with GlueX documentation.

## Our API Endpoints

### GET `/yields/best`
Fetches current best yields from configured pools

**Response:**
```json
{
  "pools": [
    {
      "pool_address": "0x...",
      "lp_token_address": "0x...",
      "chain": "hyperevm",
      "input_token": "0x...",
      "apy": 5.23,
      "historical_apy": []
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST `/yields/historical`
Fetches historical yield data for multiple pools

**Request:**
```json
{
  "pools": [
    {
      "pool_address": "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
      "lp_token_address": "0x1234567890123456789012345678901234567890",
      "chain": "hyperevm",
      "input_token": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    }
  ]
}
```

### POST `/optimize`
Calculates optimal allocation across pools

**Request:**
```json
{
  "vaultAddress": "0x...",
  "amount": "1000"
}
```

## Configuration

Pool addresses are currently hardcoded in `apps/backend/src/services/gluexYields.ts`.

To add more pools, update the `pools` array in the `getBestYield()` function:

```typescript
const pools: HistoricalApyRequest[] = [
  {
    pool_address: "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
    lp_token_address: "0x1234567890123456789012345678901234567890",
    chain: "hyperevm",
    input_token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  // Add more pools here
];
```

## TODO

- [ ] Verify GlueX Router API endpoint
- [ ] Add more pool configurations
- [ ] Implement caching for API responses
- [ ] Add rate limiting
- [ ] Implement retry logic for failed requests

