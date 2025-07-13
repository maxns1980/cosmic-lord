

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, db } from './config/db';
import userRoutes from './routes/userRoutes';
import allianceRoutes from './routes/allianceRoutes';
import { protect } from './middleware/authMiddleware';
import { 
    GameState, FleetMission, Message, GameObject, QueueItemType, QueueItem, 
    BuildingType, ResearchType, ShipType, DefenseType, BuildingLevels, ResearchLevels, ShipLevels, BoostType, Fleet, MissionType, BattleReport, SpyReport, DebrisField, NPCState, BattleMessage, SpyMessage, NPCPersonality, ExpeditionMessage, Resources, ColonizationMessage, ExplorationMessage,
    User, Planet, PlayerRank, GalaxyViewObject, Alliance, AllianceFE, AllianceChatMessage
} from './types';
import { 
    INITIAL_MERCHANT_STATE,
    ALL_GAME_OBJECTS,
    INITIAL_NPC_STATE,
    SHIPYARD_DATA,
    INITIAL_PIRATE_MERCENARY_STATE,
    INITIAL_RESOURCE_VEIN_BONUS,
    INITIAL_ANCIENT_ARTIFACT_STATE,
    INITIAL_SPACE_PLAGUE_STATE,
    INITIAL_RESOURCES,
    INITIAL_BUILDING_LEVELS
} from './constants';
import { ObjectId } from 'mongodb';
import { calculateMaxResources, calculateProductions } from './utils/gameLogic';
import { calculateDistance, calculateTravelTime, calculateFuelConsumption } from './utils/fleetLogic';
import { simulateCombat } from './utils/combatLogic';
import { handleSpyMission } from './utils/spyLogic';
import { handleExpedition } from './utils/expeditionLogic';
import { handleExploration } from './utils/explorationLogic';
import { calculatePlayerPoints } from './utils/pointsLogic';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/alliances', allianceRoutes);

const checkRequirements = (
    requirements: Partial<BuildingLevels & ResearchLevels> | undefined, 
    buildings: BuildingLevels, 
    research: ResearchLevels
): boolean => {
    if (!requirements) return true;
    return Object.entries(requirements).every(([reqId, reqLevel]) => {
        if (Object.values(BuildingType).includes(reqId as BuildingType)) {
            return buildings[reqId as BuildingType] >= (reqLevel as number);
        }
        if (Object.values(ResearchType).includes(reqId as ResearchType)) {
            return research[reqId as ResearchType] >= (reqLevel as number);
        }
        return false;
    });
};

const getOrCreateNpc = async (coords: string): Promise<NPCState> => {
    const galaxyCollection = db.collection('galaxy');
    let npcDoc = await galaxyCollection.findOne({ coordinates: coords, type: 'npc' });
    if (npcDoc) return npcDoc.state as NPCState;

    const newNpcState: NPCState = {
        ...INITIAL_NPC_STATE,
        name: `Pirate ${coords}`, image: '🪐', personality: NPCPersonality.AGGRESSIVE, lastUpdateTime: Date.now(),
    };
    await galaxyCollection.insertOne({ coordinates: coords, type: 'npc', state: newNpcState });
    return newNpcState;
};

