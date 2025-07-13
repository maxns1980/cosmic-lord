
import { ObjectId } from 'mongodb';

export type View = 'buildings' | 'research' | 'shipyard' | 'defense' | 'fleet' | 'messages' | 'merchant' | 'galaxy' | 'fleet_upgrades';

export enum BuildingType {
  METAL_MINE = 'METAL_MINE',
  CRYSTAL_MINE = 'CRYSTAL_MINE',
  DEUTERIUM_SYNTHESIZER = 'DEUTERIUM_SYNTHESIZER',
  SOLAR_PLANT = 'SOLAR_PLANT',
  RESEARCH_LAB = 'RESEARCH_LAB',
  SHIPYARD = 'SHIPYARD',
  METAL_STORAGE = 'METAL_STORAGE',
  CRYSTAL_STORAGE = 'CRYSTAL_STORAGE',
  DEUTERIUM_TANK = 'DEUTERIUM_TANK',
  BLACK_MARKET = 'BLACK_MARKET',
}

export enum BuildingCategory {
    RESOURCE = 'RESOURCE',
    INDUSTRIAL = 'INDUSTRIAL',
    STORAGE = 'STORAGE',
}

export enum ResearchType {
    ENERGY_TECHNOLOGY = 'ENERGY_TECHNOLOGY',
    COMPUTER_TECHNOLOGY = 'COMPUTER_TECHNOLOGY',
    WEAPON_TECHNOLOGY = 'WEAPON_TECHNOLOGY',
    COMBUSTION_DRIVE = 'COMBUSTION_DRIVE',
    SPY_TECHNOLOGY = 'SPY_TECHNOLOGY',
    IMPULSE_DRIVE = 'IMPULSE_DRIVE',
    LASER_TECHNOLOGY = 'LASER_TECHNOLOGY',
    ION_TECHNOLOGY = 'ION_TECHNOLOGY',
    PLASMA_TECHNOLOGY = 'PLASMA_TECHNOLOGY',
    ARMOR_TECHNOLOGY = 'ARMOR_TECHNOLOGY',
    SHIELDING_TECHNOLOGY = 'SHIELDING_TECHNOLOGY',
    HYPERSPACE_DRIVE = 'HYPERSPACE_DRIVE',
    ASTROPHYSICS = 'ASTROPHYSICS',
    GRAVITON_TECHNOLOGY = 'GRAVITON_TECHNOLOGY',
    AI_TECHNOLOGY = 'AI_TECHNOLOGY',
}

export enum ShipType {
    LIGHT_FIGHTER = 'LIGHT_FIGHTER',
    MEDIUM_FIGHTER = 'MEDIUM_FIGHTER',
    HEAVY_FIGHTER = 'HEAVY_FIGHTER',
    CARGO_SHIP = 'CARGO_SHIP',
    MEDIUM_CARGO_SHIP = 'MEDIUM_CARGO_SHIP',
    HEAVY_CARGO_SHIP = 'HEAVY_CARGO_SHIP',
    SPY_PROBE = 'SPY_PROBE',
    RECYCLER = 'RECYCLER',
    CRUISER = 'CRUISER',
    BATTLESHIP = 'BATTLESHIP',
    DESTROYER = 'DESTROYER',
    BOMBER = 'BOMBER',
    COLONY_SHIP = 'COLONY_SHIP',
    RESEARCH_VESSEL = 'RESEARCH_VESSEL',
    BATTLECRUISER = 'BATTLECRUISER',
    DEATHSTAR = 'DEATHSTAR',
}

export enum DefenseType {
    ROCKET_LAUNCHER = 'ROCKET_LAUNCHER',
    LIGHT_LASER_CANNON = 'LIGHT_LASER_CANNON',
    HEAVY_LASER_CANNON = 'HEAVY_LASER_CANNON',
    ION_CANNON = 'ION_CANNON',
    PLASMA_TURRET = 'PLASMA_TURRET',
}

export type GameObject = BuildingType | ResearchType | ShipType | DefenseType;

export interface Resources {
  metal: number;
  crystal: number;
  deuterium: number;
}

export type BuildingLevels = { [key in BuildingType]: number; };
export type ResearchLevels = { [key in ResearchType]: number; };
export type ShipLevels = { [key in ShipType]: number; };
export type Fleet = { [key in ShipType]?: number; };
export type Defenses = { [key in DefenseType]?: number; };

