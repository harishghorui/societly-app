import Device from "./Device.js";
import Expense from "./Expense.js";
import Invoice from "./Invoice.js";
import Membership from "./Membership.js";
import Notice from "./Notice.js";
import NotificationLog from "./NotificationLog.js";
import Society from "./Society.js";
import SocietyBalance from "./SocietyBalance.js";
import User from "./User.js";
import Wing from "./Wing.js";
import Flat from "./Flat.js";


// User <-> Membership Relationship
User.hasMany(Membership, { foreignKey: "userId", onDelete: "CASCADE" });
Membership.belongsTo(User, { foreignKey: "userId" });

// Society <-> Membership Relationship
Society.hasMany(Membership, { foreignKey: "societyId", onDelete: "CASCADE" });
Membership.belongsTo(Society, { foreignKey: "societyId" });

// Device Associations
User.hasMany(Device, { foreignKey: "userId", onDelete: "CASCADE" });
Device.belongsTo(User, { foreignKey: "userId" });

// Notice Associations
Society.hasMany(Notice, { foreignKey: "societyId", onDelete: "CASCADE" });
Notice.belongsTo(Society, { foreignKey: "societyId" });

// Add Invoice Associations
Society.hasMany(Invoice, { foreignKey: "societyId", onDelete: "CASCADE" });
Invoice.belongsTo(Society, { foreignKey: "societyId" });

Membership.hasMany(Invoice, {
  foreignKey: "membershipId",
  onDelete: "CASCADE",
});
Invoice.belongsTo(Membership, { foreignKey: "membershipId" });

// Add NotificationLog Associations
User.hasMany(NotificationLog, { foreignKey: "userId", onDelete: "CASCADE" });
NotificationLog.belongsTo(User, { foreignKey: "userId" });

// Add Financial Models
Society.hasMany(Expense, { foreignKey: "societyId", onDelete: "CASCADE" });
Expense.belongsTo(Society, { foreignKey: "societyId" });

Society.hasOne(SocietyBalance, {
  foreignKey: "societyId",
  onDelete: "CASCADE",
});
SocietyBalance.belongsTo(Society, { foreignKey: "societyId" });

// Society <-> Wing Relationship
Society.hasMany(Wing, { foreignKey: "societyId", onDelete: "CASCADE" });
Wing.belongsTo(Society, { foreignKey: "societyId" });

// Wing <-> Flat Relationship
Wing.hasMany(Flat, { foreignKey: "wingId", onDelete: "CASCADE" });
Flat.belongsTo(Wing, { foreignKey: "wingId" });

// Membership <-> Wing Relationship
Wing.hasMany(Membership, { foreignKey: "wingId", onDelete: "SET NULL" });
Membership.belongsTo(Wing, { foreignKey: "wingId" });

// Membership <-> Flat Relationship
Flat.hasMany(Membership, { foreignKey: "flatId", onDelete: "SET NULL" });
Membership.belongsTo(Flat, { foreignKey: "flatId" });


export {
  Device,
  Expense,
  Invoice,
  Membership,
  NotificationLog,
  Society,
  SocietyBalance,
  User,
  Wing,
  Flat,
};