const updatePlayerState = async (userId: ObjectId) => {
    const users = db.collection<User>('users');
    const planets = db.collection<Planet>('planets');
    const fleetMissions = db.collection<FleetMission>('fleet_missions');
    const messages = db.collection('messages');
    const galaxy = db.collection('galaxy');

    const user = await users.findOne({ _id: userId });
    if (!user) return;

    const userPlanets = await planets.find({ userId }).toArray();
    const now = Date.now();
    const userColonies = userPlanets.filter(p => !p.isHomeworld);
    
    // --- Fleet Mission Processing ---
    const activeMissions = await fleetMissions.find({ ownerId: user._id }).toArray();
    for (const mission of activeMissions) {
        // Handle returns
        if (now >= mission.returnTime) {
            const originPlanet = userPlanets.find(p => p.coordinates === mission.originCoords);
            if (originPlanet) {
                const updates: any = { $inc: {} };
                for (const ship in mission.fleet) {
                    updates.$inc[`fleet.${ship}`] = mission.fleet[ship as ShipType] || 0;
                }
                if (mission.loot) {
                    if (mission.loot.metal) updates.$inc['resources.metal'] = mission.loot.metal;
                    if (mission.loot.crystal) updates.$inc['resources.crystal'] = mission.loot.crystal;
                    if (mission.loot.deuterium) updates.$inc['resources.deuterium'] = mission.loot.deuterium;
                }
                await planets.updateOne({ _id: originPlanet._id }, updates);
                if (mission.loot.credits) {
                    await users.updateOne({ _id: user._id }, { $inc: { credits: mission.loot.credits } });
                }
            }
            await fleetMissions.deleteOne({ _id: mission._id });
            continue;
        }

        // Handle arrivals
        if (now >= mission.arrivalTime && !mission.processedArrival) {
            if (mission.missionType === MissionType.ATTACK) {
                const targetPlanet = await planets.findOne({ coordinates: mission.targetCoords });
                if (targetPlanet) { // PvP Combat
                    const defender = await users.findOne({ _id: targetPlanet.userId });
                    if(defender) {
                        const combatResult = simulateCombat(mission.fleet, targetPlanet.fleet, targetPlanet.defenses, user.research, defender.research, user.shipLevels, defender.shipLevels, targetPlanet);
                        
                        // Update defender's planet
                        await planets.updateOne({_id: targetPlanet._id}, { $set: { fleet: combatResult.defenderFleetAfter, defenses: combatResult.defenderDefensesAfter, resources: combatResult.defenderResourcesAfter }});
                        
                        // Update attacker's loot
                        await fleetMissions.updateOne({ _id: mission._id! }, { $set: { 'loot.metal': combatResult.loot.metal, 'loot.crystal': combatResult.loot.crystal, 'loot.deuterium': combatResult.loot.deuterium } });

                        // Create debris field
                        if ((combatResult.debrisCreated.metal || 0) > 0 || (combatResult.debrisCreated.crystal || 0) > 0) {
                           await galaxy.updateOne({ coordinates: mission.targetCoords, type: 'debris' }, { $inc: { 'debris.metal': combatResult.debrisCreated.metal, 'debris.crystal': combatResult.debrisCreated.crystal } }, { upsert: true });
                        }
                        
                        // Create and send reports
                        const reportId = uuidv4();
                        const attackerReport: BattleMessage = { recipientId: user._id, timestamp: now, isRead: false, subject: `Wynik ataku na [${mission.targetCoords}]`, type: 'battle', report: { ...combatResult.report, id: reportId, attackerName: user.username, defenderName: defender.username, targetCoords: mission.targetCoords, isPlayerAttacker: true } };
                        const defenderReport: BattleMessage = { recipientId: defender._id, timestamp: now, isRead: false, subject: `Atak na Twoją planetę [${mission.targetCoords}]`, type: 'battle', report: { ...combatResult.report, id: reportId, attackerName: user.username, defenderName: defender.username, targetCoords: mission.targetCoords, isPlayerAttacker: false } };
                        await messages.insertMany([attackerReport, defenderReport]);
                    }
                }
            } else if (mission.missionType === MissionType.COLONIZE) {
                const maxColonies = user.research[ResearchType.ASTROPHYSICS] || 0;
                const planetIsFree = !(await planets.findOne({ coordinates: mission.targetCoords }));
                if (planetIsFree && userColonies.length < maxColonies) {
                    const newPlanet: Omit<Planet, '_id'> = {
                        userId: user._id, name: `Kolonia ${mission.targetCoords}`, coordinates: mission.targetCoords, isHomeworld: false,
                        resources: INITIAL_RESOURCES, buildings: INITIAL_BUILDING_LEVELS, fleet: {}, defenses: {}, buildQueue: [], lastResourceUpdate: new Date(now),
                    };
                    await planets.insertOne(newPlanet as Planet);
                }
                await fleetMissions.deleteOne({ _id: mission._id });
            }
            await fleetMissions.updateOne({ _id: mission._id! }, { $set: { processedArrival: true } });
        }
    }

    // --- Planet Resource and Queue Processing ---
    for (const planet of userPlanets) {
        const timeDiffSeconds = (now - new Date(planet.lastResourceUpdate).getTime()) / 1000;
        if (timeDiffSeconds < 1) continue;

        const productions = calculateProductions(planet.buildings, user.resourceVeinBonus || {active: false, bonusMultiplier: 1, endTime: 0, resourceType: null}, user.activeBoosts, userColonies.length, planet.isHomeworld);
        const maxRes = calculateMaxResources(planet.buildings);
        
        const updates: any = { $set: { lastResourceUpdate: new Date(now) } };
        
        const newResources: Resources = {
            metal: Math.min(maxRes.metal, planet.resources.metal + (productions.metal / 3600) * timeDiffSeconds),
            crystal: Math.min(maxRes.crystal, planet.resources.crystal + (productions.crystal / 3600) * timeDiffSeconds),
            deuterium: Math.min(maxRes.deuterium, planet.resources.deuterium + (productions.deuterium / 3600) * timeDiffSeconds),
        }
        
        updates.$set['resources'] = newResources;

        const completedItems = planet.buildQueue.filter(item => now >= item.endTime);
        if (completedItems.length > 0) {
            updates.$set.buildQueue = planet.buildQueue.filter(item => now < item.endTime);
            const buildingUpdates: any = {};
            const researchUpdates: any = {};
            const shipLevelUpdates: any = {};
            const fleetUpdates: any = {};
            const defenseUpdates: any = {};

            completedItems.forEach(item => {
                if (item.type === 'building') buildingUpdates[`buildings.${item.id}`] = item.levelOrAmount;
                else if (item.type === 'research') researchUpdates[`research.${item.id}`] = item.levelOrAmount;
                else if (item.type === 'ship_upgrade') shipLevelUpdates[`shipLevels.${item.id}`] = item.levelOrAmount;
                else if (item.type === 'ship') fleetUpdates[`fleet.${item.id}`] = item.levelOrAmount;
                else if (item.type === 'defense') defenseUpdates[`defenses.${item.id}`] = item.levelOrAmount;
            });
            
            if (Object.keys(buildingUpdates).length > 0) await planets.updateOne({ _id: planet._id }, { $set: buildingUpdates });
            if (Object.keys(fleetUpdates).length > 0) await planets.updateOne({ _id: planet._id }, { $inc: fleetUpdates });
            if (Object.keys(defenseUpdates).length > 0) await planets.updateOne({ _id: planet._id }, { $inc: defenseUpdates });
            if (Object.keys(researchUpdates).length > 0) await users.updateOne({ _id: user._id }, { $set: researchUpdates });
            if (Object.keys(shipLevelUpdates).length > 0) await users.updateOne({ _id: user._id }, { $set: shipLevelUpdates });
        }
        
        await planets.updateOne({ _id: planet._id }, updates);
    }
    
    // --- Update Player Points ---
    const updatedUserForPoints = await users.findOne({ _id: user._id });
    const updatedPlanetsForPoints = await planets.find({ userId: user._id }).toArray();
    if (updatedUserForPoints) {
        const points = calculatePlayerPoints(updatedUserForPoints, updatedPlanetsForPoints);
        if (updatedUserForPoints.allianceId) {
             await db.collection('alliances').updateOne({ _id: updatedUserForPoints.allianceId, 'members.userId': user._id }, { $set: { 'members.$.points': points } });
        }
        await users.updateOne({ _id: user._id }, { $set: { points, lastActivity: new Date() } });
    } else {
        await users.updateOne({ _id: user._id }, { $set: { lastActivity: new Date() } });
    }
};


