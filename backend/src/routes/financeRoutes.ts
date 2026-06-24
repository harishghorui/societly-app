import { Router } from 'express';
import multer from 'multer';
import { 
  getFinancialSummary, 
  logExpense, 
  markInvoicePaid,
  getBillingConfig,
  saveBillingConfig,
  getInvoices,
  getPendingInvoices,
  submitPaymentProof,
  getExpensesHistory,
  topupWallet
} from '../controllers/financeController.js';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Secure all financial routes
router.use(authenticateJWT);

router.get('/summary', getFinancialSummary);
router.get('/history', requireRole(['admin', 'treasurer']), getExpensesHistory);
router.post('/pay-manual', requireRole(['admin', 'treasurer']), markInvoicePaid);
router.post('/expense', requireRole(['admin', 'treasurer']), logExpense);
router.get('/billing-config', getBillingConfig);
router.put('/billing-config', requireRole(['admin', 'treasurer']), saveBillingConfig);
router.get('/invoices', getInvoices);
router.get('/invoices-pending', getPendingInvoices);
router.post('/submit-proof', upload.single('proof'), submitPaymentProof);
router.post('/wallet/topup', requireRole(['admin', 'treasurer']), topupWallet);

export default router;