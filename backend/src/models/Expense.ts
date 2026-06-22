import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class Expense extends Model {
  declare id: number;
  declare societyId: number;
  declare title: string; // e.g., "Sweeper Salary"
  declare amount: number;
  declare category: string;
  declare paymentMethod: "cash" | "bank";
}

Expense.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    societyId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    paymentMethod: { type: DataTypes.ENUM("cash", "bank"), allowNull: false },
  },
  { sequelize, modelName: "expense", underscored: false, timestamps: true },
);

export default Expense;
