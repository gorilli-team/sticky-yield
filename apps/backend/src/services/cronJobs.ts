import cron, { ScheduledTask } from "node-cron";
import { trackAllPoolsApy } from "./apyTracker";
import { getDatabaseStatus } from "./database";

let apyTrackingJob: ScheduledTask | null = null;

/**
 * Start all cron jobs
 */
export function startCronJobs(): void {
  console.log("⏰ Starting cron jobs...");

  // APY tracking - every minute
  apyTrackingJob = cron.schedule("*/5 * * * *", async () => {
    // Check database connection
    if (!getDatabaseStatus()) {
      console.error("⚠️  Skipping APY tracking - database not connected");
      return;
    }

    try {
      await trackAllPoolsApy();
    } catch (error) {
      console.error("❌ Error in APY tracking cron job:", error);
    }
  });

  console.log("✅ APY tracking cron job started (runs every minute)");

  // Run once immediately on startup
  setTimeout(async () => {
    if (getDatabaseStatus()) {
      console.log("🚀 Running initial APY tracking...");
      await trackAllPoolsApy();
    }
  }, 5000); // Wait 5 seconds for everything to initialize
}

/**
 * Stop all cron jobs
 */
export function stopCronJobs(): void {
  console.log("⏰ Stopping cron jobs...");

  if (apyTrackingJob) {
    apyTrackingJob.stop();
    console.log("✅ APY tracking cron job stopped");
  }
}

/**
 * Get status of all cron jobs
 */
export function getCronJobsStatus() {
  return {
    apyTracking: {
      active: apyTrackingJob ? true : false,
      schedule: "* * * * *", // Every minute
      description: "Tracks APY for all pools",
    },
  };
}
