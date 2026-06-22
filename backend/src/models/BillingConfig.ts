import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class BillingConfig extends Model {
  declare id: number;
  declare societyId: number;
  declare wingId: number | null; 
  declare calculationType: "flat_rate" | "per_sqft" | "flat_type";
  declare baseAmount: number; 
  declare maintenanceBreakdown: string;
  declare perSqftRate: number; 
  declare flatTypeRates: string | null; 
  declare gracePeriodDays: number;
  declare lateFeeType: "none" | "flat" | "percentage";
  declare lateFeeAmount: number;
}

BillingConfig.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    societyId: { type: DataTypes.INTEGER, allowNull: false },
    wingId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    calculationType: {
      type: DataTypes.ENUM("flat_rate", "per_sqft", "flat_type"),
      defaultValue: "flat_rate",
      allowNull: false,
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
    maintenanceBreakdown: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]' 
    },
    perSqftRate: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
    flatTypeRates: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "{}",
    },
    gracePeriodDays: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
    },
    lateFeeType: {
      type: DataTypes.ENUM("none", "flat", "percentage"),
      defaultValue: "none",
      allowNull: false,
    },
    lateFeeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "billingConfig",
    underscored: false,
    timestamps: true,
  },
);

export default BillingConfig;
