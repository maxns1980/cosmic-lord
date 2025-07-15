
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, db } from './config/db';
import { GameState } from './types';
import { 
    INITIAL_RESOURCES, 
    INITIAL_BUILDING_LEVELS,
    INITIAL_RESEARCH_LEVELS,
    INITIAL_SHIP_LEVELS,
    INITIAL_FLEET,
    INITIAL_DEFENSES,
    INITIAL_COLONIES,
    INITIAL_MERCHANT_STATE,
    INITIAL_PIRATE_MERCENARY_STATE,
    INITIAL_RESOURCE_VEIN_BONUS,
    INITIAL_ANCIENT_ARTIFACT_STATE,
    INITIAL_SPACE_PLAGUE_STATE,
    INITIAL_INVENTORY,
    INITIAL_ACTIVE_BOOSTS,
    PLAYER_HOME_COORDS
} from './constants';
import { ObjectId } from 'mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// --- Hardcoded User for now ---
// In a real app, this would come from a JWT token after login
const HARDCODED_USER_ID = 'player1'; 

app.get('/api/state', async (req: Request, res: Response) => {
    try {
        const usersCollection = db.collection('users');
        const planetsCollection = db.collection('planets');
        
        let user = await usersCollection.findOne({ username: HARDCODED_USER_ID });
        let userObjectId;

        if (!user) {
            // --- Create a new user and their homeworld ---
            console.log('No user found, creating a new one...');
            const newUserDoc = {
                username: HARDCODED_USER_ID,
                email: 'player1@example.com',
                createdAt: new Date(),
                research: INITIAL_RESEARCH_LEVELS,
                shipLevels: INITIAL_SHIP_LEVELS,
                credits: 10000,
                inventory: INITIAL_INVENTORY,
                activeBoosts: INITIAL_ACTIVE_BOOSTS,
                planetIds: [] // Will be updated after planet creation
            };
            const userInsertResult = await usersCollection.insertOne(newUserDoc);
            userObjectId = userInsertResult.insertedId;

            const newPlanetDoc = {
                userId: userObjectId,
                name: 'Planeta Matka',
                coordinates: PLAYER_HOME_COORDS,
                isHomeworld: true,
                resources: INITIAL_RESOURCES,
                buildings: INITIAL_BUILDING_LEVELS,
                fleet: INITIAL_FLEET,
                defenses: INITIAL_DEFENSES,
                buildQueue: [],
                lastResourceUpdate: new Date()
            };
            const planetInsertResult = await planetsCollection.insertOne(newPlanetDoc);

            // Link planet to user
            await usersCollection.updateOne(
                { _id: userObjectId },
                { $set: { planetIds: [planetInsertResult.insertedId] } }
            );

            user = await usersCollection.findOne({ _id: userObjectId });
        }
        
        userObjectId = user._id;

        // Fetch all data for this user
        const planets = await planetsCollection.find({ userId: userObjectId }).toArray();
        const fleetMissions = await db.collection('fleet_missions').find({ ownerId: userObjectId }).toArray();
        const messages = await db.collection('messages').find({ recipientId: userObjectId }).sort({ timestamp: -1 }).limit(100).toArray();
        
        // Find the main planet to return its state for now
        // Later, we will handle multiple planets
        const mainPlanet = planets.find(p => p.isHomeworld);

        if (!mainPlanet) {
            return res.status(404).json({ message: "Main planet not found for user" });
        }

        const gameState: GameState = {
            resources: mainPlanet.resources,
            buildings: mainPlanet.buildings,
            fleet: mainPlanet.fleet,
            defenses: mainPlanet.defenses,
            buildQueue: mainPlanet.buildQueue,
            
            research: user.research,
            shipLevels: user.shipLevels,
            credits: user.credits,
            inventory: user.inventory,
            activeBoosts: user.activeBoosts,
            colonies: user.colonies || INITIAL_COLONIES, // fetch from a separate collection later

            fleetMissions: fleetMissions.map(m => ({...m, id: m._id.toString() })),
            messages: messages.map(m => ({...m, id: m._id.toString() })),

            // These will be calculated and handled by the game loop on the server later
            lastSaveTime: Date.now(),
            npcFleetMissions: [], 
            npcStates: {},
            debrisFields: {},
            merchantState: INITIAL_MERCHANT_STATE,
            pirateMercenaryState: INITIAL_PIRATE_MERCENARY_STATE,
            resourceVeinBonus: INITIAL_RESOURCE_VEIN_BONUS,
            ancientArtifactState: INITIAL_ANCIENT_ARTIFACT_STATE,
            spacePlague: INITIAL_SPACE_PLAGUE_STATE,
        };

        res.json(gameState);

    } catch (error) {
        console.error('Error fetching game state:', error);
        res.status(500).json({ message: 'Server error while fetching game state.' });
    }
});

app.get('/', (req: Request, res: Response) => {
    res.send('Cosmic Lord Backend is running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
