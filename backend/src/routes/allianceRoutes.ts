
import express, { RequestHandler } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createAlliance, getAlliances, joinAlliance, leaveAlliance } from '../controllers/allianceController';

const router = express.Router();

router.get('/', getAlliances);
router.post('/', authMiddleware, createAlliance);
router.post('/:id/join', authMiddleware, joinAlliance);
router.post('/:id/leave', authMiddleware, leaveAlliance);

// Placeholder for chat - to be implemented
const getChatHandler: RequestHandler = (req, res) => res.json([]);
const postChatHandler: RequestHandler = (req, res) => res.json({});

router.get('/:id/chat', authMiddleware, getChatHandler);
router.post('/:id/chat', authMiddleware, postChatHandler);


export default router;
