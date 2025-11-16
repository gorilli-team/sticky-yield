import { ApyHistory } from "../models/ApyHistory";
import { getPoolHistoricalApy, getPoolTvl } from "./gluexYields";

// Pool configuration
export interface PoolConfig {
  description: string;
  url: string;
  pool_address: string;
  chain: string;
}

// List of all pools to track
export const TRACKED_POOLS: PoolConfig[] = [
  {
    description: "USD₮0 Hypurr",
    url: "https://app.hypurr.fi/markets/isolated/999/0x543DBF5C74C6fb7C14f62b1Ae010a3696e22E3A0",
    pool_address: "0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007",
    chain: "hyperevm",
  },
  {
    description: "HYPURRFI - PT-hwHLP < > USD₮0",
    url: "https://app.hypurr.fi/markets/isolated/999/0x543DBF5C74C6fb7C14f62b1Ae010a3696e22E3A0",
    pool_address: "0x543dbf5c74c6fb7c14f62b1ae010a3696e22e3a0",
    chain: "hyperevm",
  },
  {
    description: "HYPURRFI - hbUSDT < > USD₮0",
    url: "https://app.hypurr.fi/markets/isolated/999/0xcDA6D421d5edB4267D99B4b66Dd423Ca1B8d4410",
    pool_address: "0xcDA6D421d5edB4267D99B4b66Dd423Ca1B8d4410",
    chain: "hyperevm",
  },
  {
    description: "HYPURRFI - hbUSDT < > USD₮0",
    url: "https://app.hypurr.fi/markets/isolated/999/0x1C5164A764844356d57654ea83f9f1B72Cd10db5",
    pool_address: "0x1C5164A764844356d57654ea83f9f1B72Cd10db5",
    chain: "hyperevm",
  },
  {
    description: "HYPURRFI - hwHLP < > USD₮0",
    url: "https://app.hypurr.fi/markets/isolated/999/0x2c910F67DbF81099e6f8e126E7265d7595DC20aD",
    pool_address: "0x2c910F67DbF81099e6f8e126E7265d7595DC20aD",
    chain: "hyperevm",
  },
  {
    description: "Felix USD₮0",
    url: "https://www.usefelix.xyz/vanilla/lend",
    pool_address: "0xfc5126377f0efc0041c0969ef9ba903ce67d151e",
    chain: "hyperevm",
  },
  {
    description: "Felix USD₮0 Frontier",
    url: "https://www.usefelix.xyz/frontier/lend",
    pool_address: "0x9896a8605763106e57A51aa0a97Fe8099E806bb3",
    chain: "hyperevm",
  },
  {
    description: "Hypurr LHYPE < > USDXL",
    url: "https://app.hypurr.fi/markets/isolated/999/0xAeedD5B6d42e0F077ccF3E7A78ff70b8cB217329",
    pool_address: "0xAeedD5B6d42e0F077ccF3E7A78ff70b8cB217329",
    chain: "hyperevm",
  },
  {
    description: "Hypurr MHYPE",
    url: "https://app.hypurr.fi/markets/isolated/999/0xE4847Cb23dAd9311b9907497EF8B39d00AC1DE14",
    pool_address: "0xE4847Cb23dAd9311b9907497EF8B39d00AC1DE14",
    chain: "hyperevm",
  },
  // {
  //   description: "Hypurr Pooled USD₮0",
  //   url: "https://app.hypurr.fi/markets/pooled/999/0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
  //   pool_address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
  //   chain: "hyperevm",
  // },
];

/**
 * Fetch and store APY for a single pool
 */
