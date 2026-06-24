import { Request, Response } from "express";
import sequelize from "../config/db.js";
import BillingConfig from "../models/BillingConfig.js";
import Expense from "../models/Expense.js";
import Invoice from "../models/Invoice.js";
import Membership from "../models/Membership.js";
import SocietyBalance from "../models/SocietyBalance.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";
import { uploadToR2 } from "../utils/r2Uploader.js";

// 📊 1. Fetch Dynamic Dashboard Financial Calculations
export const getFinancialSummary = async (req: Request, res: Response) => {
  const { societyId } = req.query;
  try {
    const collectedData =
      (await Invoice.sum("amount", {
        where: { societyId: Number(societyId), status: "paid" },
      })) || 0;
    const pendingData =
      (await Invoice.sum("amount", {
        where: { societyId: Number(societyId), status: "pending" },
      })) || 0;

    // Fetch asset balances
    const balances = await SocietyBalance.findOne({
      where: { societyId: Number(societyId) },
    });

    return sendSuccess(res, 200, "Financial summary loaded successfully", {
      totalCollected: collectedData,
      totalPending: pendingData,
      cashBalance: balances?.cashBalance || 0,
      bankBalance: balances?.bankBalance || 0,
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to load financial records",
      "FETCH_ERROR",
      error,
    );
  }
};

// 📝 2. Admin Action: Record a Manual Payment Verification (Cash/Cheque)
export const markInvoicePaid = async (req: Request, res: Response) => {
  const { invoiceId, paymentMethod } = req.body; // 'cash' | 'cheque' | 'online'

  const t = await sequelize.transaction(); // Ensure absolute ACID isolation
  try {
    const invoice = await Invoice.findByPk(invoiceId, { transaction: t });
    if (!invoice || invoice.status === "paid") {
      await t.rollback();
      return sendError(
        res,
        404,
        "Invoice invalid or already settled.",
        "INVOICE_INVALID",
      );
    }

    // Process parameters
    invoice.status = "paid";
    invoice.paymentMethod = paymentMethod;
    invoice.paidAt = new Date();
    await invoice.save({ transaction: t });

    // Mutate the asset registry values automatically
    const [balance] = await SocietyBalance.findOrCreate({
      where: { societyId: invoice.societyId },
      defaults: { cashBalance: 0, bankBalance: 0 },
      transaction: t,
    });

    if (paymentMethod === "cash") {
      balance.cashBalance =
        Number(balance.cashBalance) + Number(invoice.amount);
    } else {
      // Cheques and future Online mock settlements route straight to bank assets
      balance.bankBalance =
        Number(balance.bankBalance) + Number(invoice.amount);
    }
    await balance.save({ transaction: t });

    await t.commit();
    return sendSuccess(
      res,
      200,
      "Invoice marked as paid and society balances adjusted.",
      { invoice },
    );
  } catch (error) {
    await t.rollback();
    return sendError(
      res,
      500,
      "Transaction rolled back due to execution failure",
      "TRANSACTION_FAILURE",
      error,
    );
  }
};

// 📉 3. Admin Action: Record a Monthly Operational Expense Payout
export const logExpense = async (req: Request, res: Response) => {
  const { societyId, title, amount, category, paymentMethod } = req.body;

  if (!societyId || !title || !amount || !category || !paymentMethod) {
    return sendError(
      res,
      400,
      "All parameters are mandatory.",
      "MISSING_PARAMETERS",
    );
  }

  const expenseAmount = Number(amount);
  if (isNaN(expenseAmount) || expenseAmount <= 0) {
    return sendError(
      res,
      400,
      "Amount must be a positive number.",
      "INVALID_AMOUNT",
    );
  }

  const t = await sequelize.transaction();
  try {
    const balance = await SocietyBalance.findOne({
      where: { societyId: Number(societyId) },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!balance) {
      await t.rollback();
      return sendError(
        res,
        422,
        "Financial accounts uninitialized.",
        "ACCOUNTS_NOT_FOUND",
      );
    }

    if (paymentMethod === "cash") {
      const currentCash = Number(balance.cashBalance);
      if (currentCash < expenseAmount) {
        await t.rollback();
        return sendError(
          res,
          422,
          `Insufficient liquid cash. Available: $${currentCash.toFixed(2)}`,
          "INSUFFICIENT_FUNDS",
        );
      }
      balance.cashBalance = currentCash - expenseAmount;
    } else {
      const currentBank = Number(balance.bankBalance);
      if (currentBank < expenseAmount) {
        await t.rollback();
        return sendError(
          res,
          422,
          `Insufficient bank reserves. Available: $${currentBank.toFixed(2)}`,
          "INSUFFICIENT_FUNDS",
        );
      }
      balance.bankBalance = currentBank - expenseAmount;
    }

    const expense = await Expense.create(
      {
        societyId: Number(societyId),
        title,
        amount: expenseAmount,
        category,
        paymentMethod,
      },
      { transaction: t },
    );

    await balance.save({ transaction: t });
    await t.commit();

    // Clean, structured contractual success dispatch
    return sendSuccess(
      res,
      201,
      "Expense recorded successfully against reserves.",
      expense,
    );
  } catch (error: any) {
    await t.rollback();
    return sendError(
      res,
      500,
      "Failed to execute transactional allocation.",
      "INTERNAL_SERVER_ERROR",
      error.message,
    );
  }
};

// ⚙️ 4. Get Billing Configuration
export const getBillingConfig = async (req: Request, res: Response) => {
  const { societyId } = req.query;

  if (!societyId) {
    return sendError(
      res,
      400,
      "Society ID is required.",
      "MISSING_SOCIETY_ID"
    );
  }

  try {
    const [config] = await BillingConfig.findOrCreate({
      where: { societyId: Number(societyId), wingId: null },
      defaults: {
        societyId: Number(societyId),
        wingId: null,
        calculationType: "flat_rate",
        baseAmount: 0.0,
        maintenanceBreakdown: "[]",
        perSqftRate: 0.0,
        flatTypeRates: "{}",
        gracePeriodDays: 10,
        lateFeeType: "none",
        lateFeeAmount: 0.0,
      },
    });

    return sendSuccess(res, 200, "Billing configuration loaded successfully", config);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to load billing configuration",
      "FETCH_ERROR",
      error
    );
  }
};

// 💾 5. Save Billing Configuration
export const saveBillingConfig = async (req: Request, res: Response) => {
  const { societyId } = req.query;
  const {
    calculationType,
    baseAmount,
    perSqftRate,
    gracePeriodDays,
    lateFeeType,
    lateFeeAmount,
    flatTypeRates,
    maintenanceBreakdown,
  } = req.body;

  if (!societyId) {
    return sendError(
      res,
      400,
      "Society ID is required.",
      "MISSING_SOCIETY_ID"
    );
  }

  try {
    const [config] = await BillingConfig.findOrCreate({
      where: { societyId: Number(societyId), wingId: null },
      defaults: {
        societyId: Number(societyId),
        wingId: null,
        calculationType: "flat_rate",
        baseAmount: 0.0,
        maintenanceBreakdown: "[]",
        perSqftRate: 0.0,
        flatTypeRates: "{}",
        gracePeriodDays: 10,
        lateFeeType: "none",
        lateFeeAmount: 0.0,
      },
    });

    // Update config fields
    if (calculationType !== undefined) config.calculationType = calculationType;
    if (baseAmount !== undefined) config.baseAmount = Number(baseAmount);
    if (perSqftRate !== undefined) config.perSqftRate = Number(perSqftRate);
    if (gracePeriodDays !== undefined) config.gracePeriodDays = Number(gracePeriodDays);
    if (lateFeeType !== undefined) config.lateFeeType = lateFeeType;
    if (lateFeeAmount !== undefined) config.lateFeeAmount = Number(lateFeeAmount);
    if (flatTypeRates !== undefined) config.flatTypeRates = flatTypeRates;
    if (maintenanceBreakdown !== undefined) config.maintenanceBreakdown = maintenanceBreakdown;

    await config.save();

    return sendSuccess(res, 200, "Billing configuration updated successfully", config);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to save billing configuration",
      "SAVE_ERROR",
      error
    );
  }
};

