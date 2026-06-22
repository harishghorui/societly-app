import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';

class BillingCycle extends Model {
  declare id: number;
  declare societyId: number;
  declare cycleMonthStr: string; // Format: "YYYY-MM" (e.g., "2026-06")
  declare status: 'draft' | 'processing' | 'completed' | 'failed';
  declare logs: string | null;
}

BillingCycle.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  societyId: { type: DataTypes.INTEGER, allowNull: false },
  cycleMonthStr: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'processing', 'completed', 'failed'), defaultValue: 'draft', allowNull: false },
  logs: { type: DataTypes.TEXT, allowNull: true }
}, { sequelize, modelName: 'billingCycle', underscored: false, timestamps: true });

export default BillingCycle;