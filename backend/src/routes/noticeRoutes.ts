import { Router } from 'express';
import { createNotice, getSocietyNotices } from '../controllers/noticeController.js';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', requireRole(['admin', 'secretary']), createNotice);
router.get('/', getSocietyNotices);

export default router;
