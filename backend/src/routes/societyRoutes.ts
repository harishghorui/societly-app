import { Router } from 'express';
import { Op } from 'sequelize';
import { 
  getPendingApprovals, 
  updateApprovalStatus, 
  getSocietyProfile, 
  updateSocietyProfile,
  getWingsAndFlats,
  setupPropertyLayout 
} from '../controllers/societyController.js';
import Society from '../models/Society.js';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware.js';
import { sendSuccess, sendError } from '../utils/responseWrapper.js';

const router = Router();

// Public onboarding routes
router.get('/search', async (req, res) => {
  const { query } = req.query; // This can be the Code or the Name

  try {
    const societies = await Society.findAll({
      where: {
        [Op.or]: [
          { registrationCode: query as string },
          { name: { [Op.iLike]: `%${query}%` } } // Fuzzy search for Ubuntu/Postgres
        ]
      }
    });
    return sendSuccess(res, 200, "Societies searched successfully", societies);
  } catch (error) {
    return sendError(res, 500, "Search failed", "SEARCH_FAILED", error);
  }
});

router.get('/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const society = await Society.findOne({
      where: { registrationCode: code.toUpperCase() },
      attributes: ['id', 'name', 'address'] // Don't send govtRegNo to residents
    });

    if (!society) {
      return sendError(res, 404, "Society not found. Check the code again.", "SOCIETY_NOT_FOUND");
    }

    return sendSuccess(res, 200, "Society verified successfully", society);
  } catch (error) {
    return sendError(res, 500, "Error verifying code", "VERIFY_CODE_ERROR", error);
  }
});

// Secure all subsequent routes
router.use(authenticateJWT);

router.get('/approvals', requireRole(['admin', 'secretary']), getPendingApprovals);
router.put('/approvals/:membershipId', requireRole(['admin', 'secretary']), updateApprovalStatus);

// Property layout endpoints
router.get('/:id/layout', getWingsAndFlats);
router.post('/:id/layout', requireRole(['admin', 'secretary']), setupPropertyLayout);

router.get('/:id', getSocietyProfile);
router.put('/:id', updateSocietyProfile);

export default router;