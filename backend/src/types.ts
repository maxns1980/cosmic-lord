
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
    // New Technologies
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
    // Capital Ships
    CRUISER = 'CRUISER',
    BATTLESHIP = 'BATTLESHIP',
    DESTROYER = 'DESTROYER',
    // Specialized Ships
    BOMBER = 'BOMBER',
    COLONY_SHIP = 'COLONY_SHIP',
    RESEARCH_VESSEL = 'RESEARCH_VESSEL',
    // End-Game Units
    BATTLECRUISER = 'BATTLECRUISER',
    DEATHSTAR = 'DEATHSTAR',
}

export enum DefenseType {
    ROCKET_LAUNCHER = 'ROCKET_LAUNCHER',
    LIGHT_LASER_CANNON = 'LIGHT_LASER_CANNON',
    // New Defenses
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

export type BuildingLevels = {
  [key in BuildingType]: number;
};

export type ResearchLevels = {
    [key in ResearchType]: number;
};

export type ShipLevels = {
    [key in ShipType]: number;
};

export type Fleet = {
    [key in ShipType]?: number;
};

export type Defenses = {
    [key in DefenseType]?: number;
};

export type QueueItemType = 'building' | 'research' | 'ship' | 'defense' | 'ship_upgrade';

export interface QueueItem {
    id: GameObject;
    type: QueueItemType;
    levelOrAmount: number; // For buildings/research it's the target level, for ships/defenses it's the amount
    startTime: number;
    endTime: number;
    buildTime: number; // total duration in seconds
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
    id: string;
    fleet: Fleet;
    missionType: MissionType;
    targetCoords: string;
    startTime: number;
    arrivalTime: number;
    returnTime: number;
    processedArrival: boolean;
    loot: Loot;
    // New fields for exploration
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

export interface SpyReport {
    targetCoords: string;
    resources: Partial<Resources>;
    fleet: Partial<Fleet>;
    defenses: Partial<Defenses>;
    buildings: Partial<BuildingLevels>;
    research: Partial<ResearchLevels>;
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

export interface BattleReport {
    id: string;
    targetCoords: string; // The coordinates where the battle took place
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


type BaseMessage = {
    id: string;
    timestamp: number;
    isRead: boolean;
    subject: string;
};

export type SpyMessage = BaseMessage & {
    type: 'spy';
    report: SpyReport;
};

export type BattleMessage = BaseMessage & {
    type: 'battle';
    report: BattleReport;
};

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
export interface Colony {
    id: string; // coords
    name: string;
    creationTime: number;
}

export type ColonizationMessage = BaseMessage & {
    type: 'colonization';
    coords: string;
    success: boolean;
};

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
    level: number; // For queue: 2 or 3. For production: 20 or 30. For tech: 1 or 2. For drive: 20. For cost reduction: 25. For time reduction: 1 or 2. For storage: 50. For scan/loot: 1.
    duration: number; // in seconds
}

export interface Inventory {
    boosts: Boost[];
}

export interface ActiveBoosts {
    [BoostType.EXTRA_BUILD_QUEUE]?: {
        level: number; // The total number of queues (e.g., 2 or 3)
        endTime: number;
    };
    [BoostType.RESOURCE_PRODUCTION_BOOST]?: {
        level: number; // The percentage boost (e.g., 20 or 30)
        endTime: number;
    };
    [BoostType.COMBAT_TECH_BOOST]?: {
        level: number; // The technology level boost (e.g., 1 or 2)
        endTime: number;
    };
    [BoostType.ARMOR_TECH_BOOST]?: {
        level: number; // The technology level boost (e.g., 1 or 2)
        endTime: number;
    };
    [BoostType.DRIVE_TECH_BOOST]?: {
        level: number; // The percentage speed boost (e.g., 20)
        endTime: number;
    };
    [BoostType.STORAGE_PROTECTION_BOOST]?: {
        level: number; // The percentage protection (e.g., 50)
        endTime: number;
    };
    [BoostType.SECTOR_ACTIVITY_SCAN]?: {
        endTime: number;
    };
}


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

export type DebrisField = Partial<Resources>;

// --- NPC Types ---
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


import { ObjectId } from "mongodb";

// --- Database Document Types ---

export interface User {
    _id?: ObjectId;
    username: string;
    email: string;
    passwordHash: string;
    planetIds: ObjectId[];
    allianceId?: ObjectId | null;
    research: ResearchLevels;
    shipLevels: ShipLevels;
    credits: number;
    inventory: Inventory;
    activeBoosts: ActiveBoosts;
    createdAt: Date;
}

export interface Planet {
    _id?: ObjectId;
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

export interface AllianceMember {
    userId: ObjectId;
    username: string;
    role: 'MEMBER' | 'LEADER' | 'CO-LEADER';
    joinedAt: Date;
}

export interface Alliance {
    _id?: ObjectId;
    name: string;
    tag: string;
    leaderId: ObjectId;
    members: AllianceMember[];
    createdAt: Date;
}

export interface AllianceChatMessage {
    _id?: ObjectId;
    allianceId: ObjectId;
    userId: ObjectId;
    username: string;
    message: string;
    timestamp: Date;
}

// --- Frontend-specific Data Structures ---
// These are versions of the data structures sent to the client,
// often with ObjectIds converted to strings.

export interface AllianceFE {
    id:string;
    name: string;
    tag: string;
    leaderId: string;
    members: {
        userId: string;
        username: string;
        role: 'MEMBER' | 'LEADER' | 'CO-LEADER';
    }[];
}

// This is the full GameState that we will manage on the server
// and send to the client.
export type GameState = {
    resources: Resources;
    buildings: BuildingLevels;
    research: ResearchLevels;
    shipLevels: ShipLevels;
    fleet: Fleet;
    defenses: Defenses;
    fleetMissions: FleetMission[];
    npcFleetMissions: NPCFleetMission[];
    messages: Message[];
    buildQueue: QueueItem[];
    credits: number;
    merchantState: MerchantState;
    pirateMercenaryState: PirateMercenaryState;
    resourceVeinBonus: ResourceVeinBonus;
    ancientArtifactState: AncientArtifactState;
    spacePlague: SpacePlagueState;
    lastSaveTime: number;
    npcStates: NPCStates;
    debrisFields: Record<string, DebrisField>;
    colonies: Colony[];
    inventory: Inventory;
    activeBoosts: ActiveBoosts;
};
