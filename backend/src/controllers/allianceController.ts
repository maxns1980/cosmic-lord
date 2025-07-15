
import { Request, Response } from 'express';
import { alliancesCollection } from '../models/allianceModel';
import { usersCollection } from '../models/userModel';
import { Alliance, AllianceFE, AllianceMember } from '../types';
import { ObjectId } from 'mongodb';

// @desc    Get all alliances
// @route   GET /api/alliances
// @access  Public
export const getAlliances = async (req: Request, res: Response) => {
    try {
        const alliances = await alliancesCollection().find({}).toArray();
        const alliancesFE: AllianceFE[] = alliances.map(a => ({
            id: a._id.toString(),
            name: a.name,
            tag: a.tag,
            leaderId: a.leaderId.toString(),
            members: a.members.map(m => ({
                userId: m.userId.toString(),
                username: m.username,
                role: m.role
            }))
        }));
        res.json(alliancesFE);
    } catch (error) {
        console.error('Error fetching alliances:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new alliance
// @route   POST /api/alliances
// @access  Private
export const createAlliance = async (req: Request, res: Response) => {
    const { name, tag } = req.body;
    const user = req.user;

    if (!user || !user._id) {
        return res.status(401).json({ message: 'User not authorized' });
    }
    if (user.allianceId) {
        return res.status(400).json({ message: 'User is already in an alliance' });
    }
    if (!name || !tag) {
        return res.status(400).json({ message: 'Please provide a name and a tag' });
    }

    try {
        const existingAlliance = await alliancesCollection().findOne({ $or: [{ name }, { tag }] });
        if (existingAlliance) {
            return res.status(400).json({ message: 'Alliance with that name or tag already exists' });
        }

        const leaderMember: AllianceMember = {
            userId: user._id,
            username: user.username,
            role: 'LEADER',
            joinedAt: new Date()
        };

        const newAlliance: Omit<Alliance, '_id'> = {
            name,
            tag,
            leaderId: user._id,
            members: [leaderMember],
            createdAt: new Date(),
        };

        const result = await alliancesCollection().insertOne(newAlliance);
        const allianceId = result.insertedId;

        await usersCollection().updateOne({ _id: user._id }, { $set: { allianceId: allianceId } });

        res.status(201).json({
            id: allianceId.toString(),
            name,
            tag
        });

    } catch (error) {
        console.error('Error creating alliance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Join an alliance
// @route   POST /api/alliances/:id/join
// @access  Private
export const joinAlliance = async (req: Request, res: Response) => {
    const user = req.user;
    const allianceId = new ObjectId(req.params.id);

    if (!user || !user._id) {
        return res.status(401).json({ message: 'User not authorized' });
    }
    if (user.allianceId) {
        return res.status(400).json({ message: 'User is already in an alliance' });
    }

    try {
        const alliance = await alliancesCollection().findOne({ _id: allianceId });
        if (!alliance) {
            return res.status(404).json({ message: 'Alliance not found' });
        }

        const newMember: AllianceMember = {
            userId: user._id,
            username: user.username,
            role: 'MEMBER',
            joinedAt: new Date(),
        };

        await alliancesCollection().updateOne({ _id: allianceId }, { $push: { members: newMember } });
        await usersCollection().updateOne({ _id: user._id }, { $set: { allianceId: allianceId } });

        res.json({ message: 'Successfully joined alliance' });

    } catch (error) {
        console.error('Error joining alliance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Leave an alliance
// @route   POST /api/alliances/:id/leave
// @access  Private
export const leaveAlliance = async (req: Request, res: Response) => {
    const user = req.user;
    const allianceId = new ObjectId(req.params.id);

     if (!user || !user._id) {
        return res.status(401).json({ message: 'User not authorized' });
    }
    if (!user.allianceId || user.allianceId.toString() !== allianceId.toString()) {
        return res.status(400).json({ message: 'User is not in this alliance' });
    }

    try {
        const alliance = await alliancesCollection().findOne({ _id: allianceId });
        if (!alliance) {
            return res.status(404).json({ message: 'Alliance not found' });
        }

        // If leader leaves, need to handle transfer or disband
        if (alliance.leaderId.equals(user._id)) {
            if (alliance.members.length > 1) {
                // Promote the longest-serving member
                const sortedMembers = alliance.members
                    .filter(m => !m.userId.equals(user._id))
                    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
                const newLeader = sortedMembers[0];
                await alliancesCollection().updateOne(
                    { _id: allianceId },
                    { 
                        $set: { leaderId: newLeader.userId, 'members.$[elem].role': 'LEADER' },
                        $pull: { members: { userId: user._id } }
                    },
                    { arrayFilters: [{ 'elem.userId': newLeader.userId }] }
                );
            } else {
                // Last member, disband alliance
                await alliancesCollection().deleteOne({ _id: allianceId });
            }
        } else {
            // Member leaves
            await alliancesCollection().updateOne({ _id: allianceId }, { $pull: { members: { userId: user._id } } });
        }

        await usersCollection().updateOne({ _id: user._id }, { $set: { allianceId: null } });

        res.json({ message: 'Successfully left alliance' });

    } catch (error) {
        console.error('Error leaving alliance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
