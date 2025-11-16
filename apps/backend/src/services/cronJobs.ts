import cron, { ScheduledTask } from "node-cron";
import { trackAllPoolsApy } from "./apyTracker";
import { runVaultAutomation } from "./vaultAutomation";
import { getDatabaseStatus } from "./database";

let apyTrackingJob: ScheduledTask | null = null;
let automationJob: ScheduledTask | null = null;

/**
 * Start all cron jobs
 */
export function startCronJobs(): void {
  console.log("⏰ Starting cron jobs...");

  // APY tracking - every 5 minutes
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

  console.log("✅ APY tracking cron job started (runs every 5 minutes)");

  // Vault automation - every hour
  automationJob = cron.schedule("0 * * * *", async () => {
    // Check database connection
    if (!getDatabaseStatus()) {
      console.error("⚠️  Skipping automation - database not connected");
      return;
    }

    try {
      await runVaultAutomation();
    } catch (error) {
      console.error("❌ Error in automation cron job:", error);
    }
  });

  console.log("✅ Vault automation cron job started (runs every hour)");

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

  if (automationJob) {
    automationJob.stop();
    console.log("✅ Vault automation cron job stopped");
  }
}

/**
 * Get status of all cron jobs
 */
export function getCronJobsStatus() {
  return {
    apyTracking: {
      active: apyTrackingJob ? true : false,
      schedule: "*/5 * * * *",
      description: "Tracks APY for all pools",
    },
    vaultAutomation: {
      active: automationJob ? true : false,
      schedule: "0 * * * *",
      description: "Runs vault automation (reallocation logic)",
    },
  };
}