export type QueueItemType = 'building' | 'research' | 'ship' | 'defense' | 'ship_upgrade';

export interface QueueItem {
    id: GameObject;
    type: QueueItemType;
    levelOrAmount: number;
    startTime: number;
    endTime: number;
    buildTime: number;
}

export enum MissionType {
    ATTACK = 'ATTACK',
    SPY = 'SPY',
    HARVEST = 'HARVEST',
    EXPEDITION = 'EXPEDITION',
    COLONIZE = 'COLONIZE',
    EXPLORE = 'EXPLORE',
}

export interface FleetMission {
    _id?: ObjectId;
    id?: string;
    ownerId: ObjectId;
    originCoords: string;
    targetCoords: string;
    missionType: MissionType;
    fleet: Fleet;
    startTime: number;
    arrivalTime: number;
    returnTime: number;
    processedArrival: boolean;
    loot: Loot;
    explorationEndTime?: number;
    processedExploration?: boolean;
}

export interface NPCFleetMission {
    id: string;
    sourceCoords: string;
    fleet: Fleet;
    missionType: MissionType;
    startTime: number;
    arrivalTime: number;
}


export interface Loot {
    metal?: number;
    crystal?: number;
    deuterium?: number;
    credits?: number;
}

export type CombatStats = {
    attack: number;
    shield: number;
    structuralIntegrity: number;
};


// --- Message Types ---
type BaseMessage = {
    _id?: ObjectId;
    id?: string;
    recipientId: ObjectId;
    timestamp: number;
    isRead: boolean;
    subject: string;
};

export interface SpyReport {
    targetCoords: string;
    resources: Partial<Resources>;
    fleet: Partial<Fleet>;
    defenses: Partial<Defenses>;
    buildings: Partial<BuildingLevels>;
    research: Partial<ResearchLevels>;
}

export interface BattleReport {
    id: string;
    targetCoords: string;
    attackerName: string;
    defenderName: string;
    isPlayerAttacker: boolean;
    attackerFleet: Fleet;
    defenderFleet: Fleet;
    defenderDefenses: Defenses;
    attackerLosses: Partial<Fleet>;
    defenderLosses: Partial<Fleet>;
    defenderDefensesLosses: Partial<Defenses>;
    loot: Loot;
    debrisCreated: Partial<Resources>;
}

export type SpyMessage = BaseMessage & { type: 'spy'; report: SpyReport; };
export type BattleMessage = BaseMessage & { type: 'battle'; report: BattleReport; };


// --- Merchant Types ---
export enum MerchantStatus {
    INACTIVE = 'INACTIVE',
    INCOMING = 'INCOMING',
    ACTIVE = 'ACTIVE',
}

export type MerchantExchangeRates = {
    [key in keyof Resources]: { buy: number; sell: number };
};

export interface MerchantState {
    status: MerchantStatus;
    arrivalTime: number;
    departureTime: number;
    rates: MerchantExchangeRates;
}

export type MerchantInfoMessage = BaseMessage & {
    type: 'merchant';
    merchantStatus: MerchantStatus;
    eventTime: number; // Either arrival or departure time for countdown
};

export type EspionageEventMessage = BaseMessage & {
    type: 'espionage_event';
    spyCoords: string;
    spyName?: string;
};

// --- Pirate Mercenary Types ---
export enum PirateMercenaryStatus {
    INACTIVE = 'INACTIVE',
    INCOMING = 'INCOMING',
    AVAILABLE = 'AVAILABLE',
    DEPARTED = 'DEPARTED',
}

export interface PirateMercenaryState {
    status: PirateMercenaryStatus;
    fleet: Fleet;
    hireCost: number;
    arrivalTime: number;
    departureTime: number;
}

export type PirateMessage = BaseMessage & {
    type: 'pirate';
    pirateState: PirateMercenaryState;
};

// --- Asteroid Impact Event Types ---
export enum AsteroidImpactType {
    DAMAGE = 'DAMAGE',
    BONUS = 'BONUS',
}

export type AsteroidImpactMessage = BaseMessage & {
    type: 'asteroid_impact';
    impactType: AsteroidImpactType;
    details: {
        buildingId?: BuildingType;      // For DAMAGE
        newLevel?: number;              // For DAMAGE
        resourceType?: keyof Omit<Resources, 'deuterium'>; // For BONUS
        amount?: number;                // For BONUS
    }
};

