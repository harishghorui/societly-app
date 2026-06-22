import { Request, Response } from "express";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";

export const getSocietyDirectory = async (req: Request, res: Response) => {
  const { societyId, requesterMembershipId } = req.query;

  if (!societyId || !requesterMembershipId) {
    return sendError(
      res,
      400,
      "Missing structural directory parameters.",
      "MISSING_PARAMETERS",
    );
  }

  try {
    // 1. Fetch the requester's membership details to check their role privileges
    const requester = await Membership.findByPk(Number(requesterMembershipId));
    if (
      !requester ||
      requester.societyId !== Number(societyId) ||
      requester.status !== "active"
    ) {
      return sendError(
        res,
        403,
        "Access Denied. You are not an active member of this society.",
        "UNAUTHORIZED_ACCESS",
      );
    }

    const isRequesterAdmin = requester.role === "admin";

    // 2. Query all active neighbors inside the same housing society building
    const directoryEntries = await Membership.findAll({
      where: {
        societyId: Number(societyId),
        status: "active",
      },
      attributes: ["id", "flatNumber", "role", "designation"],
      include: [
        {
          model: User,
          attributes: ["name", "phone", "hidePhoneNumber"],
        },
      ],
      order: [
        ["flatNumber", "ASC"],
        [User, "name", "ASC"],
      ],
    });

    // 3. SECURE MUTATION: Enforce privacy rules dynamically before dispatching bytes over the network
    const sanitizedDirectory = directoryEntries.map((entry) => {
      const neighbor = entry.get({ plain: true }) as any;
      const neighborUser = neighbor.user || neighbor.User;

      if (neighborUser) {
        // Conditional Masking Rule
        // If the requester is an admin, they bypass privacy checks. If not, hidden numbers are deleted.
        if (!isRequesterAdmin && neighborUser.hidePhoneNumber) {
          neighborUser.phone = "Private";
        }

        // Remove the inner flag parameter to keep the payload lightweight
        delete neighborUser.hidePhoneNumber;
      }

      return neighbor;
    });

    return sendSuccess(
      res,
      200,
      "Resident directory pulled successfully.",
      sanitizedDirectory,
    );
  } catch (error: any) {
    console.error("❌ Directory compilation error:", error);
    return sendError(
      res,
      500,
      "Failed to compile society directory listings.",
      "INTERNAL_SERVER_ERROR",
      error.message,
    );
  }
};
