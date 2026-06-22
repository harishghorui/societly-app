import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class Complaint extends Model {
  declare id: number;
  declare societyId: number;
  declare membershipId: number | null; // Nullable to explicitly support anonymous filings
  declare title: string;
  declare description: string;
  declare category: string;
  declare status: "open" | "in-progress" | "resolved";
  declare attachmentUrls: string[] | null;
  declare assignedStaffName: string | null;
}

Complaint.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    societyId: { type: DataTypes.INTEGER, allowNull: false },
    membershipId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("open", "in-progress", "resolved"),
      defaultValue: "open",
      allowNull: false,
    },
    attachmentUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "[]",
    },
    assignedStaffName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: "complaint",
    underscored: false,
    timestamps: true,
  },
);

export default Complaint;