app.get('/api/state', protect, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        await updatePlayerState(user._id);

        const updatedUser = await db.collection<User>('users').findOne({ _id: user._id });
        if (!updatedUser) return res.status(404).json({ message: "User not found after update." });
        
        let allianceData: Alliance | undefined;
        if (updatedUser.allianceId) {
            allianceData = await db.collection<Alliance>('alliances').findOne({ _id: updatedUser.allianceId }) || undefined;
        }

        let feAlliance: AllianceFE | undefined;
        if (allianceData) {
            const allianceChatMessages = await db.collection<AllianceChatMessage>('alliance_chats')
                .find({ allianceId: allianceData._id })
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray();

            feAlliance = {
                id: allianceData._id.toHexString(),
                name: allianceData.name,
                tag: allianceData.tag,
                leaderId: allianceData.leaderId.toHexString(),
                members: allianceData.members.map(m => ({
                    userId: m.userId.toHexString(),
                    username: m.username,
                    points: m.points,
                })),
                chat: allianceChatMessages.reverse().map(m => ({
                    id: m._id.toHexString(),
                    allianceId: m.allianceId.toHexString(),
                    userId: m.userId.toHexString(),
                    username: m.username,
                    message: m.message,
                    timestamp: m.timestamp
                }))
            };
        }
        
        const userPlanets = await db.collection<Planet>('planets').find({ userId: updatedUser._id }).toArray();
        const fleetMissionsDocs = await db.collection<FleetMission>('fleet_missions').find({ ownerId: updatedUser._id }).toArray();
        const messagesDocs = await db.collection('messages').find({ recipientId: updatedUser._id }).sort({ timestamp: -1 }).limit(100).toArray();
        
        const gameState: GameState = {
            username: updatedUser.username,
            research: updatedUser.research,
            shipLevels: updatedUser.shipLevels,
            credits: updatedUser.credits,
            inventory: updatedUser.inventory,
            activeBoosts: updatedUser.activeBoosts,
            alliance: feAlliance,
            planets: userPlanets.map(p => ({
                id: p._id.toString(), name: p.name, coordinates: p.coordinates, isHomeworld: p.isHomeworld,
                resources: p.resources, buildings: p.buildings, fleet: p.fleet, defenses: p.defenses,
                buildQueue: p.buildQueue, lastResourceUpdate: new Date(p.lastResourceUpdate).getTime()
            })),
            fleetMissions: fleetMissionsDocs.map(doc => ({...doc, id: doc._id!.toString() } as unknown as FleetMission)),
            messages: messagesDocs.map(doc => ({ ...doc, id: doc._id!.toString() } as unknown as Message)),
            npcFleetMissions: [], 
            merchantState: INITIAL_MERCHANT_STATE, 
            pirateMercenaryState: INITIAL_PIRATE_MERCENARY_STATE,
            resourceVeinBonus: updatedUser.resourceVeinBonus || INITIAL_RESOURCE_VEIN_BONUS,
            ancientArtifactState: INITIAL_ANCIENT_ARTIFACT_STATE,
            spacePlague: INITIAL_SPACE_PLAGUE_STATE,
        };
        res.json(gameState);

    } catch (error) {
        console.error('Error fetching game state:', error);
        res.status(500).json({ message: 'Server error while fetching game state.' });
    }
});

