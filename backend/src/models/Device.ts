import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class Device extends Model {
  declare id: number;
  declare userId: number;
  declare fcmToken: string;
  declare deviceType: string;
}

Device.init(
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
    fcmToken: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Prevents duplicate device tracking lines
    },
    deviceType: {
      type: DataTypes.ENUM("android", "ios"),
      defaultValue: "android",
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "device",
    underscored: false,
  },
);

export default Device;
