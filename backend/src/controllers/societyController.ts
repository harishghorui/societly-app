import { Request, Response } from "express";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import Society from "../models/Society.js";
import Wing from "../models/Wing.js";
import Flat from "../models/Flat.js";
import sequelize from "../config/db.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";

// 📋 Fetch all pending memberships for a specific society
export const getPendingApprovals = async (req: Request, res: Response) => {
  const { societyId } = req.query;

  if (!societyId) {
    return sendError(res, 400, "Society ID is required", "MISSING_SOCIETY_ID");
  }

  try {
    const pending = await Membership.findAll({
      where: {
        societyId: Number(societyId),
        status: "pending",
      },
      include: [
        {
          model: User,
          attributes: ["id", "name", "phone"], // Only pull what the UI needs
        },
      ],
    });

    return sendSuccess(
      res,
      200,
      "Pending approvals fetched successfully",
      pending,
    );
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to fetch pending approvals",
      "FETCH_APPROVALS_ERROR",
      error,
    );
  }
};

// ⚙️ Update membership status (Approve / Deny)
export const updateApprovalStatus = async (req: Request, res: Response) => {
  const { membershipId } = req.params;
  const { status } = req.body; // Expecting 'active' or 'exited'

  if (!["active", "exited"].includes(status)) {
    return sendError(
      res,
      400,
      "Invalid status update request",
      "INVALID_STATUS",
    );
  }

  try {
    const membership = await Membership.findByPk(Number(membershipId));

    if (!membership) {
      return sendError(res, 404, "Approval request not found", "NOT_FOUND");
    }

    // Update status inside PostgreSQL
    membership.status = status;
    await membership.save();

    return sendSuccess(
      res,
      200,
      `Membership successfully ${status === "active" ? "approved" : "denied"}.`,
      {
        message: `Membership successfully ${status === "active" ? "approved" : "denied"}.`,
        membershipId: membership.id,
      },
    );
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to process approval action",
      "UPDATE_APPROVAL_ERROR",
      error,
    );
  }
};

// 🏛️ Fetch full society details
export const getSocietyProfile = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const society = await Society.findByPk(Number(id));

    if (!society) {
      return sendError(res, 404, "Society not found", "SOCIETY_NOT_FOUND");
    }

    return sendSuccess(res, 200, "Society profile details synced.", society);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to read society profile ledger",
      "FETCH_SOCIETY_ERROR",
      error,
    );
  }
};

// 🏛️ Update society profile details (restricted to Admin)
export const updateSocietyProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address, govtRegistrationNo, structureType } = req.body;

  if (!name || !address || !govtRegistrationNo || !structureType) {
    return sendError(
      res,
      400,
      "Name, address, govt registration number, and structure type are mandatory.",
      "MISSING_PARAMETERS",
    );
  }

  if (!["single_building", "multi_wing"].includes(structureType)) {
    return sendError(
      res,
      400,
      "Invalid structure type. Must be 'single_building' or 'multi_wing'.",
      "INVALID_STRUCTURE_TYPE",
    );
  }

  try {
    const society = await Society.findByPk(Number(id));

    if (!society) {
      return sendError(res, 404, "Society not found", "SOCIETY_NOT_FOUND");
    }

    await society.update({
      name: name.trim(),
      address: address.trim(),
      govtRegistrationNo: govtRegistrationNo.trim(),
      structureType,
    });

    return sendSuccess(res, 200, "Society profile updated successfully.", society);
  } catch (error: any) {
    return sendError(
      res,
      500,
      "Failed to update society profile",
      "UPDATE_SOCIETY_ERROR",
      error.message,
    );
  }
};

// 🏛️ Get Wings and Flats Layout
export const getWingsAndFlats = async (req: Request, res: Response) => {
  const { id } = req.params; // societyId

  try {
    const wings = await Wing.findAll({
      where: { societyId: Number(id) },
      include: [
        {
          model: Flat,
        },
      ],
      order: [
        ["name", "ASC"],
        [Flat, "flatNumber", "ASC"],
      ],
    });

    return sendSuccess(res, 200, "Property layout successfully retrieved.", wings);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to read property layout ledger",
      "FETCH_LAYOUT_ERROR",
      error,
    );
  }
};