app.get('/api/galaxy/:galaxy/:system', protect, async (req: Request, res: Response) => {
    const { galaxy, system } = req.params;
    const g = parseInt(galaxy);
    const s = parseInt(system);

    if (isNaN(g) || isNaN(s) || g < 1 || s < 1 || s > 499) {
        return res.status(400).json({ message: "Invalid coordinates" });
    }
    
    try {
        const planetsInSystem = await db.collection<Planet>('planets').find({
            coordinates: { $regex: `^${g}:${s}:` }
        }).toArray();

        const userIds = planetsInSystem.map(p => p.userId);
        const usersInSystem = await db.collection<User>('users').find({ _id: { $in: userIds } }).project({ username: 1, allianceId: 1, allianceTag: 1 }).toArray();
        
        const userMap = new Map(usersInSystem.map(u => [u._id.toHexString(), u]));

        const galaxyView: GalaxyViewObject[] = Array.from({ length: 15 }, (_, i) => {
            const position = i + 1;
            const coords = `${g}:${s}:${position}`;
            const planetDoc = planetsInSystem.find(p => p.coordinates === coords);

            if (planetDoc) {
                const owner = userMap.get(planetDoc.userId.toHexString());
                return {
                    coordinates: coords,
                    type: 'player',
                    name: planetDoc.name,
                    username: owner?.username,
                    allianceId: owner?.allianceId?.toHexString(),
                    allianceTag: owner?.allianceTag
                };
            }
            return {
                coordinates: coords,
                type: 'empty',
            };
        });

        res.json(galaxyView);

    } catch (error) {
        console.error('Error fetching galaxy view:', error);
        res.status(500).json({ message: 'Server error fetching galaxy view.' });
    }
});


