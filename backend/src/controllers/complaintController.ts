import { Request, Response } from "express";
import { Op } from "sequelize";
import Complaint from "../models/Complaint.js";
import { uploadToR2 } from "../utils/r2Uploader.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";

// 📝 1. Create Complaint (Supports Multiple R2 Attachments)
export const createComplaint = async (req: Request, res: Response) => {
  const { societyId, membershipId, title, description, category, isAnonymous } =
    req.body;

  try {
    const attachmentUrls: string[] = [];

    // Process multiple files in memory buffers asynchronously through our unified R2 engine
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = (req.files as Express.Multer.File[]).map((file) =>
        uploadToR2(file.buffer, file.originalname, "complaints", file.mimetype),
      );
      const uploadedPaths = await Promise.all(uploadPromises);
      attachmentUrls.push(...uploadedPaths);
    }

    const targetMembershipId =
      isAnonymous === "true" || isAnonymous === true
        ? null
        : Number(membershipId);

    const complaint = await Complaint.create({
      societyId: Number(societyId),
      membershipId: targetMembershipId,
      title,
      description,
      category,
      attachmentUrls: JSON.stringify(attachmentUrls),
      status: "open",
    });

    return sendSuccess(res, 201, "Complaint logged successfully.", complaint);
  } catch (error: any) {
    return sendError(
      res,
      500,
      "Failed to compile multi-image complaint.",
      "INTERNAL_SERVER_ERROR",
      error.message,
    );
  }
};

// 📋 2. Fetch Context-Aware Complaints Ledger (Admin vs. Resident Filters)
export const getSocietyComplaints = async (req: Request, res: Response) => {
  const { societyId, membershipId, role } = req.query;

  try {
    let queryConditions: any = { societyId: Number(societyId) };

    // Strict Privacy/Role Boundary Isolation
    // Admins see everything. Residents only see tickets they created, plus globally visible anonymous items.
    if (role !== "admin") {
      queryConditions = {
        societyId: Number(societyId),
        [Op.or]: [
          { membershipId: Number(membershipId) },
          { membershipId: null }, // Explicitly includes anonymous public alerts
        ],
      };
    }

    const complaints = await Complaint.findAll({
      where: queryConditions,
      order: [["createdAt", "DESC"]],
    });

    // Parse the stringified JSON array blocks back into dynamic arrays for the client hook
    const formattedComplaints = complaints.map((c) => {
      const data = c.get({ plain: true }) as any;
      data.attachmentUrls = JSON.parse(data.attachmentUrls || "[]");
      return data;
    });

    return sendSuccess(
      res,
      200,
      "Complaints collection sync complete.",
      formattedComplaints,
    );
  } catch (error: any) {
    return sendError(
      res,
      500,
      "Failed to pull complaints matrix.",
      "INTERNAL_SERVER_ERROR",
      error.message,
    );
  }
};

// ✏️ 3. Update/Edit Complaint Attributes
export const updateComplaint = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, category, status, assignedStaffName } = req.body;

  try {
    const complaint = await Complaint.findByPk(Number(id));
    if (!complaint)
      return sendError(res, 404, "Complaint log not found.", "NOT_FOUND");

    await complaint.update({
      title,
      description,
      category,
      status,
      assignedStaffName,
    });
    return sendSuccess(res, 200, "Complaint updated successfully.", complaint);
  } catch (error: any) {
    return sendError(
      res,
      500,
      "Failed to alter complaint record.",
      "INTERNAL_SERVER_ERROR",
      error.message,
    );
  }
};

// ❌ 4. Delete Complaint Log permanently
export const deleteComplaint = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const complaint = await Complaint.findByPk(Number(id));
    if (!complaint)
      return sendError(res, 404, "Target ticket missing.", "NOT_FOUND");

    await complaint.destroy();
    return sendSuccess(
      res,
      200,
      "Complaint removed from ledger successfully.",
      { id },
    );
  } catch (error: any) {
    return sendError(
      res,
      500,
      "Failed to wipe complaint instance.",
      "INTERNAL_SERVER_ERROR",
      error.message,
    );
  }
};