// 🏛️ Setup Property Layout (Wings & Flats bulk insertion)
export const setupPropertyLayout = async (req: Request, res: Response) => {
  const { id } = req.params; // societyId
  const { wings, requesterMembershipId } = req.body;

  if (!requesterMembershipId) {
    return sendError(
      res,
      400,
      "Requester membership identifier is required.",
      "MISSING_REQUESTER_MEMBERSHIP_ID",
    );
  }

  // Verify that the requester is an admin for this society
  try {
    const requester = await Membership.findByPk(Number(requesterMembershipId));
    if (
      !requester ||
      requester.societyId !== Number(id) ||
      requester.status !== "active" ||
      requester.role !== "admin"
    ) {
      return sendError(
        res,
        403,
        "Access Denied. Only society administrators can set up property layouts.",
        "UNAUTHORIZED_ACCESS",
      );
    }
  } catch (err) {
    return sendError(
      res,
      500,
      "Failed to verify requester authorization",
      "AUTH_VERIFICATION_ERROR",
      err,
    );
  }

  if (!wings || !Array.isArray(wings) || wings.length === 0) {
    return sendError(
      res,
      400,
      "A non-empty wings layout array is mandatory.",
      "INVALID_LAYOUT_PAYLOAD",
    );
  }

  // Basic validation of inner fields
  for (const wing of wings) {
    if (!wing.name || !wing.name.trim()) {
      return sendError(
        res,
        400,
        "Every wing must have a valid name.",
        "INVALID_WING_NAME",
      );
    }
    if (!wing.flats || !Array.isArray(wing.flats) || wing.flats.length === 0) {
      return sendError(
        res,
        400,
        `Wing '${wing.name}' must have at least one flat.`,
        "INVALID_FLAT_PAYLOAD",
      );
    }
    for (const flat of wing.flats) {
      if (!flat.flatNumber || !flat.flatNumber.trim()) {
        return sendError(
          res,
          400,
          `Every flat in wing '${wing.name}' must have a valid flat number.`,
          "INVALID_FLAT_NUMBER",
        );
      }
      const parsedSize = Number(flat.squareFootage);
      if (isNaN(parsedSize) || parsedSize <= 0) {
        return sendError(
          res,
          400,
          `Flat '${flat.flatNumber}' in wing '${wing.name}' must have a positive square footage.`,
          "INVALID_SQUARE_FOOTAGE",
        );
      }
      const validTypes = ["1BHK", "2BHK", "3BHK", "Shop", "Office", "Other"];
      if (!validTypes.includes(flat.flatType)) {
        return sendError(
          res,
          400,
          `Flat '${flat.flatNumber}' in wing '${wing.name}' has an invalid flat type '${flat.flatType}'.`,
          "INVALID_FLAT_TYPE",
        );
      }
    }
  }

  const t = await sequelize.transaction();
  try {
    // 1. Wipe out existing wings and flats (cascade deletes flats)
    await Wing.destroy({
      where: { societyId: Number(id) },
      transaction: t,
    });

    // 2. Re-create wings and flats bulk
    for (const wingData of wings) {
      const wing = await Wing.create(
        {
          societyId: Number(id),
          name: wingData.name.trim(),
        },
        { transaction: t },
      );

      const flatsData = wingData.flats.map((flat: any) => ({
        wingId: wing.id,
        flatNumber: flat.flatNumber.trim(),
        squareFootage: Number(flat.squareFootage),
        flatType: flat.flatType,
      }));

      await Flat.bulkCreate(flatsData, { transaction: t });
    }

    await t.commit();
    return sendSuccess(res, 201, "Property layout successfully configured.");
  } catch (error: any) {
    await t.rollback();
    return sendError(
      res,
      500,
      "Failed to commit property layout updates",
      "SETUP_LAYOUT_ERROR",
      error.message,
    );
  }
};