// --- Resource Vein Event Types ---
export interface ResourceVeinBonus {
    active: boolean;
    resourceType: keyof Resources | null;
    endTime: number;
    bonusMultiplier: number;
}

export type ResourceVeinMessage = BaseMessage & {
    type: 'resource_vein';
    resourceType: keyof Resources;
    status: 'activated' | 'expired';
    bonusEndTime: number;
};

// --- Ancient Artifact Event Types ---
export enum AncientArtifactStatus {
    INACTIVE = 'INACTIVE',
    AWAITING_CHOICE = 'AWAITING_CHOICE',
}

export enum AncientArtifactChoice {
    STUDY = 'STUDY',
    SELL = 'SELL',
    IGNORE = 'IGNORE',
}

export interface AncientArtifactState {
    status: AncientArtifactStatus;
}

export type AncientArtifactMessage = BaseMessage & {
    type: 'ancient_artifact';
    choice: AncientArtifactChoice;
    outcome: {
        success?: boolean;          // For STUDY
        technology?: ResearchType;  // For STUDY success
        newLevel?: number;          // For STUDY success
        creditsGained?: number;       // For SELL
    }
};

// --- Space Plague Event Types ---
export interface SpacePlagueState {
    active: boolean;
    infectedShip: ShipType | null;
    endTime: number;
}

export type SpacePlagueMessage = BaseMessage & {
    type: 'space_plague';
    infectedShip: ShipType;
    status: 'activated' | 'expired';
};

// --- Offline Summary Type ---
export type OfflineSummaryMessage = BaseMessage & {
    type: 'offline_summary';
    duration: number; // in seconds
    events: string[];
};

// --- Expedition Types ---
export enum ExpeditionOutcomeType {
    FIND_RESOURCES = 'FIND_RESOURCES',
    FIND_MONEY = 'FIND_MONEY',
    FIND_FLEET = 'FIND_FLEET',
    NOTHING = 'NOTHING',
    PIRATES = 'PIRATES',
    ALIENS = 'ALIENS',
    DELAY = 'DELAY',
    LOST = 'LOST',
}

export type ExpeditionMessage = BaseMessage & {
    type: 'expedition';
    outcome: ExpeditionOutcomeType;
    details: {
        fleetSent: Fleet;
        resourcesGained?: Partial<Resources>;
        creditsGained?: number;
        fleetGained?: Partial<Fleet>;
        fleetLost?: Partial<Fleet>;
        delaySeconds?: number;
    }
};

// --- Colonization Types ---
export type ColonizationMessage = BaseMessage & {
    type: 'colonization';
    coords: string;
    success: boolean;
};

// --- Exploration Message ---
export enum ExplorationOutcomeType {
    FIND_BOOST = 'FIND_BOOST',
    FIND_RESOURCES = 'FIND_RESOURCES',
    NOTHING = 'NOTHING',
    HOSTILES = 'HOSTILES',
    FIND_SHIP_WRECK = 'FIND_SHIP_WRECK',
}

export type ExplorationMessage = BaseMessage & {
    type: 'exploration';
    outcome: ExplorationOutcomeType;
    details: {
        targetCoords: string;
        foundBoost?: Boost;
        resourcesGained?: Partial<Resources>;
        fleetLost?: Partial<Fleet>;
        fleetGained?: Partial<Fleet>;
    }
};


export type Message = SpyMessage | BattleMessage | MerchantInfoMessage | EspionageEventMessage | PirateMessage | AsteroidImpactMessage | ResourceVeinMessage | AncientArtifactMessage | SpacePlagueMessage | OfflineSummaryMessage | ExpeditionMessage | ColonizationMessage | ExplorationMessage;


// --- Boosts & Inventory ---
export enum BoostType {
    EXTRA_BUILD_QUEUE = 'EXTRA_BUILD_QUEUE',
    RESOURCE_PRODUCTION_BOOST = 'RESOURCE_PRODUCTION_BOOST',
    COMBAT_TECH_BOOST = 'COMBAT_TECH_BOOST',
    ARMOR_TECH_BOOST = 'ARMOR_TECH_BOOST',
    DRIVE_TECH_BOOST = 'DRIVE_TECH_BOOST',
    CONSTRUCTION_COST_REDUCTION = 'CONSTRUCTION_COST_REDUCTION',
    CONSTRUCTION_TIME_REDUCTION = 'CONSTRUCTION_TIME_REDUCTION',
    STORAGE_PROTECTION_BOOST = 'STORAGE_PROTECTION_BOOST',
    SECTOR_ACTIVITY_SCAN = 'SECTOR_ACTIVITY_SCAN',
    ABANDONED_COLONY_LOOT = 'ABANDONED_COLONY_LOOT',
}

