import { Request, Response } from "express";
import Notice from "../models/Notice.js";
import { broadcastToSociety } from "../services/pushService.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";

// 📝 Post and Broadcast a new announcement
export const createNotice = async (req: Request, res: Response) => {
  const { societyId, title, description, category } = req.body;

  if (!societyId || !title || !description) {
    return sendError(
      res,
      400,
      "All content fields are mandatory.",
      "MISSING_PARAMETERS",
    );
  }

  if (category && !["Urgent", "General", "Event"].includes(category)) {
    return sendError(
      res,
      400,
      "Invalid notice category. Must be Urgent, General, or Event.",
      "INVALID_CATEGORY",
    );
  }

  try {
    const notice = await Notice.create({
      societyId: Number(societyId),
      title,
      description,
      category: category || "General",
    });

    // 🚀 ASYNC TRIGGER: Blast instant pushes out across devices linked to this building scope
    broadcastToSociety(Number(societyId), title, description, notice.category);

    return sendSuccess(res, 201, "Notice successfully broadcasted", { notice });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to build notice record",
      "CREATE_NOTICE_ERROR",
      error,
    );
  }
};

// 📋 Pull continuous history logs for a building
export const getSocietyNotices = async (req: Request, res: Response) => {
  const { societyId } = req.query;

  try {
    const notices = await Notice.findAll({
      where: { societyId: Number(societyId) },
      order: [["createdAt", "DESC"]], // Newest notices appear first
    });
    return sendSuccess(res, 200, "Notices fetched successfully", notices);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to read notices ledger",
      "FETCH_NOTICES_ERROR",
      error,
    );
  }
};
