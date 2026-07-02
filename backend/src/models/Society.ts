import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/db.js";

class Society extends Model<InferAttributes<Society>, InferCreationAttributes<Society>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare address: string;
  declare registrationCode: string;
  declare govtRegistrationNo: string;
  declare structureType: CreationOptional<"single_building" | "multi_wing">;
  declare onboardingStep: CreationOptional<"PROFILE" | "LAYOUT" | "FINANCIAL" | "COMPLETED">;
  declare financialTransparencyEnabled: CreationOptional<boolean>;
}

Society.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    registrationCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    govtRegistrationNo: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    structureType: {
      type: DataTypes.ENUM("single_building", "multi_wing"),
      defaultValue: "multi_wing",
      allowNull: false,
    },
    onboardingStep: {
      type: DataTypes.ENUM("PROFILE", "LAYOUT", "FINANCIAL", "COMPLETED"),
      defaultValue: "PROFILE",
      allowNull: false,
    },
    financialTransparencyEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "society",
    indexes: [{ fields: ["name"] }, { fields: ["registrationCode"] }],
  },
);

export default Society;
