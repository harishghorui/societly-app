import { Request, Response } from "express";
import sequelize from "../config/db.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Society from "../models/Society.js";
import Wing from "../models/Wing.js";
import Flat from "../models/Flat.js";
import Invoice from "../models/Invoice.js";
import SocietyBalance from "../models/SocietyBalance.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";

/**
 * 📊 1. Initialize opening Cash & Bank balances for a new society
 */
export const initializeBalances = async (req: Request, res: Response) => {
  const { societyId, startingCashBalance, startingBankBalance } = req.body;

  if (!societyId) {
    return sendError(res, 400, "Society ID is required.", "MISSING_SOCIETY_ID");
  }

  const cash = Number(startingCashBalance || 0);
  const bank = Number(startingBankBalance || 0);

  if (isNaN(cash) || cash < 0 || isNaN(bank) || bank < 0) {
    return sendError(res, 400, "Balances must be non-negative numbers.", "INVALID_BALANCES");
  }

  const t = await sequelize.transaction();
  try {
    const society = await Society.findByPk(Number(societyId), { transaction: t });
    if (!society) {
      await t.rollback();
      return sendError(res, 404, "Society not found.", "SOCIETY_NOT_FOUND");
    }

    if (society.onboardingStep === "FINANCIAL" || society.onboardingStep === "COMPLETED") {
      await t.rollback();
      return sendError(
        res,
        400,
        "Financial balances have already been initialized.",
        "ALREADY_INITIALIZED"
      );
    }

    // Upsert the SocietyBalance
    const [balance, created] = await SocietyBalance.findOrCreate({
      where: { societyId: Number(societyId) },
      defaults: { cashBalance: cash, bankBalance: bank },
      transaction: t,
    });

    if (!created) {
      await t.rollback();
      return sendError(
        res,
        400,
        "Financial balances have already been initialized.",
        "ALREADY_INITIALIZED"
      );
    }

    // Advance society onboardingStep
    society.onboardingStep = "FINANCIAL";
    await society.save({ transaction: t });

    await t.commit();

    return sendSuccess(res, 200, "Opening balances initialized successfully.", {
      societyId: society.id,
      onboardingStep: society.onboardingStep,
      cashBalance: balance.cashBalance,
      bankBalance: balance.bankBalance,
    });
  } catch (error: any) {
    await t.rollback();
    return sendError(
      res,
      500,
      "Failed to initialize opening balances.",
      "INITIALIZATION_ERROR",
      error.message || error
    );
  }
};

/**
 * 👥 2. Bulk seed resident list, advance wallets, and historical invoices
 */
export const bulkSeedResidents = async (req: Request, res: Response) => {
  const { societyId, residents } = req.body;

  if (!societyId || !Array.isArray(residents)) {
    return sendError(
      res,
      400,
      "Missing societyId or residents array.",
      "INVALID_INPUT"
    );
  }

  const t = await sequelize.transaction();
  try {
    const society = await Society.findByPk(Number(societyId), { transaction: t });
    if (!society) {
      await t.rollback();
      return sendError(res, 404, "Society not found.", "SOCIETY_NOT_FOUND");
    }

    // Find all wings in this society
    const wings = await Wing.findAll({
      where: { societyId: Number(societyId) },
      transaction: t,
    });
    const wingIds = wings.map(w => w.id);

    const importResults = [];

    for (const resData of residents) {
      const {
        flatNumber,
        wingName,
        name,
        phone,
        email,
        role,
        advanceWalletBalance,
        historicalInvoices,
      } = resData;

      if (!flatNumber || !name || !phone) {
        await t.rollback();
        return sendError(
          res,
          400,
          `Missing required fields (flatNumber, name, phone) in resident entry.`,
          "VALIDATION_ERROR"
        );
      }

      // Find the wing if wingName is provided
      let targetWingId: number | null = null;
      if (wingName) {
        const wing = wings.find(w => w.name.toLowerCase() === wingName.toLowerCase());
        if (wing) {
          targetWingId = wing.id;
        }
      }

      // Find Flat
      const flat = await Flat.findOne({
        where: {
          flatNumber,
          ...(targetWingId ? { wingId: targetWingId } : { wingId: wingIds }),
        },
        transaction: t,
      });

      if (!flat) {
        await t.rollback();
        return sendError(
          res,
          404,
          `Flat unit ${flatNumber} not found in this society.`,
          "FLAT_NOT_FOUND"
        );
      }

      // Look up or create a placeholder User by phone
      const [user] = await User.findOrCreate({
        where: { phone },
        defaults: {
          name,
          phone,
          pin: null,
          status: 'invited',
          hidePhoneNumber: false,
        },
        transaction: t,
      });

      // Create a pending_activation Membership
      let membership = await Membership.findOne({
        where: {
          userId: user.id,
          societyId: society.id,
          flatId: flat.id,
        },
        transaction: t,
      });

      if (!membership) {
        membership = await Membership.create({
          userId: user.id,
          societyId: society.id,
          wingId: flat.wingId,
          flatId: flat.id,
          flatNumber,
          role: role || "owner",
          status: "pending_activation",
          advanceWalletBalance: Number(advanceWalletBalance || 0.00),
        }, { transaction: t });
      } else {
        membership.status = "pending_activation";
        membership.advanceWalletBalance = Number(membership.advanceWalletBalance) + Number(advanceWalletBalance || 0.00);
        await membership.save({ transaction: t });
      }

      // Batch-insert historical invoices
      if (Array.isArray(historicalInvoices) && historicalInvoices.length > 0) {
        const invoicesToCreate = historicalInvoices.map((inv: any) => {
          return {
            membershipId: membership.id,
            societyId: society.id,
            amount: Number(inv.amount),
            billingCycle: inv.billingCycle,
            dueDate: inv.dueDate ? new Date(inv.dueDate) : new Date(),
            status: inv.status || "pending",
            paymentMethod: inv.paymentMethod || null,
            paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
            isHistorical: true,
          };
        });

        await Invoice.bulkCreate(invoicesToCreate, { transaction: t });
      }

      importResults.push({
        flatNumber,
        name,
        phone,
        membershipId: membership.id,
      });
    }

    // Finalize onboarding step
    society.onboardingStep = "COMPLETED";
    await society.save({ transaction: t });

    await t.commit();

    return sendSuccess(res, 200, "Residents and history bulk-seeded successfully.", {
      importedCount: importResults.length,
      societyId: society.id,
      onboardingStep: society.onboardingStep,
    });
  } catch (error: any) {
    await t.rollback();
    return sendError(
      res,
      500,
      "Failed to bulk seed residents and historical invoices.",
      "SEED_ERROR",
      error.message || error
    );
  }
};
