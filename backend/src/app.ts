import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import sequelize from "./config/db.js";
import "./config/firebase.js";
import "./models/index.js";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import directoryRoutes from "./routes/directoryRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import societyRoutes from "./routes/societyRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js";
import { initializeAutomatedBillingScheduler, recoverBillingCycles } from "./workers/billingScheduler.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/societies", societyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/society/directory", directoryRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/onboarding", onboardingRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    
    // Proactively alter enum type for invoices status in Postgres before sync
    try {
      await sequelize.query(`ALTER TYPE "enum_invoices_status" ADD VALUE 'pending_approval'`);
      console.log("✅ Added pending_approval to enum_invoices_status");
    } catch (err) {
      // Ignore error if it already exists or the type hasn't been created yet
    }

    // Use { alter: true } during development to sync schema changes
    await sequelize.sync({ alter: true });
    console.log("✅ Database connected and synced");

    // Execute startup billing recovery routine to reset any hung processing states
    await recoverBillingCycles();

    initializeAutomatedBillingScheduler();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
};

startServer();
