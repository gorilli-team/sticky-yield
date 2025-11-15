import { Router, type Request, type Response } from "express";
import { getBestYield, getHistoricalYields } from "../services/gluexYields";

const router: Router = Router();

// Get best current yield
router.get("/best", async (req: Request, res: Response) => {
  try {
    const data = await getBestYield();
    res.json(data);
  } catch (error) {
    console.error("Error fetching best yield:", error);
    res.status(500).json({ error: "Failed to fetch yield data" });
  }
});

// Get historical yields
router.get("/historical", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const data = await getHistoricalYields(days);
    res.json(data);
  } catch (error) {
    console.error("Error fetching historical yields:", error);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

export default router;
