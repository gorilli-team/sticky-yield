import axios from "axios";

const GLUEX_YIELD_API_BASE = "https://yield-api.gluex.xyz";

export interface YieldPool {
  pool_address: string;
  chain: string;
  apy?: number;
  historical_apy?: any[];
  name?: string;
  tvl?: number;
}

export interface YieldResponse {
  pools: YieldPool[];
  timestamp: string;
}

export interface HistoricalApyRequest {
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
    // Example pools - add more pool addresses here
    const pools: HistoricalApyRequest[] = [
      {
        pool_address: "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
        chain: "hyperevm",
      },
      // Add more pools here as needed
    ];

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
      getPoolHistoricalApy(config.pool_address, config.chain)
    );

    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error fetching historical yields:", error);
    throw new Error("Failed to fetch historical yield data");
  }
}
