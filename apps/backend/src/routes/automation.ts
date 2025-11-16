import { Router, Request, Response } from "express";
import { AutomationHistory } from "../models/AutomationHistory";
import { runVaultAutomation } from "../services/vaultAutomation";

const router: Router = Router();

/**
 * GET /api/automation/history
 * Get automation history
 * Query params: vault (optional - filter by vault address), limit (default: 100)
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    const vaultAddress = req.query.vault as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const query: any = {};
    if (vaultAddress) {
      query.vault_address = vaultAddress.toLowerCase();
    }

    const history = await AutomationHistory.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error: any) {
    console.error("Error fetching automation history:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch automation history",
    });
  }
});

/**
 * GET /api/automation/latest
 * Get latest automation run
 * Query params: vault (optional - filter by vault address)
 */
router.get("/latest", async (req: Request, res: Response) => {
  try {
    const vaultAddress = req.query.vault as string | undefined;

    const query: any = {};
    if (vaultAddress) {
      query.vault_address = vaultAddress.toLowerCase();
    }

    const latest = await AutomationHistory.findOne(query)
      .sort({ timestamp: -1 })
      .lean();

    if (!latest) {
      return res.json({
        success: true,
        automation: null,
        message: "No automation history available",
      });
    }

    res.json({
      success: true,
      automation: latest,
    });
  } catch (error: any) {
    console.error("Error fetching latest automation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch latest automation",
    });
  }
});

/**
 * POST /api/automation/run
 * Manually trigger automation run
 */
router.post("/run", async (req: Request, res: Response) => {
  try {
    console.log("🤖 Manual automation trigger received");

    // Run automation asynchronously (don't wait for it to complete)
    runVaultAutomation().catch((error) => {
      console.error("❌ Error in manual automation run:", error);
    });

    res.json({
      success: true,
      message: "Automation triggered successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error triggering automation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to trigger automation",
    });
  }
});

export default router;
