
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersCollection } from '../models/userModel';
import { planetsCollection } from '../models/planetModel';
import { 
    INITIAL_RESOURCES, 
    INITIAL_BUILDING_LEVELS,
    INITIAL_RESEARCH_LEVELS,
    INITIAL_SHIP_LEVELS,
    INITIAL_FLEET,
    INITIAL_DEFENSES,
    INITIAL_INVENTORY,
    INITIAL_ACTIVE_BOOSTS,
    PLAYER_HOME_COORDS
} from '../constants';
import { User } from '../types';

// Generate JWT
const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await usersCollection().findOne({ $or: [{ email }, { username }] });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUserDoc: Omit<User, '_id'> = {
        username,
        email,
        passwordHash,
        createdAt: new Date(),
        research: INITIAL_RESEARCH_LEVELS,
        shipLevels: INITIAL_SHIP_LEVELS,
        credits: 10000,
        inventory: INITIAL_INVENTORY,
        activeBoosts: INITIAL_ACTIVE_BOOSTS,
        planetIds: [] // Will be updated after planet creation
    };

    try {
        const userInsertResult = await usersCollection().insertOne(newUserDoc);
        const userObjectId = userInsertResult.insertedId;

        // Create homeworld planet for the user
        const newPlanetDoc = {
            userId: userObjectId,
            name: 'Planeta Matka',
            coordinates: PLAYER_HOME_COORDS, // This needs to be unique in a real game
            isHomeworld: true,
            resources: INITIAL_RESOURCES,
            buildings: INITIAL_BUILDING_LEVELS,
            fleet: INITIAL_FLEET,
            defenses: INITIAL_DEFENSES,
            buildQueue: [],
            lastResourceUpdate: new Date()
        };
        const planetInsertResult = await planetsCollection().insertOne(newPlanetDoc);

        // Link planet to user
        await usersCollection().updateOne(
            { _id: userObjectId },
            { $set: { planetIds: [planetInsertResult.insertedId] } }
        );

        const createdUser = await usersCollection().findOne({ _id: userObjectId });
        
        if (createdUser) {
             res.status(201).json({
                _id: createdUser._id,
                username: createdUser.username,
                email: createdUser.email,
                token: generateToken(createdUser._id.toString()),
            });
        } else {
             res.status(400).json({ message: 'Invalid user data' });
        }
       
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Check for user email
    const user = await usersCollection().findOne({ email });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id.toString()),
        });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
};
