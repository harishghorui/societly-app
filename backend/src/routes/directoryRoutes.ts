import { Router } from "express";
import { getSocietyDirectory } from "../controllers/directoryController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", authenticateJWT, getSocietyDirectory);

export default router;
