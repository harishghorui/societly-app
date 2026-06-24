import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/db.js";

class Invoice extends Model<InferAttributes<Invoice>, InferCreationAttributes<Invoice>> {
  declare id: CreationOptional<number>;
  declare membershipId: number;
  declare societyId: number;
  declare amount: number;
  declare billingCycle: string;
  declare dueDate: Date;
  declare status: CreationOptional<"pending" | "paid" | "overdue" | "pending_approval">;
  declare paymentMethod: CreationOptional<"cash" | "cheque" | "online" | null>;
  declare paymentGatewayTxnId: CreationOptional<string | null>;
  declare paidAt: CreationOptional<Date | null>;
  declare paymentRef: CreationOptional<string | null>;
  declare remarks: CreationOptional<string | null>;
  declare proofUrl: CreationOptional<string | null>;
  declare isHistorical: CreationOptional<boolean>;
}

Invoice.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    membershipId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "memberships", key: "id" },
      onDelete: "CASCADE",
    },
    societyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "societies", key: "id" },
      onDelete: "CASCADE",
    },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    billingCycle: { type: DataTypes.STRING, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "paid", "overdue", "pending_approval"),
      defaultValue: "pending",
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM("cash", "cheque", "online"),
      allowNull: true,
    },
    paymentGatewayTxnId: { type: DataTypes.STRING, allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    paymentRef: { type: DataTypes.STRING, allowNull: true },
    remarks: { type: DataTypes.STRING, allowNull: true },
    proofUrl: { type: DataTypes.STRING, allowNull: true },
    isHistorical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "invoice",
    underscored: false,
    timestamps: true,
    indexes: [
      { fields: ["societyId"] },
    ],
  },
);

export default Invoice;
