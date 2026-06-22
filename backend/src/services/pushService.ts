import admin from "firebase-admin";
import Device from "../models/Device.js";
import Membership from "../models/Membership.js";
import NotificationLog from "../models/NotificationLog.js"; // 🚀 Import your log model

export const broadcastToSociety = async (
  societyId: number,
  title: string,
  body: string,
  category?: string,
) => {
  try {
    // 1. Fetch all active memberships mapped to the specific targeted building
    const memberships = await Membership.findAll({
      where: { societyId, status: "active" },
      attributes: ["userId"],
    });

    const userIds = memberships.map((m) => m.userId);
    if (userIds.length === 0) return;

    // Persist notification data history entries for all target users inside PostgreSQL
    const logEntries = userIds.map((userId) => ({
      userId,
      title,
      body,
      type:
        title.toLowerCase().includes("bill") ||
        title.toLowerCase().includes("maintenance")
          ? "invoice"
          : "notice",
      isRead: false,
    }));
    await NotificationLog.bulkCreate(logEntries);

    // 2. Query all concurrent device tokens registered to those targeted users
    const devices = await Device.findAll({
      where: { userId: userIds },
      attributes: ["id", "fcmToken"],
    });

    const tokens = devices.map((d) => d.fcmToken);
    if (tokens.length === 0) return;

    // 3. Compose individual messaging bundles required for Firebase batch execution
    const messages = tokens.map((token) => ({
      token,
      notification: { title, body },
      data: category ? { category } : undefined,
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
        },
      },
    }));

    // 4. Batch dispatch using the modern SDK framework
    const response = await admin.messaging().sendEach(messages);
    console.log(
      `📣 Push broadcast successfully completed. Packets delivered: ${response.successCount}`,
    );

    // Clean up stale "Ghost Tokens" automatically if Firebase rejects them
    response.responses.forEach(async (res, idx) => {
      if (!res.success && res.error) {
        const errCode = res.error.code;
        if (
          errCode === "messaging/registration-token-not-registered" ||
          errCode === "messaging/invalid-argument"
        ) {
          console.log(
            `🧹 Removing invalid token database entry: ${tokens[idx]}`,
          );
          await Device.destroy({ where: { fcmToken: tokens[idx] } });
        }
      }
    });
  } catch (error) {
    console.error("❌ Failed to execute broadcast routine:", error);
  }
};
