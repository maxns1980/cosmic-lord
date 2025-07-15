import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, db } from './config/db';
import { GameState, FleetMission, Message } from './types';
import { 
    PLAYER_HOME_COORDS
} from './constants';
import { ObjectId } from 'mongodb';
import { authMiddleware } from './middleware/authMiddleware';
import userRoutes from './routes/userRoutes';
import allianceRoutes from './routes/allianceRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/alliances', allianceRoutes);


app.get('/api/state', authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
        const user = req.user;
        if (!user || !user._id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        
        const userObjectId = new ObjectId(user._id);

        // Fetch all data for this user
        const fleetMissionsCollection = db.collection('fleet_missions');
        const messagesCollection = db.collection('messages');
        const planetsCollection = db.collection('planets');

        const fleetMissions = await fleetMissionsCollection.find({ ownerId: userObjectId }).toArray();
        const messages = await messagesCollection.find({ recipientId: userObjectId }).sort({ timestamp: -1 }).limit(100).toArray();
        
        // Find the main planet to return its state for now
        // Later, we will handle multiple planets
        const planets = await planetsCollection.find({ userId: userObjectId }).toArray();
        const mainPlanet = planets.find(p => p.isHomeworld);

        if (!mainPlanet) {
            // This is a failsafe. A user should always have a homeworld after registration.
            return res.status(404).json({ message: "Main planet not found for user" });
        }
        
        // Map DB documents to front-end types
        const fleetMissionsFE: FleetMission[] = fleetMissions.map(m => {
            const { _id, ...rest } = m;
            return { id: _id.toString(), ...rest } as unknown as FleetMission;
        });
        
        const messagesFE: Message[] = messages.map(m => {
            const { _id, ...rest } = m;
            return { id: _id.toString(), ...rest } as unknown as Message;
        });

        // The GameState object sent to the client
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
            colonies: [], // Will be implemented later

            fleetMissions: fleetMissionsFE,
            messages: messagesFE,

            // These are placeholder values. A real game loop on the server would manage this state.
            lastSaveTime: Date.now(),
            npcFleetMissions: [], 
            npcStates: {},
            debrisFields: {},
            merchantState: { status: 'INACTIVE', arrivalTime: 0, departureTime: 0, rates: { metal: { buy: 2, sell: 1}, crystal: { buy: 4, sell: 2 }, deuterium: { buy: 6, sell: 3 }}},
            pirateMercenaryState: { status: 'INACTIVE', fleet: {}, hireCost: 0, arrivalTime: 0, departureTime: 0 },
            resourceVeinBonus: { active: false, resourceType: null, endTime: 0, bonusMultiplier: 1.25 },
            ancientArtifactState: { status: 'INACTIVE' },
            spacePlague: { active: false, infectedShip: null, endTime: 0 },
        };

        res.json(gameState);

    } catch (error) {
        console.error('Error fetching game state:', error);
        res.status(500).json({ message: 'Server error while fetching game state.' });
    }
});

app.get('/', (req: express.Request, res: express.Response) => {
    res.send('Cosmic Lord Backend is running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});