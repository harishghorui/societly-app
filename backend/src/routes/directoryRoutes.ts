import { Router } from "express";
import {
  getSocietyDirectory,
  upsertResidentMembership,
  revokeResidentMembership
} from "../controllers/directoryController.js";
import { authenticateJWT, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/", getSocietyDirectory);
router.post("/upsert", requireRole(["admin", "secretary"]), upsertResidentMembership);
router.delete("/:membershipId", requireRole(["admin", "secretary"]), revokeResidentMembership);

export default router;
