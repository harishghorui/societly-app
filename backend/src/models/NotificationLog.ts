import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class NotificationLog extends Model {
  declare id: number;
  declare userId: number;
  declare title: string;
  declare body: string;
  declare type: "notice" | "invoice" | "approval" | "general";
  declare isRead: boolean;
}

NotificationLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("notice", "invoice", "approval", "general"),
      defaultValue: "general",
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "notificationLog",
    underscored: false,
    timestamps: true,
  },
);

export default NotificationLog;
