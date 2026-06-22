import { Request, Response } from "express";
import Invoice from "../models/Invoice.js";
import Membership from "../models/Membership.js";
import { broadcastToSociety } from "../services/pushService.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";

// 💳 1. Secretary Action: Generate & Blast Monthly Bills to All Active Residents
export const bulkGenerateInvoices = async (req: Request, res: Response) => {
  const { societyId, amount, billingCycle, daysToPay } = req.body;

  if (!societyId || !amount || !billingCycle) {
    return sendError(
      res,
      400,
      "societyId, amount, and billingCycle fields are mandatory.",
      "MISSING_PARAMETERS",
    );
  }

  try {
    // Fetch all active residents/owners within this society
    const activeResidents = await Membership.findAll({
      where: { societyId: Number(societyId), status: "active" },
    });

    if (activeResidents.length === 0) {
      return sendError(
        res,
        404,
        "No active resident profiles found to invoice.",
        "NO_ACTIVE_RESIDENTS",
      );
    }

    // 🔒 Check which residents already have an invoice for this specific billingCycle
    const existingInvoices = await Invoice.findAll({
      where: {
        societyId: Number(societyId),
        billingCycle,
      },
      attributes: ["membershipId"],
    });

    const existingMembershipIds = new Set(existingInvoices.map((inv) => inv.membershipId));

    // Filter out residents who already have invoices generated for this cycle
    const residentsToInvoice = activeResidents.filter(
      (resident) => !existingMembershipIds.has(resident.id)
    );

    if (residentsToInvoice.length === 0) {
      return sendError(
        res,
        400,
        `Invoices for the billing cycle '${billingCycle}' have already been generated for all active residents.`,
        "DUPLICATE_BILLING_CYCLE",
      );
    }

    const calculatedDueDate = new Date();
    calculatedDueDate.setDate(
      calculatedDueDate.getDate() + (Number(daysToPay) || 7),
    );

    // Construct invoice rows bulk array insertion parameters
    const invoicesData = residentsToInvoice.map((resident) => ({
      membershipId: resident.id,
      societyId: Number(societyId),
      amount: Number(amount),
      billingCycle,
      dueDate: calculatedDueDate,
      status: "pending" as const,
    }));

    await Invoice.bulkCreate(invoicesData);

    // 🚀 ASYNC TRIGGER: Send an immediate push broadcast notification to everyone!
    const title = "💳 New Maintenance Bill Issued";
    const body = `Your maintenance invoice for ${billingCycle} of ₹${amount} is generated. Due in ${daysToPay || 7} days.`;
    broadcastToSociety(Number(societyId), title, body);

    return sendSuccess(
      res,
      201,
      `Successfully distributed ${invoicesData.length} invoices across building structures.`,
    );
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to compile bulk maintenance cycle execution",
      "BULK_GENERATE_ERROR",
      error,
    );
  }
};

// 📋 2. Resident Action: Fetch current pending maintenance details
export const getResidentInvoices = async (req: Request, res: Response) => {
  const { membershipId } = req.query;

  if (!membershipId) {
    return sendError(
      res,
      400,
      "Membership ID parameter required.",
      "MISSING_MEMBERSHIP_ID",
    );
  }

  try {
    const activePendingBill = await Invoice.findOne({
      where: {
        membershipId: Number(membershipId),
        status: "pending",
      },
      order: [["createdAt", "DESC"]], // Pull the latest generated pending invoice entry
    });

    return sendSuccess(
      res,
      200,
      "Invoice fetched successfully",
      activePendingBill || null,
    );
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to read invoice records",
      "FETCH_ERROR",
      error,
    );
  }
};
