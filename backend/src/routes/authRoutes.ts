import { Router } from "express";
import {
  createSocietyAndAdmin,
  joinSociety,
  login,
  register,
  checkPhone,
  activateUser,
  resetPin,
} from "../controllers/authController.js";
import { registerDeviceToken } from "../controllers/notificationController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/check-phone", checkPhone);
router.post("/activate", activateUser);
router.post("/reset-pin", resetPin);
router.post("/create-society", createSocietyAndAdmin);
router.post("/join-society", joinSociety);
router.post("/device-token", authenticateJWT, registerDeviceToken);

export default router;
