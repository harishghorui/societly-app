import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
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

class Membership extends Model<InferAttributes<Membership>, InferCreationAttributes<Membership>> {
  declare id: CreationOptional<number>;
  declare role: CreationOptional<UserRole>;
  declare designation: CreationOptional<string>;
  declare status: CreationOptional<"pending_activation" | "active" | "pending" | "exited">;
  declare flatNumber: CreationOptional<string | null>;
  declare advanceWalletBalance: CreationOptional<number>;

  // 1. Declare the Foreign Key Type Definitions
  declare userId: number;
  declare societyId: number;
  declare wingId: CreationOptional<number | null>;
  declare flatId: CreationOptional<number | null>;
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
      type: DataTypes.ENUM("pending_activation", "active", "pending", "exited"),
      defaultValue: "active",
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