// 💳 6. Fetch All Invoices associated with a specific Membership ID
export const getInvoices = async (req: Request, res: Response) => {
  const { membershipId } = req.query;

  if (!membershipId) {
    return sendError(
      res,
      400,
      "Membership ID is required.",
      "MISSING_MEMBERSHIP_ID",
    );
  }

  try {
    const invoices = await Invoice.findAll({
      where: { membershipId: Number(membershipId) },
      order: [["createdAt", "DESC"]],
    });

    const membership = await Membership.findByPk(Number(membershipId));
    const advanceWalletBalance = membership ? Number(membership.advanceWalletBalance) : 0;

    return sendSuccess(res, 200, "Invoices loaded successfully", {
      invoices,
      advanceWalletBalance,
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to load invoices",
      "FETCH_ERROR",
      error,
    );
  }
};

// 📋 7. Admin Action: Fetch all pending invoices for verification validation
export const getPendingInvoices = async (req: Request, res: Response) => {
  const { societyId } = req.query;

  if (!societyId) {
    return sendError(
      res,
      400,
      "Society ID is required.",
      "MISSING_SOCIETY_ID",
    );
  }

  try {
    const pendingInvoices = await Invoice.findAll({
      where: {
        societyId: Number(societyId),
        status: ["pending", "pending_approval"],
      },
      include: [
        {
          model: Membership,
          attributes: ["id", "flatNumber", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return sendSuccess(res, 200, "Pending invoices loaded successfully", pendingInvoices);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to load pending invoices",
      "FETCH_ERROR",
      error,
    );
  }
};

// 📝 8. Resident Action: Submit a Payment Proof/Reference for Verification
export const submitPaymentProof = async (req: Request, res: Response) => {
  const { invoiceId, paymentMethod, paymentRef, remarks, membershipId } = req.body;

  if (!invoiceId || !paymentMethod) {
    return sendError(
      res,
      400,
      "Invoice ID and payment method are required.",
      "MISSING_PARAMETERS",
    );
  }

  try {
    let uploadedProofUrl: string | null = null;
    if (req.file) {
      uploadedProofUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        "receipts",
        req.file.mimetype,
      );
    }

    const t = await sequelize.transaction();
    try {
      const invoice = await Invoice.findByPk(Number(invoiceId), { transaction: t });
      if (!invoice) {
        await t.rollback();
        return sendError(res, 404, "Invoice not found.", "NOT_FOUND");
      }

      if (invoice.status === "paid") {
        await t.rollback();
        return sendError(
          res,
          400,
          "Invoice has already been settled and marked paid.",
          "ALREADY_PAID",
        );
      }

      let isAutoApprove = false;
      if (membershipId) {
        const membership = await Membership.findByPk(Number(membershipId), { transaction: t });
        if (membership && (membership.role === "admin" || membership.role === "treasurer")) {
          isAutoApprove = true;
        }
      }

      // Update invoice parameters
      invoice.paymentMethod = paymentMethod;
      invoice.paymentRef = paymentRef || null;
      invoice.remarks = remarks || null;
      if (uploadedProofUrl) {
        invoice.proofUrl = uploadedProofUrl;
      }

      if (isAutoApprove) {
        invoice.status = "paid";
        invoice.paidAt = new Date();

        // Mutate the asset registry values automatically
        const [balance] = await SocietyBalance.findOrCreate({
          where: { societyId: invoice.societyId },
          defaults: { cashBalance: 0, bankBalance: 0 },
          transaction: t,
        });

        if (paymentMethod === "cash") {
          balance.cashBalance =
            Number(balance.cashBalance) + Number(invoice.amount);
        } else {
          // Cheques and future Online mock settlements route straight to bank assets
          balance.bankBalance =
            Number(balance.bankBalance) + Number(invoice.amount);
        }
        await balance.save({ transaction: t });
      } else {
        invoice.status = "pending_approval";
      }

      await invoice.save({ transaction: t });
      await t.commit();

      const message = isAutoApprove
        ? "Payment completed and approved automatically by Admin."
        : "Payment verification submitted successfully. Waiting for admin approval.";

      return sendSuccess(
        res,
        200,
        message,
        invoice,
      );
    } catch (dbError) {
      await t.rollback();
      throw dbError;
    }
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to submit payment proof",
      "SUBMIT_PROOF_FAILURE",
      error,
    );
  }
};

// 📋 9. Get Chronological Expense History
export const getExpensesHistory = async (req: Request, res: Response) => {
  const { societyId } = req.query;

  if (!societyId) {
    return sendError(
      res,
      400,
      "Society ID is required.",
      "MISSING_SOCIETY_ID",
    );
  }

  try {
    const expenses = await Expense.findAll({
      where: { societyId: Number(societyId) },
      order: [["createdAt", "DESC"]],
    });

    return sendSuccess(res, 200, "Expense history loaded successfully", expenses);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to load expense history",
      "FETCH_ERROR",
      error,
    );
  }
};

// 💳 10. Admin Action: Load wallet top-up for a resident membership
export const topupWallet = async (req: Request, res: Response) => {
  const { targetMembershipId, amount, paymentMethod, societyId } = req.body;

  if (!targetMembershipId || !amount || !paymentMethod || !societyId) {
    return sendError(
      res,
      400,
      "Missing top-up parameters.",
      "MISSING_PARAMETERS",
    );
  }

  const topupAmount = Number(amount);
  if (isNaN(topupAmount) || topupAmount <= 0) {
    return sendError(
      res,
      400,
      "Invalid amount. Must be a positive number.",
      "INVALID_AMOUNT",
    );
  }

  if (!["cash", "cheque", "online"].includes(paymentMethod)) {
    return sendError(
      res,
      400,
      "Invalid payment method. Use 'cash', 'cheque', or 'online'.",
      "INVALID_PAYMENT_METHOD",
    );
  }

  const t = await sequelize.transaction();
  try {
    const targetMembership = await Membership.findOne({
      where: { id: Number(targetMembershipId), societyId: Number(societyId) },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!targetMembership) {
      await t.rollback();
      return sendError(
        res,
        404,
        "Resident membership not found in this society.",
        "RESIDENT_NOT_FOUND",
      );
    }

    targetMembership.advanceWalletBalance = 
      Number(targetMembership.advanceWalletBalance) + topupAmount;
    await targetMembership.save({ transaction: t });

    const [balance] = await SocietyBalance.findOrCreate({
      where: { societyId: Number(societyId) },
      defaults: { cashBalance: 0, bankBalance: 0 },
      transaction: t,
    });

    if (paymentMethod === "cash") {
      balance.cashBalance = Number(balance.cashBalance) + topupAmount;
    } else {
      balance.bankBalance = Number(balance.bankBalance) + topupAmount;
    }
    await balance.save({ transaction: t });

    await t.commit();

    return sendSuccess(
      res,
      200,
      "Wallet topped up successfully.",
      {
        advanceWalletBalance: targetMembership.advanceWalletBalance,
        cashBalance: balance.cashBalance,
        bankBalance: balance.bankBalance,
      }
    );
  } catch (error: any) {
    await t.rollback();
    return sendError(
      res,
      500,
      "Failed to process wallet top-up.",
      "TRANSACTION_FAILURE",
      error.message || error,
    );
  }
};
