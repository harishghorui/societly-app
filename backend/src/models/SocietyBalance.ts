import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class SocietyBalance extends Model {
  declare id: number;
  declare societyId: number;
  declare cashBalance: number;
  declare bankBalance: number;
}

SocietyBalance.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    societyId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    cashBalance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
    bankBalance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
  },
  { sequelize, modelName: "societyBalance", underscored: false },
);

export default SocietyBalance;
