import axios from "axios";

const GLUEX_API_BASE = "https://api.gluex.xyz";

export interface YieldPool {
  vault_address: string;
  vault_name: string;
  apy: number;
  tvl: number;
  chain: string;
}

export interface YieldResponse {
  pools: YieldPool[];
  timestamp: string;
}

/**
 * Fetch best current yields from GlueX API
 */
export async function getBestYield(): Promise<YieldResponse> {
  try {
    const response = await axios.post(
      `${GLUEX_API_BASE}/yield/historical-apy`,
      {
        lookback_days: 1,
      }
    );

    // Transform the response to match our interface
    const pools = response.data.vaults || [];

    return {
      pools: pools.map((vault: any) => ({
        vault_address: vault.vault_address,
        vault_name: vault.vault_name || vault.name,
        apy: vault.apy || 0,
        tvl: vault.tvl || 0,
        chain: vault.chain || "unknown",
      })),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching GlueX yields:", error);
    throw new Error("Failed to fetch yield data from GlueX");
  }
}

/**
 * Fetch historical yield data
 */
export async function getHistoricalYields(
  lookbackDays: number = 7
): Promise<any> {
  try {
    const response = await axios.post(
      `${GLUEX_API_BASE}/yield/historical-apy`,
      {
        lookback_days: lookbackDays,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching historical yields:", error);
    throw new Error("Failed to fetch historical yield data");
  }
}