app.get('/api/rankings', protect, async (req: Request, res: Response) => {
    try {
        const users = db.collection<User>('users');
        const rankings = await users
            .find({})
            .sort({ points: -1 })
            .limit(100)
            .project({ username: 1, points: 1, allianceId: 1, allianceTag: 1 })
            .toArray();

        const playerRanks: PlayerRank[] = rankings.map((user, index) => ({
            rank: index + 1,
            username: user.username,
            points: Math.floor(user.points),
            allianceId: user.allianceId?.toHexString(),
            allianceTag: user.allianceTag,
        }));

        res.json(playerRanks);
    } catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({ message: 'Server error while fetching rankings.' });
    }
});

app.post('/api/queue/add', protect, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const { planetId, id, type, amount = 1 } = req.body;
        if (!planetId) return res.status(400).json({ message: "Brak ID planety." });
        
        const planets = db.collection<Planet>('planets');
        
        const planet = await planets.findOne({ _id: new ObjectId(planetId), userId: user._id });
        if (!planet) return res.status(404).json({ message: "Planeta nie znaleziona." });

        const objectInfo = ALL_GAME_OBJECTS[id as keyof typeof ALL_GAME_OBJECTS];
        if (!objectInfo) return res.status(404).json({ message: "Obiekt nie znaleziony." });
        if (!checkRequirements(objectInfo.requirements, planet.buildings, user.research)) {
            return res.status(400).json({ message: "Nie spełniasz wymagań technologicznych." });
        }
        
        let levelOrAmount: number;
        if (type === 'building') levelOrAmount = planet.buildings[id as BuildingType] + 1;
        else if (type === 'research') levelOrAmount = user.research[id as ResearchType] + 1;
        else if (type === 'ship_upgrade') levelOrAmount = user.shipLevels[id as ShipType] + 1;
        else levelOrAmount = amount;
        
        const cost = objectInfo.cost(levelOrAmount);
        const totalCost = { metal: (cost.metal || 0) * (type === 'ship' || type === 'defense' ? amount : 1), crystal: (cost.crystal || 0) * (type === 'ship' || type === 'defense' ? amount : 1), deuterium: (cost.deuterium || 0) * (type === 'ship' || type === 'defense' ? amount : 1) };

        if (planet.resources.metal < totalCost.metal || planet.resources.crystal < totalCost.crystal || planet.resources.deuterium < totalCost.deuterium) {
            return res.status(400).json({ message: "Za mało surowców!" });
        }

        const newResources = {
            metal: planet.resources.metal - totalCost.metal,
            crystal: planet.resources.crystal - totalCost.crystal,
            deuterium: planet.resources.deuterium - totalCost.deuterium,
        };

        const buildTime = objectInfo.buildTime(levelOrAmount) * ((type === 'ship' || type === 'defense') ? amount : 1);
        const now = Date.now();
        const newItem: QueueItem = { id, type, levelOrAmount, buildTime, startTime: now, endTime: now + buildTime * 1000 };
        
        const result = await planets.updateOne(
            { _id: planet._id },
            { $set: { resources: newResources }, $push: { buildQueue: newItem } }
        );
        
        if (result.modifiedCount === 1) {
             res.status(200).json({
                message: `Rozpoczęto: ${objectInfo.name}`,
                resources: newResources,
                buildQueue: [...planet.buildQueue, newItem],
            });
        } else {
            throw new Error("Failed to update planet queue");
        }
    } catch (error) {
        console.error('Error adding to queue:', error);
        res.status(500).json({ message: 'Server error while adding to queue.' });
    }
});

