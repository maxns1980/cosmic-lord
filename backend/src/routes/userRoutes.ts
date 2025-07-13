
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { User, Planet } from '../types';
import { INITIAL_RESEARCH_LEVELS, INITIAL_SHIP_LEVELS, INITIAL_INVENTORY, INITIAL_ACTIVE_BOOSTS, INITIAL_RESOURCES, INITIAL_BUILDING_LEVELS, INITIAL_FLEET, INITIAL_DEFENSES } from '../constants';

const router = express.Router();

// Generate JWT
const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

const findEmptyPlanetSlot = async (): Promise<string | null> => {
    const planetsCollection = db.collection<Planet>('planets');
    const MAX_ATTEMPTS = 100;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const galaxy = Math.floor(Math.random() * 9) + 1;
        const system = Math.floor(Math.random() * 499) + 1;
        const position = Math.floor(Math.random() * 12) + 4; // Prefer central positions 4-15
        const coords = `${galaxy}:${system}:${position}`;

        const existingPlanet = await planetsCollection.findOne({ coordinates: coords });
        if (!existingPlanet) {
            return coords;
        }
    }
    
    // Fallback: search sequentially if random attempts fail
    for (let g = 1; g <= 9; g++) {
        for (let s = 1; s <= 499; s++) {
            for (let p = 4; p <= 15; p++) {
                const coords = `${g}:${s}:${p}`;
                const existingPlanet = await planetsCollection.findOne({ coordinates: coords });
                if (!existingPlanet) {
                    return coords;
                }
            }
        }
    }

    return null; // Could not find an empty slot
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
router.post('/register', async (req: express.Request, res: express.Response) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Proszę wypełnić wszystkie pola.' });
    }
    
    const usersCollection = db.collection<User>('users');
    const userExists = await usersCollection.findOne({ $or: [{ username }, { email }] });

    if (userExists) {
        return res.status(400).json({ message: 'Użytkownik o tej nazwie lub emailu już istnieje.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserDoc: Omit<User, '_id'> = {
        username,
        email,
        password: hashedPassword,
        createdAt: new Date(),
        research: INITIAL_RESEARCH_LEVELS,
        shipLevels: INITIAL_SHIP_LEVELS,
        credits: 1000,
        inventory: INITIAL_INVENTORY,
        activeBoosts: INITIAL_ACTIVE_BOOSTS,
        lastActivity: new Date(),
        points: 0,
        allianceId: undefined,
        allianceTag: undefined,
    };

    try {
        const result = await usersCollection.insertOne(newUserDoc as User);
        const newUserId = result.insertedId;
        
        const coordinates = await findEmptyPlanetSlot();
        if (!coordinates) {
             // Handle this case - maybe delete the user or put them in a queue
             await usersCollection.deleteOne({ _id: newUserId });
             return res.status(500).json({ message: "Błąd serwera: Nie można znaleźć wolnego miejsca w galaktyce." });
        }

        const planetsCollection = db.collection<Planet>('planets');
        const newPlanetDoc: Omit<Planet, '_id'> = {
            userId: newUserId,
            name: 'Planeta Matka',
            coordinates,
            isHomeworld: true,
            resources: INITIAL_RESOURCES,
            buildings: INITIAL_BUILDING_LEVELS,
            fleet: INITIAL_FLEET,
            defenses: INITIAL_DEFENSES,
            buildQueue: [],
            lastResourceUpdate: new Date(),
        };
        await planetsCollection.insertOne(newPlanetDoc as Planet);

        res.status(201).json({
            token: generateToken(newUserId.toHexString()),
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Błąd serwera podczas rejestracji." });
    }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
router.post('/login', async (req: express.Request, res: express.Response) => {
    const { username, password } = req.body;
    
    const usersCollection = db.collection<User>('users');
    const user = await usersCollection.findOne({ username });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
        await usersCollection.updateOne({ _id: user._id }, { $set: { lastActivity: new Date() }});
        res.json({
            token: generateToken(user._id.toHexString()),
        });
    } else {
        res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
    }
});

export default router;
