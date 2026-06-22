import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

export enum UserRole {
  ADMIN = "admin",
  TREASURER = "treasurer",
  COMMITTEE = "committee",
  WING_ADMIN = "wing_admin",
  OWNER = "owner",
  TENANT = "tenant",
  GUARD = "guard",
}

class Membership extends Model {
  declare id: number;
  declare role: UserRole;
  declare designation: string;
  declare status: string;
  declare flatNumber: string | null;
  declare advanceWalletBalance: number;

  // 1. Declare the Foreign Key Type Definitions
  declare userId: number;
  declare societyId: number;
  declare wingId: number | null;
  declare flatId: number | null;
}

Membership.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      defaultValue: UserRole.TENANT,
    },
    designation: { type: DataTypes.STRING, defaultValue: "Resident" },
    status: {
      type: DataTypes.ENUM("pending", "active", "exited"),
      defaultValue: "pending",
    },
    flatNumber: { type: DataTypes.STRING, allowNull: true },
    
    advanceWalletBalance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    societyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "societies", key: "id" },
    },
    wingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "wings", key: "id" },
    },
    flatId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "flats", key: "id" },
    },
  },
  {
    sequelize,
    modelName: "membership",
    underscored: false,
    indexes: [
      { fields: ["societyId"] },
      { fields: ["wingId"] },
    ],
  },
);

export default Membership;