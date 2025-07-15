
import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createAlliance, getAlliances, joinAlliance, leaveAlliance } from '../controllers/allianceController';

const router = express.Router();

router.get('/', getAlliances);
router.post('/', authMiddleware, createAlliance);
router.post('/:id/join', authMiddleware, joinAlliance);
router.post('/:id/leave', authMiddleware, leaveAlliance);

// Placeholder for chat - to be implemented
const getChatHandler = (req: Request, res: Response) => res.json([]);
const postChatHandler = (req: Request, res: Response) => res.json({});

router.get('/:id/chat', authMiddleware, getChatHandler);
router.post('/:id/chat', authMiddleware, postChatHandler);


export default router;
