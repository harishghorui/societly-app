import { Router } from "express";
import { initializeBalances, bulkSeedResidents } from "../controllers/onboardingController.js";
import { authenticateJWT, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Secure all onboarding endpoints
router.use(authenticateJWT);

router.post("/initialize", requireRole(["admin", "secretary"]), initializeBalances);
router.post("/balances/initialize", requireRole(["admin", "secretary"]), initializeBalances);

router.post("/bulk-seed", requireRole(["admin", "secretary"]), bulkSeedResidents);
router.post("/residents/seed", requireRole(["admin", "secretary"]), bulkSeedResidents);

export default router;
