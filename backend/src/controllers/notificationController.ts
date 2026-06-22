import { Request, Response } from "express";
import Device from "../models/Device.js";
import NotificationLog from "../models/NotificationLog.js";
import { sendError, sendSuccess } from "../utils/responseWrapper.js";

export const registerDeviceToken = async (req: Request, res: Response) => {
  const { userId, fcmToken, deviceType } = req.body;

  if (!userId || !fcmToken) {
    return sendError(
      res,
      400,
      "userId and fcmToken fields are required",
      "MISSING_PARAMETERS",
    );
  }

  try {
    // Upsert logic: Find existing token to overwrite or create a new row cleanly
    const [device, created] = await Device.findOrCreate({
      where: { fcmToken },
      defaults: {
        userId: Number(userId),
        deviceType: deviceType || "android",
      },
    });

    if (!created) {
      // If token existed but user swapped accounts, re-assign ownership properties
      device.userId = Number(userId);
      await device.save();
    }

    return sendSuccess(
      res,
      200,
      "Device registration token synced successfully",
      { deviceId: device.id },
    );
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to register tracking device token",
      "REGISTER_DEVICE_ERROR",
      error,
    );
  }
};

export const getUserNotifications = async (req: Request, res: Response) => {
  const { userId } = req.query;
  try {
    const logs = await NotificationLog.findAll({
      where: { userId: Number(userId) },
      order: [["createdAt", "DESC"]],
    });
    return sendSuccess(res, 200, "Notifications fetched successfully", logs);
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to fetch notification history",
      "FETCH_NOTIFICATIONS_ERROR",
      error,
    );
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const { userId } = req.body;
  try {
    await NotificationLog.update(
      { isRead: true },
      { where: { userId: Number(userId) } },
    );
    return sendSuccess(res, 200, "All notifications marked as read");
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to update notification statuses",
      "MARK_READ_ERROR",
      error,
    );
  }
};
