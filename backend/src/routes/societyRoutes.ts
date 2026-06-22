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
    res.json(societies);
  } catch (error) {
    res.status(500).json({ message: "Search failed" });
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
      return res.status(404).json({ message: "Society not found. Check the code again." });
    }

    res.json(society);
  } catch (error) {
    res.status(500).json({ message: "Error verifying code" });
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