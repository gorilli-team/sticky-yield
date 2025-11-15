// IMPORTANT: Load environment variables FIRST before any other imports
import "./config/env";

import express from "express";
import cors from "cors";
import yields from "./routes/yields";
import optimize from "./routes/optimize";
import testGluex from "./routes/test-gluex";
import apyRoutes from "./routes/apy";
import { connectDatabase, getDatabaseStatus } from "./services/database";
import { startCronJobs, stopCronJobs } from "./services/cronJobs";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/yields", yields);
app.use("/optimize", optimize);
app.use("/test-gluex", testGluex);
app.use("/api/apy", apyRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus() ? "connected" : "disconnected",
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB (optional - server will start even if not configured)
    try {
      await connectDatabase();
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      process.exit(1);
    }

    // Start cron jobs (will skip if database not connected)
    startCronJobs();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(
        `📊 Test GlueX API at: http://localhost:${PORT}/test-gluex/test`
      );
      console.log(`📈 APY tracking active (every minute)`);
      console.log(
        `🔌 Database status: ${
          getDatabaseStatus() ? "✅ Connected" : "❌ Disconnected"
        }`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⚠️  Shutting down gracefully...");
  stopCronJobs();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⚠️  Shutting down gracefully...");
  stopCronJobs();
  process.exit(0);
});

startServer();
