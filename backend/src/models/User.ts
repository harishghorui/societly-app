import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/db.js";

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare phone: string;
  declare pin: string | null; // Hashed, nullable for invited shell users
  declare hidePhoneNumber: CreationOptional<boolean>;
  declare status: CreationOptional<"invited" | "active" | "suspended">;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    pin: { type: DataTypes.STRING, allowNull: true },
    hidePhoneNumber: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("invited", "active", "suspended"),
      defaultValue: "invited",
      allowNull: false,
    },
  },
  { sequelize, modelName: "user" },
);

export default User;
