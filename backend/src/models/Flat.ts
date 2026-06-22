import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import sequelize from "../config/db.js";

class Flat extends Model<InferAttributes<Flat>, InferCreationAttributes<Flat>> {
  declare id: CreationOptional<number>;
  declare wingId: number;
  declare flatNumber: string;
  declare squareFootage: number;
  declare flatType: "1BHK" | "2BHK" | "3BHK" | "Shop" | "Office" | "Other";
  
  declare memberships?: NonAttribute<any[]>;
}

Flat.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    wingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "wings", key: "id" },
    },
    flatNumber: { type: DataTypes.STRING, allowNull: false },
    squareFootage: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
    flatType: {
      type: DataTypes.ENUM("1BHK", "2BHK", "3BHK", "Shop", "Office", "Other"),
      defaultValue: "1BHK",
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "flat",
    underscored: false,
    timestamps: true,
    indexes: [
      { fields: ["wingId"] },
    ],
  },
);

export default Flat;
