import { Router, Request, Response } from "express";
import {
  getLatestApy,
  getPoolApyHistory,
  getPoolApyStats,
} from "../services/apyTracker";
import { getCronJobsStatus } from "../services/cronJobs";

const router: Router = Router();

/**
 * GET /api/apy/latest
 * Get latest APY for all tracked pools
 */
router.get("/latest", async (req: Request, res: Response) => {
  try {
    const latestApy = await getLatestApy();
    res.json({
      success: true,
      count: latestApy.length,
      pools: latestApy,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching latest APY:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch latest APY",
    });
  }
});

/**
 * GET /api/apy/history/:poolAddress
 * Get APY history for a specific pool
 * Query params: hours (default: 24)
 */
router.get("/history/:poolAddress", async (req: Request, res: Response) => {
  try {
    const { poolAddress } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    const history = await getPoolApyHistory(poolAddress, hours);

    res.json({
      success: true,
      pool_address: poolAddress,
      hours,
      count: history.length,
      history,
    });
  } catch (error: any) {
    console.error("Error fetching pool APY history:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch pool APY history",
    });
  }
});

/**
 * GET /api/apy/stats/:poolAddress
 * Get APY statistics for a specific pool
 * Query params: hours (default: 24)
 */
router.get("/stats/:poolAddress", async (req: Request, res: Response) => {
  try {
    const { poolAddress } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    const stats = await getPoolApyStats(poolAddress, hours);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: "No data found for this pool",
      });
    }

    res.json({
      success: true,
      pool_address: poolAddress,
      hours,
      stats,
    });
  } catch (error: any) {
    console.error("Error fetching pool APY stats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch pool APY stats",
    });
  }
});

/**
 * GET /api/apy/tvl/token/:tokenAddress
 * Get TVL history for all pools for a specific token
 * Query params: hours (default: 24)
 * NOTE: This route must come BEFORE /token/:tokenAddress to avoid route conflicts
 */
router.get("/tvl/token/:tokenAddress", async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    // Get latest APY to find all pools for this token
    const latestApy = await getLatestApy();
    const tokenPools = latestApy.filter(
      (pool) => pool.input_token?.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (tokenPools.length === 0) {
      return res.json({
        success: true,
        token_address: tokenAddress,
        hours,
        pools: [],
        message: "No pools found for this token",
      });
    }

    // Get TVL history for each pool
    const poolsWithHistory = await Promise.all(
      tokenPools.map(async (pool) => {
        const history = await getPoolApyHistory(pool.pool_address, hours);
        // Extract only TVL data from history
        const tvlHistory = history.map((h: any) => ({
          timestamp: h.timestamp,
          tvl_usd: h.tvl_usd || null,
        }));
        return {
          ...pool,
          history: tvlHistory,
        };
      })
    );

    res.json({
      success: true,
      token_address: tokenAddress,
      hours,
      count: poolsWithHistory.length,
      pools: poolsWithHistory,
    });
  } catch (error: any) {
    console.error("Error fetching token TVL history:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch token TVL history",
    });
  }
});

/**
 * GET /api/apy/token/:tokenAddress
 * Get APY history for all pools for a specific token
 * Query params: hours (default: 24)
 * NOTE: This route must come AFTER /tvl/token/:tokenAddress to avoid route conflicts
 */
router.get("/token/:tokenAddress", async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    // Get latest APY to find all pools for this token
    const latestApy = await getLatestApy();
    const tokenPools = latestApy.filter(
      (pool) => pool.input_token?.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (tokenPools.length === 0) {
      return res.json({
        success: true,
        token_address: tokenAddress,
        hours,
        pools: [],
        message: "No pools found for this token",
      });
    }

    // Get history for each pool
    const poolsWithHistory = await Promise.all(
      tokenPools.map(async (pool) => {
        const history = await getPoolApyHistory(pool.pool_address, hours);
        return {
          ...pool,
          history,
        };
      })
    );

    res.json({
      success: true,
      token_address: tokenAddress,
      hours,
      count: poolsWithHistory.length,
      pools: poolsWithHistory,
    });
  } catch (error: any) {
    console.error("Error fetching token APY history:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch token APY history",
    });
  }
});

/**
 * GET /api/apy/cron/status
 * Get status of APY tracking cron jobs
 */
router.get("/cron/status", (req: Request, res: Response) => {
  try {
    const status = getCronJobsStatus();
    res.json({
      success: true,
      cron_jobs: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get cron job status",
    });
  }
});

export default router;