async function trackPoolApy(pool: PoolConfig): Promise<void> {
  try {
    console.log(
      `📊 Tracking APY and TVL for ${pool.description} (${pool.pool_address})`
    );

    // Fetch APY and TVL from GlueX in parallel
    const [apyResult, tvlResult] = await Promise.all([
      getPoolHistoricalApy(pool.pool_address, pool.chain).catch((err) => {
        console.error(`Failed to fetch APY for ${pool.description}:`, err);
        return null;
      }),
      getPoolTvl(pool.pool_address, pool.chain).catch((err) => {
        console.error(`Failed to fetch TVL for ${pool.description}:`, err);
        return null;
      }),
    ]);

    // Extract APY values
    const historicApy = apyResult?.historic_yield?.apy?.apy || 0;
    const rewardsApy = apyResult?.rewards_status?.rewards_yield?.apy || 0;
    const totalApy = historicApy + rewardsApy;
    const inputToken = apyResult?.historic_yield?.input_token;

    // Extract TVL values
    const tvl = tvlResult?.tvl?.tvl || null;
    const tvlUsd = tvlResult?.tvl?.tvl_usd || null;

    // Save to database
    const apyRecord = new ApyHistory({
      pool_address: pool.pool_address.toLowerCase(),
      chain: pool.chain,
      description: pool.description,
      url: pool.url,
      input_token: inputToken?.toLowerCase(),
      total_apy: totalApy,
      historic_apy: historicApy,
      rewards_apy: rewardsApy,
      tvl: tvl,
      tvl_usd: tvlUsd,
      raw_response: apyResult,
      success: true,
      timestamp: new Date(),
    });

    await apyRecord.save();

    const tvlInfo = tvlUsd
      ? `, TVL: $${tvlUsd.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}`
      : "";
    console.log(
      `✅ Saved APY for ${pool.description}: ${totalApy.toFixed(
        2
      )}% (Historic: ${historicApy.toFixed(2)}%, Rewards: ${rewardsApy.toFixed(
        2
      )}%)${tvlInfo}`
    );
  } catch (error: any) {
    console.error(
      `❌ Error tracking APY for ${pool.description}:`,
      error.message
    );

    // Save error record
    try {
      const errorRecord = new ApyHistory({
        pool_address: pool.pool_address.toLowerCase(),
        chain: pool.chain,
        description: pool.description,
        url: pool.url,
        total_apy: 0,
        historic_apy: 0,
        rewards_apy: 0,
        success: false,
        error_message: error.message,
        timestamp: new Date(),
      });

      await errorRecord.save();
    } catch (saveError) {
      console.error("Failed to save error record:", saveError);
    }
  }
}

/**
 * Track APY for all pools
 */
export async function trackAllPoolsApy(): Promise<void> {
  const startTime = Date.now();
  console.log(
    `\n🚀 Starting APY tracking cycle at ${new Date().toISOString()}`
  );
  console.log(`📍 Tracking ${TRACKED_POOLS.length} pools...\n`);

  try {
    // Track all pools in parallel
    await Promise.all(TRACKED_POOLS.map((pool) => trackPoolApy(pool)));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ APY tracking cycle completed in ${duration}s\n`);
  } catch (error) {
    console.error("❌ Error in APY tracking cycle:", error);
  }
}

/**
 * Get latest APY for all pools from database
 */
export async function getLatestApy() {
  try {
    const latestRecords = await ApyHistory.aggregate([
      { $match: { success: true } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$pool_address",
          latest: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$latest" } },
      { $sort: { total_apy: -1 } },
    ]);

    return latestRecords;
  } catch (error) {
    console.error("Error fetching latest APY:", error);
    throw error;
  }
}

/**
 * Get APY history for a specific pool
 */
export async function getPoolApyHistory(
  poolAddress: string,
  hours: number = 24
): Promise<any[]> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const history = await ApyHistory.find({
      pool_address: poolAddress.toLowerCase(),
      timestamp: { $gte: since },
      success: true,
    })
      .sort({ timestamp: 1 })
      .lean();

    return history;
  } catch (error) {
    console.error("Error fetching pool APY history:", error);
    throw error;
  }
}

/**
 * Get APY statistics for a pool
 */
export async function getPoolApyStats(poolAddress: string, hours: number = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await ApyHistory.aggregate([
      {
        $match: {
          pool_address: poolAddress.toLowerCase(),
          timestamp: { $gte: since },
          success: true,
        },
      },
      {
        $group: {
          _id: null,
          current: { $last: "$total_apy" },
          average: { $avg: "$total_apy" },
          min: { $min: "$total_apy" },
          max: { $max: "$total_apy" },
          count: { $sum: 1 },
        },
      },
    ]);

    return stats[0] || null;
  } catch (error) {
    console.error("Error fetching pool APY stats:", error);
    throw error;
  }
}
