import { Request, Response } from "express";
import { Op } from "sequelize";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import Wing from "../models/Wing.js";
import Flat from "../models/Flat.js";
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
    const isRequesterStaff = requester.role === "admin" || requester.role === "treasurer";

    // 2. Query all active neighbors inside the same housing society building
    const directoryEntries = await Membership.findAll({
      where: {
        societyId: Number(societyId),
        status: ["active", "pending_activation"],
      },
      attributes: ["id", "flatNumber", "role", "designation", "advanceWalletBalance", "wingId", "flatId", "status"],
      include: [
        {
          model: User,
          attributes: ["id", "name", "phone", "hidePhoneNumber", "status"],
        },
        {
          model: Wing,
          attributes: ["name"],
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
        if (!isRequesterAdmin) {
          delete neighborUser.hidePhoneNumber;
        }
      }

      // Only expose wallet balances to staff members (admin / treasurer)
      if (!isRequesterStaff) {
        delete neighbor.advanceWalletBalance;
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

// 📝 upsertResidentMembership
export const upsertResidentMembership = async (req: Request, res: Response) => {
  const {
    id,
    societyId,
    name,
    phone,
    flatNumber,
    wingName,
    role,
    designation,
    advanceWalletBalance,
  } = req.body;

  if (!societyId || !name || !phone || !flatNumber || !role) {
    return sendError(
      res,
      400,
      "Missing required fields for upserting resident.",
      "MISSING_PARAMETERS",
    );
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length !== 10) {
    return sendError(
      res,
      400,
      "Phone number must be exactly 10 digits.",
      "INVALID_PHONE",
    );
  }

  try {
    let wing = await Wing.findOne({ where: { societyId: Number(societyId), name: wingName || "Main" } });
    if (!wing) {
      wing = await Wing.create({ societyId: Number(societyId), name: wingName || "Main" });
    }

    let flat = await Flat.findOne({ where: { wingId: wing.id, flatNumber } });
    if (!flat) {
      flat = await Flat.create({
        wingId: wing.id,
        flatNumber,
        flatType: "2BHK",
        squareFootage: 1000,
      });
    }

    if (id) {
      // UPDATE MODE
      const membership = await Membership.findOne({
        where: { id: Number(id), societyId: Number(societyId) },
      });

      if (!membership) {
        return sendError(
          res,
          404,
          "Membership not found.",
          "MEMBERSHIP_NOT_FOUND",
        );
      }

      const user = await User.findByPk(membership.userId);
      if (!user) {
        return sendError(
          res,
          404,
          "Associated User record not found.",
          "USER_NOT_FOUND",
        );
      }

      // Security Gate: Restrict modifying identity fields if User status is 'active'
      if (user.status === "active") {
        if (user.name !== name.trim() || user.phone !== cleanPhone) {
          return sendError(
            res,
            400,
            "Cannot modify the name or phone string of an active user account. Mutation is restricted to structural attributes only.",
            "IDENTITY_MUTATION_RESTRICTED",
          );
        }
      } else {
        // Status is 'invited', Admin is allowed to edit identity details
        if (user.phone !== cleanPhone) {
          const existingUser = await User.findOne({ where: { phone: cleanPhone } });
          if (existingUser) {
            // Re-link membership to this existing user
            membership.userId = existingUser.id;
            if (existingUser.status === "invited") {
              existingUser.name = name.trim();
              await existingUser.save();
            }
          } else {
            // Check if current user is only referenced by this membership
            const otherMembersCount = await Membership.count({
              where: { userId: user.id, id: { [Op.ne]: membership.id } },
            });
            if (otherMembersCount === 0) {
              user.phone = cleanPhone;
              user.name = name.trim();
              await user.save();
            } else {
              const newUser = await User.create({
                name: name.trim(),
                phone: cleanPhone,
                status: "invited",
                pin: null,
              });
              membership.userId = newUser.id;
            }
          }
        } else {
          user.name = name.trim();
          await user.save();
        }
      }

      // Update structural layout properties
      membership.wingId = wing.id;
      membership.flatId = flat.id;
      membership.flatNumber = flatNumber;
      membership.role = role;
      membership.designation = designation || "Resident";
      if (advanceWalletBalance !== undefined) {
        membership.advanceWalletBalance = Number(advanceWalletBalance);
      }
      await membership.save();

      const updated = await Membership.findByPk(membership.id, {
        include: [{ model: User, attributes: ["id", "name", "phone", "status"] }],
      });

      return sendSuccess(res, 200, "Resident membership updated successfully.", updated);
    } else {
      // CREATE MODE
      let user = await User.findOne({ where: { phone: cleanPhone } });

      if (user) {
        const existingMembership = await Membership.findOne({
          where: {
            userId: user.id,
            societyId: Number(societyId),
            flatId: flat.id,
          },
        });

        if (existingMembership) {
          return sendError(
            res,
            400,
            "A membership record already exists for this user in this flat.",
            "DUPLICATE_MEMBERSHIP",
          );
        }

        if (user.status === "invited") {
          user.name = name.trim();
          await user.save();
        }
      } else {
        user = await User.create({
          name: name.trim(),
          phone: cleanPhone,
          status: "invited",
          pin: null,
        });
      }

      const membership = await Membership.create({
        userId: user.id,
        societyId: Number(societyId),
        wingId: wing.id,
        flatId: flat.id,
        flatNumber,
        role,
        designation: designation || "Resident",
        status: "active", // New management creations bypass approval desk automatically
        advanceWalletBalance: advanceWalletBalance ? Number(advanceWalletBalance) : 0.0,
      });

      const created = await Membership.findByPk(membership.id, {
        include: [{ model: User, attributes: ["id", "name", "phone", "status"] }],
      });

      return sendSuccess(res, 201, "Resident membership created successfully.", created);
    }
  } catch (error: any) {
    console.error("❌ Upsert controller error:", error);
    return sendError(
      res,
      500,
      "Failed to upsert resident membership.",
      "UPSERT_ERROR",
      error.message,
    );
  }
};

// ❌ revokeResidentMembership
export const revokeResidentMembership = async (req: Request, res: Response) => {
  const { membershipId } = req.params;
  const { societyId } = req.query;

  if (!membershipId || !societyId) {
    return sendError(
      res,
      400,
      "Missing parameters for membership revocation.",
      "MISSING_PARAMETERS",
    );
  }

  try {
    const membership = await Membership.findOne({
      where: { id: Number(membershipId), societyId: Number(societyId) },
    });

    if (!membership) {
      return sendError(
        res,
        404,
        "Membership record not found.",
        "MEMBERSHIP_NOT_FOUND",
      );
    }

    // Revocation: delete the record directly from the system
    await membership.destroy();

    return sendSuccess(
      res,
      200,
      "Membership successfully revoked and deleted.",
      { membershipId: Number(membershipId) },
    );
  } catch (error: any) {
    console.error("❌ Revocation controller error:", error);
    return sendError(
      res,
      500,
      "Failed to revoke resident membership.",
      "REVOCATION_ERROR",
      error.message,
    );
  }
};
