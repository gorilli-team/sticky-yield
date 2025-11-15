import axios from "axios";

const GLUEX_YIELD_API_BASE = "https://yield-api.gluex.xyz";

export interface YieldPool {
  pool_address: string;
  lp_token_address: string;
  chain: string;
  input_token: string;
  apy?: number;
  historical_apy?: any[];
}

export interface YieldResponse {
  pools: YieldPool[];
  timestamp: string;
}

export interface HistoricalApyRequest {
  pool_address: string;
  lp_token_address: string;
  chain: string;
  input_token: string;
}

/**
 * Fetch historical APY for a specific lending pool
 *
 * @param poolAddress - The lending pool contract address
 * @param lpTokenAddress - The LP token address
 * @param chain - The blockchain network (e.g., "hyperevm")
 * @param inputToken - The input token address (e.g., USDC)
 */
export async function getPoolHistoricalApy(
  poolAddress: string,
  lpTokenAddress: string,
  chain: string,
  inputToken: string
): Promise<any> {
  try {
    const response = await axios.post(
      `${GLUEX_YIELD_API_BASE}/historical-apy`,
      {
        pool_address: poolAddress,
        lp_token_address: lpTokenAddress,
        chain: chain,
        input_token: inputToken,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching GlueX pool APY:", error);
    throw new Error("Failed to fetch pool APY from GlueX");
  }
}

/**
 * Fetch best current yields from multiple pools
 * This is a wrapper that queries multiple pools
 */
export async function getBestYield(): Promise<YieldResponse> {
  try {
    // Example pools - you should configure these based on your needs
    const pools: HistoricalApyRequest[] = [
      {
        pool_address: "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
        lp_token_address: "0x1234567890123456789012345678901234567890",
        chain: "hyperevm",
        input_token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
      },
      // Add more pools here as needed
    ];

    // Fetch APY for all pools
    const poolPromises = pools.map((pool) =>
      getPoolHistoricalApy(
        pool.pool_address,
        pool.lp_token_address,
        pool.chain,
        pool.input_token
      ).catch((err) => {
        console.error(`Failed to fetch pool ${pool.pool_address}:`, err);
        return null;
      })
    );

    const results = await Promise.all(poolPromises);

    // Filter out failed requests and format response
    const validPools = results
      .filter((result) => result !== null)
      .map((result, index) => ({
        ...pools[index],
        apy: result?.current_apy || 0,
        historical_apy: result?.historical_data || [],
      }));

    return {
      pools: validPools,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching GlueX yields:", error);
    throw new Error("Failed to fetch yield data from GlueX");
  }
}

/**
 * Fetch historical yield data for multiple pools
 */
export async function getHistoricalYields(
  poolConfigs: HistoricalApyRequest[]
): Promise<any> {
  try {
    const promises = poolConfigs.map((config) =>
      getPoolHistoricalApy(
        config.pool_address,
        config.lp_token_address,
        config.chain,
        config.input_token
      )
    );

    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error fetching historical yields:", error);
    throw new Error("Failed to fetch historical yield data");
  }
}
