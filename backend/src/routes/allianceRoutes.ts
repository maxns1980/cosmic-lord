
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createAlliance, getAlliances, joinAlliance, leaveAlliance } from '../controllers/allianceController';

const router = express.Router();

router.get('/', getAlliances);
router.post('/', authMiddleware, createAlliance);
router.post('/:id/join', authMiddleware, joinAlliance);
router.post('/:id/leave', authMiddleware, leaveAlliance);

// Placeholder for chat - to be implemented
router.get('/:id/chat', authMiddleware, (req, res) => res.json([]));
router.post('/:id/chat', authMiddleware, (req, res) => res.json({}));


export default router;
