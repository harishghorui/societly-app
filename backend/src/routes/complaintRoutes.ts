// Replace your router file completely with these senior specifications:
import { Router } from "express";
import multer from "multer";
import {
  createComplaint,
  deleteComplaint,
  getSocietyComplaints,
  updateComplaint,
} from "../controllers/complaintController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateJWT);

router.post("/", upload.array("photos", 5), createComplaint); // Accepts up to 5 concurrent images matching your criteria!
router.get("/", getSocietyComplaints);
router.put("/:id", updateComplaint);
router.delete("/:id", deleteComplaint);

export default router;
