import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/db.js";

class Notice extends Model<InferAttributes<Notice>, InferCreationAttributes<Notice>> {
  declare id: CreationOptional<number>;
  declare societyId: number;
  declare title: string;
  declare description: string;
  declare category: "Urgent" | "General" | "Event";
}

Notice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    societyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "societies", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM("Urgent", "General", "Event"),
      defaultValue: "General",
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "notice",
    underscored: false,
    timestamps: true,
  },
);

export default Notice;
