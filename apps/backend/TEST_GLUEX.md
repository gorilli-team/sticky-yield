# Testing GlueX API Integration

## Debug Endpoints

I've added test endpoints to help debug the GlueX API issues:

### 1. Test Single Call

Test with the exact data from your working curl command:

```bash
curl -X POST http://localhost:3001/test-gluex/test \
  -H "Content-Type: application/json" \
  -d '{
    "pool_address": "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
    "lp_token_address": "0x1234567890123456789012345678901234567890",
    "chain": "hyperevm",
    "input_token": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
  }'
```

### 2. Test Multiple Address Formats

Test different address case variations automatically:

```bash
curl http://localhost:3001/test-gluex/test-formats
```

This will test:
- Original mixed-case addresses
- All lowercase addresses
- Using pool address as LP token address

## What to Look For

### In the Console Logs

When you run these tests, the console will show:

```
🚀 Making GlueX API request: {
  url: 'https://yield-api.gluex.xyz/historical-apy',
  data: { ... }
}
```

If there's an error, you'll see:
```
❌ GlueX API Error Details:
  Status: 422
  Response Data: { ... }
  Validation Errors: [ ... ]
  Failed Request Data: { ... }
```

### Common Issues to Check

1. **Invalid LP Token Address**
   - `0x1234567890123456789012345678901234567890` might be rejected as fake
   - Try using the actual pool address as the LP token address

2. **Address Case Sensitivity**
   - The API might require lowercase or checksummed addresses
   - Test endpoint will try multiple variations

3. **Invalid Chain**
   - Make sure "hyperevm" is the correct chain identifier

4. **Token Address Validation**
   - The input_token address might need to be valid for the specified chain

## Steps to Debug

1. **Start the backend:**
   ```bash
   cd apps/backend
   pnpm dev
   ```

2. **Run the test:**
   ```bash
   curl -X POST http://localhost:3001/test-gluex/test
   ```

3. **Check console output** - Look for the detailed error messages

4. **Try format variations:**
   ```bash
   curl http://localhost:3001/test-gluex/test-formats
   ```

5. **Once you find what works**, update the pool configuration in:
   `apps/backend/src/services/gluexYields.ts` (line ~65)

## Example Working Configuration

Once you identify the correct format, update this:

```typescript
const pools: HistoricalApyRequest[] = [
  {
    pool_address: "0x...", // Correct format
    lp_token_address: "0x...", // Real LP token address
    chain: "hyperevm",
    input_token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
];
```

## Need Real Pool Addresses?

You mentioned the curl command works. Do you have:
- A list of actual pool addresses?
- The real LP token addresses for those pools?
- Documentation for other chains besides "hyperevm"?

Share those and I can configure them properly!

