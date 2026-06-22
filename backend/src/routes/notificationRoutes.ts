import { Router } from 'express';
import { getUserNotifications, markAllAsRead } from '../controllers/notificationController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getUserNotifications);
router.put('/mark-all-read', markAllAsRead);

export default router;