app.post('/api/fleet/send', protect, async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const { originPlanetId, missionFleet, targetCoords, missionType } = req.body;
        if (!originPlanetId) return res.status(400).json({ message: "Brak ID planety startowej." });
        
        const planets = db.collection<Planet>('planets');
        const fleetMissions = db.collection<FleetMission>('fleet_missions');

        const originPlanet = await planets.findOne({ _id: new ObjectId(originPlanetId), userId: user._id });
        if (!originPlanet) return res.status(404).json({ message: "Planeta startowa nie znaleziona." });

        for (const ship in missionFleet) {
            if ((originPlanet.fleet[ship as ShipType] || 0) < (missionFleet[ship as ShipType] || 0)) {
                return res.status(400).json({ message: `Niewystarczająca ilość statków typu ${SHIPYARD_DATA[ship as ShipType].name}` });
            }
        }
        
        const distance = calculateDistance(originPlanet.coordinates, targetCoords);
        const travelTimeSeconds = calculateTravelTime(distance, missionFleet, user.research, user.shipLevels, user.activeBoosts);
        if (!isFinite(travelTimeSeconds)) return res.status(400).json({ message: "Wybrana flota nie posiada napędu." });
        
        const fuelConsumption = calculateFuelConsumption(distance, missionFleet, user.research, travelTimeSeconds);
        if (originPlanet.resources.deuterium < fuelConsumption) return res.status(400).json({ message: "Niewystarczająca ilość deuteru." });

        const updates: any = { $inc: { 'resources.deuterium': -fuelConsumption } };
        for (const ship in missionFleet) {
            updates.$inc[`fleet.${ship}`] = -(missionFleet[ship as ShipType] || 0);
        }
        await planets.updateOne({ _id: originPlanet._id }, updates);
        
        const now = Date.now();
        const newMission: Omit<FleetMission, '_id'> = {
            ownerId: user._id, fleet: missionFleet, missionType, originCoords: originPlanet.coordinates, targetCoords,
            startTime: now, arrivalTime: now + travelTimeSeconds * 1000, returnTime: now + (travelTimeSeconds * 2 * 1000), 
            processedArrival: false, loot: { metal: 0, crystal: 0, deuterium: 0, credits: 0 }
        };
        await fleetMissions.insertOne(newMission as FleetMission);
        
        const updatedPlanet = await planets.findOne({ _id: originPlanet._id });
        const updatedMissions = await fleetMissions.find({ ownerId: user._id }).toArray();

        res.status(200).json({
            message: `Flota wysłana!`,
            resources: updatedPlanet?.resources, fleet: updatedPlanet?.fleet,
            fleetMissions: updatedMissions.map(doc => ({...doc, id: doc._id!.toString() } as unknown as FleetMission)),
        });

    } catch (error) {
        console.error('Error sending fleet:', error);
        res.status(500).json({ message: 'Server error while sending fleet.' });
    }
});

// Add other endpoints like /api/merchant/trade and /api/inventory/activate here,
// making sure they are protected by `protect` middleware.

app.get('/', (req: Request, res: Response) => res.send('Cosmic Lord Backend is running!'));

const masterGameLoop = async () => {
    try {
        const users = db.collection<User>('users');
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const inactiveUsers = await users.find({ lastActivity: { $lt: fiveMinutesAgo } }).toArray();

        for (const user of inactiveUsers) {
            await updatePlayerState(user._id);
        }
    } catch (error) {
        console.error("Error in master game loop:", error);
    }
};

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        setInterval(masterGameLoop, 15000);
    });
};

startServer();
