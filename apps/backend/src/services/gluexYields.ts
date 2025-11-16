import axios from "axios";
import { TRACKED_POOLS } from "./apyTracker";

const GLUEX_YIELD_API_BASE = "https://yield-api.gluex.xyz";

export interface YieldPool {
  pool_address: string;
  chain: string;
  description?: string; // Pool description
  url?: string; // Pool URL
  apy?: number; // Total APY (historic + rewards)
  historic_apy?: number; // Historic yield APY
  rewards_apy?: number; // Rewards APY
  input_token?: string;
  name?: string;
  tvl?: number;
  raw_gluex_response?: any; // Full raw response from GlueX API
}

export interface YieldResponse {
  pools: YieldPool[];
  timestamp: string;

  total_pools?: number;
  successful_fetches?: number;
  raw_responses?: any[]; // All raw responses from GlueX
}

export interface HistoricalApyRequest {
  description: string;
  url: string;
  pool_address: string;
  chain: string;
}

/**
 * Fetch historical APY for a specific lending pool
 *
 * @param poolAddress - The lending pool contract address
 * @param chain - The blockchain network (e.g., "hyperevm")
 */
export async function getPoolHistoricalApy(
  poolAddress: string,
  chain: string
): Promise<any> {
  const requestData = {
    pool_address: poolAddress,
    chain: chain,
  };

  console.log("🚀 Making GlueX API request:", {
    url: `${GLUEX_YIELD_API_BASE}/historical-apy`,
    data: requestData,
  });

  try {
    const response = await axios.post(
      `${GLUEX_YIELD_API_BASE}/historical-apy`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ GlueX API response success for pool:", poolAddress);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ GlueX API Error Details:");
      console.error("  Status:", error.response?.status);
      console.error("  Status Text:", error.response?.statusText);
      console.error(
        "  Response Data:",
        JSON.stringify(error.response?.data, null, 2)
      );

      // Log validation details if present
      if (error.response?.data?.detail) {
        console.error(
          "  Validation Errors:",
          JSON.stringify(error.response.data.detail, null, 2)
        );
      }

      // Log the request that failed
      console.error(
        "  Failed Request Data:",
        JSON.stringify(requestData, null, 2)
      );
    } else {
      console.error("❌ Non-Axios Error:", error);
    }
    throw new Error(`Failed to fetch pool APY from GlueX: ${poolAddress}`);
  }
}

/**
 * Fetch best current yields from multiple pools
 * This is a wrapper that queries multiple pools
 */
export async function getBestYield(): Promise<YieldResponse> {
  try {
    // Use TRACKED_POOLS from apyTracker as the single source of truth
    // This ensures consistency between cron tracking and API responses
    const pools: HistoricalApyRequest[] = TRACKED_POOLS.map((pool) => ({
      description: pool.description,
      url: pool.url,
      pool_address: pool.pool_address,
      chain: pool.chain,
    }));

    console.log(`📊 Fetching yields for ${pools.length} pool(s)...`);

    // Fetch APY for all pools
    const poolPromises = pools.map((pool) =>
      getPoolHistoricalApy(pool.pool_address, pool.chain).catch((err) => {
        console.error(`Failed to fetch pool ${pool.pool_address}:`, err);
        return null;
      })
    );

    const results = await Promise.all(poolPromises);

    // Filter out failed requests and format response
    const validPools = results
      .filter((result) => result !== null)
      .map((result, index) => {
        // Extract APY from GlueX response structure
        const historicApy = result?.historic_yield?.apy?.apy || 0;
        const rewardsApy = result?.rewards_status?.rewards_yield?.apy || 0;
        const totalApy = historicApy + rewardsApy;

        return {
          ...pools[index],
          apy: totalApy,
          historic_apy: historicApy,
          rewards_apy: rewardsApy,
          input_token: result?.historic_yield?.input_token,
          raw_gluex_response: result, // Include full GlueX response
        };
      });

    // Sort pools by APY in descending order (highest first)
    const sortedPools = validPools.sort((a, b) => b.apy - a.apy);

    return {
      pools: sortedPools,
      timestamp: new Date().toISOString(),
      total_pools: pools.length,
      successful_fetches: validPools.length,
      raw_responses: results.filter((r) => r !== null), // All raw GlueX responses
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
      getPoolHistoricalApy(config.pool_address, config.chain)
    );

    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error fetching historical yields:", error);
    throw new Error("Failed to fetch historical yield data");
  }
}
