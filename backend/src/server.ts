
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB, db } from './config/db';
import { GameState, FleetMission, Message, MerchantStatus, PirateMercenaryStatus, AncientArtifactStatus } from './types';
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

const startServer = async () => {
    // Connect to Database
    await connectDB();

    // Middleware
    app.use(cors());
    app.use(express.json());

    // API Routes
    app.use('/api/users', userRoutes);
    app.use('/api/alliances', allianceRoutes);

    const getStateHandler: express.RequestHandler = async (req, res) => {
        try {
            const user = req.user;
            if (!user || !user._id) {
                return res.status(401).json({ message: "User not authenticated" });
            }
            
            const userObjectId = new ObjectId(user._id);

            const fleetMissionsCollection = db.collection('fleet_missions');
            const messagesCollection = db.collection('messages');
            const planetsCollection = db.collection('planets');

            const fleetMissions = await fleetMissionsCollection.find({ ownerId: userObjectId }).toArray();
            const messages = await messagesCollection.find({ recipientId: userObjectId }).sort({ timestamp: -1 }).limit(100).toArray();
            
            const planets = await planetsCollection.find({ userId: userObjectId }).toArray();
            const mainPlanet = planets.find(p => p.isHomeworld);

            if (!mainPlanet) {
                return res.status(404).json({ message: "Main planet not found for user" });
            }
            
            const fleetMissionsFE: FleetMission[] = fleetMissions.map(m => {
                const { _id, ...rest } = m;
                return { id: _id.toString(), ...rest } as unknown as FleetMission;
            });
            
            const messagesFE: Message[] = messages.map(m => {
                const { _id, ...rest } = m;
                return { id: _id.toString(), ...rest } as unknown as Message;
            });

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
                colonies: [],

                fleetMissions: fleetMissionsFE,
                messages: messagesFE,

                lastSaveTime: Date.now(),
                npcFleetMissions: [], 
                npcStates: {},
                debrisFields: {},
                merchantState: { status: MerchantStatus.INACTIVE, arrivalTime: 0, departureTime: 0, rates: { metal: { buy: 2, sell: 1}, crystal: { buy: 4, sell: 2 }, deuterium: { buy: 6, sell: 3 }}},
                pirateMercenaryState: { status: PirateMercenaryStatus.INACTIVE, fleet: {}, hireCost: 0, arrivalTime: 0, departureTime: 0 },
                resourceVeinBonus: { active: false, resourceType: null, endTime: 0, bonusMultiplier: 1.25 },
                ancientArtifactState: { status: AncientArtifactStatus.INACTIVE },
                spacePlague: { active: false, infectedShip: null, endTime: 0 },
            };

            res.json(gameState);

        } catch (error) {
            console.error('Error fetching game state:', error);
            res.status(500).json({ message: 'Server error while fetching game state.' });
        }
    };
    app.get('/api/state', authMiddleware, getStateHandler);

    // --- Serve Frontend ---
    if (process.env.NODE_ENV === 'production') {
        // In production, serve the built frontend assets
        const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
        app.use(express.static(frontendDistPath));

        app.get('*', (req, res) => {
            res.sendFile(path.resolve(frontendDistPath, 'index.html'));
        });
    } else {
        app.get('/', (req, res) => {
            res.send('API is running... (in development)');
        });
    }


    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
};

startServer();
