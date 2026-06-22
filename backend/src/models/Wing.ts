import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/db.js";

class Wing extends Model<InferAttributes<Wing>, InferCreationAttributes<Wing>> {
  declare id: CreationOptional<number>;
  declare societyId: number;
  declare name: string; // e.g., "A-Wing", "Tower 1"
}

Wing.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    societyId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: "wing", underscored: false, timestamps: true },
);

export default Wing;
