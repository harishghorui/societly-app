import cron from "node-cron";
import Society from "../models/Society.js";
import BillingCycle from "../models/BillingCycle.js";
import { processSocietyInvoicingBatch } from "../services/billingEngineService.js";

/**
 * Startup Recovery Hook
 * Looks up any billing cycles stuck in the 'processing' state (due to crash/restart mid-batch)
 * and resets their status to 'failed' with a recovery log.
 */
export const recoverBillingCycles = async () => {
  try {
    const stuckCycles = await BillingCycle.findAll({
      where: { status: "processing" },
    });

    if (stuckCycles.length > 0) {
      console.log(`⚠️ Found ${stuckCycles.length} stuck billing cycles in 'processing' status. Recovering...`);
      for (const cycle of stuckCycles) {
        cycle.status = "failed";
        cycle.logs = `${cycle.logs || ""}\n[Recovery Hook]: Reset stuck processing status on startup (possible server crash/restart).`;
        await cycle.save();
        console.log(`✅ Recovered billing cycle ID ${cycle.id} (${cycle.cycleMonthStr}) to failed state.`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to execute startup billing recovery hook:", error);
  }
};

/**
 * Master Invoicing Heartbeat Cron Worker
 * Configured to run cleanly at Midnight (00:00) on the 1st of every month
 */
export const initializeAutomatedBillingScheduler = () => {
  cron.schedule("0 0 1 * *", async () => {
    console.log("🏁 Core Automated Billing Scheduler Worker Hook Triggered...");

    // Generate standard date parameters string
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const targetMonthStr = `${currentYear}-${currentMonth}`; // e.g., "2026-06"

    try {
      // Pull all active society platforms registered on our SaaS ecosystem
      const activeSocieties = await Society.findAll({ attributes: ["id"] });

      for (const society of activeSocieties) {
        console.log(
          `🔄 Enqueueing billing cycle tracking execution paths for Society ID: ${society.id}`,
        );
        // Offloads processing context to our state isolation loop cleanly
        await processSocietyInvoicingBatch(society.id, targetMonthStr);
      }

      console.log(
        "✨ Global automated system invoice dispatch batch successfully resolved.",
      );
    } catch (error) {
      console.error(
        "❌ Critical system error during master cron invoicing routine execution:",
        error,
      );
    }
  });
};

