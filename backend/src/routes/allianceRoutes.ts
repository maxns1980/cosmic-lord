import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createAlliance, getAlliances, joinAlliance, leaveAlliance } from '../controllers/allianceController';

const router = express.Router();

router.get('/', getAlliances);
router.post('/', authMiddleware, createAlliance);
router.post('/:id/join', authMiddleware, joinAlliance);
router.post('/:id/leave', authMiddleware, leaveAlliance);

// Placeholder for chat - to be implemented
router.get('/:id/chat', authMiddleware, (req: ExpressRequest, res: ExpressResponse) => res.json([]));
router.post('/:id/chat', authMiddleware, (req: ExpressRequest, res: ExpressResponse) => res.json({}));


export default router;
