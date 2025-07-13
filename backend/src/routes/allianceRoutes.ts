import express, { Request, Response } from 'express';
import { db } from '../config/db';
import { protect } from '../middleware/authMiddleware';
import { Alliance, User, AllianceChatMessage, AllianceFE } from '../types';
import { ObjectId } from 'mongodb';

const router = express.Router();

// @desc    Create a new alliance
// @route   POST /api/alliances/create
// @access  Private
router.post('/create', protect, async (req: Request, res: Response) => {
    const { name, tag } = req.body;
    const user = req.user!;

    if (!name || !tag) {
        return res.status(400).json({ message: "Nazwa i tag sojuszu są wymagane." });
    }
    if (tag.length < 3 || tag.length > 5) {
         return res.status(400).json({ message: "Tag musi mieć od 3 do 5 znaków." });
    }
    if (user.allianceId) {
        return res.status(400).json({ message: "Jesteś już w sojuszu." });
    }
    
    const alliancesCollection = db.collection<Alliance>('alliances');
    const usersCollection = db.collection<User>('users');
    
    const existingAlliance = await alliancesCollection.findOne({ $or: [{ name }, { tag }] });
    if (existingAlliance) {
        return res.status(400).json({ message: "Sojusz o tej nazwie lub tagu już istnieje." });
    }
    
    try {
        const newAllianceDoc: Omit<Alliance, '_id'> = {
            name,
            tag,
            leaderId: user._id,
            members: [{
                userId: user._id,
                username: user.username,
                points: user.points
            }]
        };
        const result = await alliancesCollection.insertOne(newAllianceDoc as Alliance);
        const newAllianceId = result.insertedId;
        
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { allianceId: newAllianceId, allianceTag: tag } }
        );

        const createdAlliance = await alliancesCollection.findOne({ _id: newAllianceId });
        
        const feAlliance: AllianceFE | undefined = createdAlliance ? {
            id: createdAlliance._id.toHexString(),
            name: createdAlliance.name,
            tag: createdAlliance.tag,
            leaderId: createdAlliance.leaderId.toHexString(),
            members: createdAlliance.members.map(m => ({
                userId: m.userId.toHexString(),
                username: m.username,
                points: m.points,
            })),
            chat: [],
        } : undefined;


        res.status(201).json({
            message: `Sojusz [${tag}] ${name} został założony!`,
            alliance: feAlliance
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Błąd serwera podczas tworzenia sojuszu." });
    }
});

// @desc    Leave the current alliance
// @route   POST /api/alliances/leave
// @access  Private
router.post('/leave', protect, async (req: Request, res: Response) => {
    const user = req.user!;
    if (!user.allianceId) {
        return res.status(400).json({ message: "Nie należysz do żadnego sojuszu." });
    }
    
    const alliancesCollection = db.collection<Alliance>('alliances');
    const usersCollection = db.collection<User>('users');
    
    try {
        const alliance = await alliancesCollection.findOne({ _id: user.allianceId });
        if (!alliance) {
            // Data inconsistency, clear user's alliance fields
            await usersCollection.updateOne({ _id: user._id }, { $unset: { allianceId: "", allianceTag: "" } });
            return res.status(404).json({ message: "Sojusz nie został znaleziony." });
        }
        
        // If user is the leader and there are other members
        if (alliance.leaderId.equals(user._id) && alliance.members.length > 1) {
            return res.status(400).json({ message: "Nie możesz opuścić sojuszu jako lider, jeśli są w nim inni członkowie. Przekaż przywództwo." });
        }
        
        // If user is the last member, delete the alliance
        if (alliance.members.length === 1 && alliance.leaderId.equals(user._id)) {
            await alliancesCollection.deleteOne({ _id: alliance._id });
        } else {
            // Just remove the user from members list
            await alliancesCollection.updateOne(
                { _id: alliance._id },
                { $pull: { members: { userId: user._id } } }
            );
        }
        
        await usersCollection.updateOne({ _id: user._id }, { $unset: { allianceId: "", allianceTag: "" } });
        
        res.status(200).json({ message: `Opuściłeś sojusz [${alliance.tag}] ${alliance.name}.` });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Błąd serwera podczas opuszczania sojuszu." });
    }
});


// @desc    Get alliance chat messages
// @route   GET /api/alliances/chat
// @access  Private
router.get('/chat', protect, async (req: Request, res: Response) => {
    const user = req.user!;
    if (!user.allianceId) {
        return res.status(400).json({ message: "Nie należysz do żadnego sojuszu." });
    }
    
    const chatCollection = db.collection<AllianceChatMessage>('alliance_chats');
    try {
        const messages = await chatCollection
            .find({ allianceId: user.allianceId })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();

        res.json(messages.reverse().map(m => ({
            id: m._id.toHexString(),
            allianceId: m.allianceId.toHexString(),
            userId: m.userId.toHexString(),
            username: m.username,
            message: m.message,
            timestamp: m.timestamp
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Błąd serwera podczas pobierania wiadomości czatu." });
    }
});

// @desc    Send alliance chat message
// @route   POST /api/alliances/chat
// @access  Private
router.post('/chat', protect, async (req: Request, res: Response) => {
    const user = req.user!;
    const { message } = req.body;

    if (!user.allianceId) {
        return res.status(400).json({ message: "Nie należysz do żadnego sojuszu." });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 500) {
        return res.status(400).json({ message: "Nieprawidłowa wiadomość." });
    }

    const chatCollection = db.collection<AllianceChatMessage>('alliance_chats');
    try {
        const newChatMessageDoc: Omit<AllianceChatMessage, '_id'> = {
            allianceId: user.allianceId,
            userId: user._id,
            username: user.username,
            message: message.trim(),
            timestamp: Date.now(),
        };

        await chatCollection.insertOne(newChatMessageDoc as AllianceChatMessage);

        // Return the latest messages after posting
        const messages = await chatCollection
            .find({ allianceId: user.allianceId })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();

        res.status(201).json(messages.reverse().map(m => ({
            id: m._id.toHexString(),
            allianceId: m.allianceId.toHexString(),
            userId: m.userId.toHexString(),
            username: m.username,
            message: m.message,
            timestamp: m.timestamp
        })));

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Błąd serwera podczas wysyłania wiadomości." });
    }
});


export default router;