export interface Boost {
    id: string;
    type: BoostType;
    level: number;
    duration: number;
}

export interface Inventory {
    boosts: Boost[];
}

export interface ActiveBoosts {
    [key: string]: { level: number; endTime: number; } | undefined;
}

// --- NPC and Galaxy Types ---
export enum NPCPersonality {
    ECONOMIC = 'ECONOMIC',
    AGGRESSIVE = 'AGGRESSIVE',
    BALANCED = 'BALANCED',
}

export interface NPCState {
    resources: Resources;
    buildings: BuildingLevels;
    research: ResearchLevels;
    fleet: Fleet;
    defenses: Defenses;
    lastUpdateTime: number;
    personality: NPCPersonality;
    name: string;
    image: string;
}

export type NPCStates = Record<string, NPCState>;
export type DebrisField = Partial<Resources>;

export interface PlayerRank {
    rank: number;
    username: string;
    points: number;
    allianceId?: string;
    allianceTag?: string;
}

// --- Alliance Types ---
export interface AllianceMember {
    userId: ObjectId;
    username: string;
    points: number;
}

export interface AllianceChatMessage {
    _id: ObjectId;
    allianceId: ObjectId;
    userId: ObjectId;
    username: string;
    message: string;
    timestamp: number;
}

export interface Alliance {
    _id: ObjectId;
    name: string;
    tag: string;
    leaderId: ObjectId;
    members: AllianceMember[];
}

export interface AllianceMemberFE {
    userId: string;
    username: string;
    points: number;
}

export interface AllianceChatMessageFE {
    id: string;
    allianceId: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
}

export interface AllianceFE {
    id: string;
    name: string;
    tag: string;
    leaderId: string;
    members: AllianceMemberFE[];
    chat?: AllianceChatMessageFE[];
}


// --- Main Database Schemas ---
export interface Planet {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    coordinates: string;
    isHomeworld: boolean;
    resources: Resources;
    buildings: BuildingLevels;
    fleet: Fleet;
    defenses: Defenses;
    buildQueue: QueueItem[];
    lastResourceUpdate: Date;
}

export interface User {
    _id: ObjectId;
    username: string;
    email: string;
    password?: string;
    createdAt: Date;
    research: ResearchLevels;
    shipLevels: ShipLevels;
    credits: number;
    inventory: Inventory;
    activeBoosts: ActiveBoosts;
    lastActivity: Date;
    points: number;
    allianceId?: ObjectId;
    allianceTag?: string;
    resourceVeinBonus?: ResourceVeinBonus; 
}

// --- Custom Request for Auth Middleware ---
// Now handled via declaration merging below


export type PlanetFE = {
  id: string; // MongoDB ObjectId as a string
  name: string;
  coordinates: string;
  isHomeworld: boolean;
  resources: Resources;
  buildings: BuildingLevels;
  fleet: Fleet;
  defenses: Defenses;
  buildQueue: QueueItem[];
  lastResourceUpdate: number;
}

// This is the full GameState that we will manage on the server
// and send to the client.
export type GameState = {
    // Global player state
    username: string;
    research: ResearchLevels;
    shipLevels: ShipLevels;
    credits: number;
    inventory: Inventory;
    activeBoosts: ActiveBoosts;
    alliance?: AllianceFE;
    
    // Per-planet state
    planets: PlanetFE[];

    // Global dynamic state
    fleetMissions: FleetMission[];
    npcFleetMissions: NPCFleetMission[];
    messages: Message[];
    merchantState: MerchantState;
    pirateMercenaryState: PirateMercenaryState;
    resourceVeinBonus: ResourceVeinBonus;
    ancientArtifactState: AncientArtifactState;
    spacePlague: SpacePlagueState;
};

export interface GalaxyViewObject {
    coordinates: string;
    type: 'player' | 'npc' | 'empty' | 'debris';
    name?: string; // planet name
    username?: string; // player name
    debris?: DebrisField;
    allianceId?: string;
    allianceTag?: string;
}

// Augment Express Request type
declare global {
    namespace Express {
        export interface Request {
            user?: User;
        }
    }
}
