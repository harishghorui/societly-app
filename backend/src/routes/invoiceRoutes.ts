import { Router } from 'express';
import { bulkGenerateInvoices, getResidentInvoices } from '../controllers/invoiceController.js';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateJWT);

router.post('/generate', requireRole(['admin', 'secretary']), bulkGenerateInvoices);
router.get('/resident', getResidentInvoices);

export default router;
