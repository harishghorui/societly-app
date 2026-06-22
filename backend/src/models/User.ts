import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class User extends Model {
  declare id: number;
  declare name: string;
  declare phone: string;
  declare pin: string;
  declare hidePhoneNumber: boolean;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    pin: { type: DataTypes.STRING, allowNull: false }, // Hashed,
    hidePhoneNumber: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  { sequelize, modelName: "user" },
);

export default User;
