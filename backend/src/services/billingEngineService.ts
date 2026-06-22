import sequelize from "../config/db.js";
import BillingConfig from "../models/BillingConfig.js";
import BillingCycle from "../models/BillingCycle.js";
import Flat from "../models/Flat.js";
import Invoice from "../models/Invoice.js";
import Membership from "../models/Membership.js";
import Wing from "../models/Wing.js";

export const processSocietyInvoicingBatch = async (
  societyId: number,
  targetMonthStr: string,
) => {
  // 1. Establish an idempotent billing cycle block instance safely
  const [cycle, created] = await BillingCycle.findOrCreate({
    where: { societyId, cycleMonthStr: targetMonthStr },
    defaults: { status: "processing", logs: "Batch execution loop opened." },
  });

  if (
    !created &&
    (cycle.status === "completed" || cycle.status === "processing")
  ) {
    console.log(
      `⚠️ Billing batch ${targetMonthStr} for society ${societyId} already processed or active. skipping.`,
    );
    return;
  }

  cycle.status = "processing";
  await cycle.save();

  // 2. Fetch all active physical residential assets tied to the society
  const wings = await Wing.findAll({
    where: { societyId },
    attributes: ["id"],
  });
  const wingIds = wings.map((w) => w.id);

  const flats = await Flat.findAll({
    where: { wingId: wingIds },
    include: [
      { model: Membership, where: { status: "active" }, required: false },
    ],
  });

  // Fetch configs
  const globalConfig = await BillingConfig.findOne({
    where: { societyId, wingId: null },
  });
  const wingConfigs = await BillingConfig.findAll({
    where: { societyId, wingId: wingIds },
  });

  let successCount = 0;
  let processingErrors: string[] = [];

  for (const flat of flats) {
    const t = await sequelize.transaction();
    try {
      const membershipData = flat.memberships?.[0];
      if (!membershipData) {
        await t.rollback();
        continue; // Skip generation if flat currently has no verified resident linked
      }

      // Re-fetch Membership inside the transaction with a row lock (FOR UPDATE)
      const activeMembership = await Membership.findByPk(membershipData.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!activeMembership || activeMembership.status !== "active") {
        await t.rollback();
        continue; // Skip if membership is no longer active or exists
      }

      // Check if invoice already exists for this membership and billingCycle
      const existingInvoice = await Invoice.findOne({
        where: {
          membershipId: activeMembership.id,
          billingCycle: targetMonthStr,
        },
        transaction: t,
      });

      if (existingInvoice) {
        await t.rollback();
        continue; // Skip if invoice already generated for this cycle
      }

      // 3. Extract the applicable pricing tier config (Hierarchical Cascade rule)
      const currentConfig =
        wingConfigs.find((wc) => wc.wingId === flat.wingId) || globalConfig;
      if (!currentConfig) {
        throw new Error(
          `No available BillingConfig schema defined for Flat ID: ${flat.id}`,
        );
      }

      // 4. Calculate core maintenance cost values based on config types
      let calculatedMaintenanceAmount = 0;
      if (currentConfig.calculationType === "flat_rate") {
        calculatedMaintenanceAmount = Number(currentConfig.baseAmount);
      } else if (currentConfig.calculationType === "per_sqft") {
        calculatedMaintenanceAmount =
          Number(flat.squareFootage) * Number(currentConfig.perSqftRate);
      } else if (currentConfig.calculationType === "flat_type") {
        const structuralRates = JSON.parse(currentConfig.flatTypeRates || "{}");
        calculatedMaintenanceAmount = Number(
          structuralRates[flat.flatType] || currentConfig.baseAmount,
        );
      }

      // 5. Setup due dates
      const generationDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(generationDate.getDate() + currentConfig.gracePeriodDays);

      // 6. Execute Advance Credit Wallet Checks
      let invoiceStatus: "pending" | "paid" = "pending";
      let walletDeduction = 0;
      const currentWalletBalance = Number(
        activeMembership.advanceWalletBalance,
      );

      if (currentWalletBalance >= calculatedMaintenanceAmount) {
        invoiceStatus = "paid";
        walletDeduction = calculatedMaintenanceAmount;
        activeMembership.advanceWalletBalance =
          currentWalletBalance - calculatedMaintenanceAmount;
        await activeMembership.save({ transaction: t });
      }

      // 7. Write Invoice ledger row to disk permanently
      await Invoice.create(
        {
          membershipId: activeMembership.id,
          societyId,
          amount: calculatedMaintenanceAmount,
          billingCycle: targetMonthStr,
          dueDate,
          status: invoiceStatus,
          paymentMethod: invoiceStatus === "paid" ? "online" : null, // Mapped as online/internal clearing settlement
          paidAt: invoiceStatus === "paid" ? new Date() : null,
        },
        { transaction: t },
      );

      await t.commit();
      successCount++;
    } catch (err: any) {
      await t.rollback();
      processingErrors.push(`Unit ${flat.flatNumber}: ${err.message}`);
    }
  }

  // 8. Resolve final Billing Cycle statuses
  cycle.status =
    processingErrors.length === flats.length ? "failed" : "completed";
  cycle.logs = `Completed: ${successCount}. Errors: ${JSON.stringify(processingErrors)}`;
  await cycle.save();
};
