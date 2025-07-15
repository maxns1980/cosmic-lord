import { ObjectId } from "mongodb";
import {
    ResearchLevels,
    ShipLevels,
    Inventory,
    ActiveBoosts,
    Resources,
    BuildingLevels,
    Fleet,
    Defenses,
    QueueItem,
    FleetMission,
    NPCFleetMission,
    Message,
    MerchantState,
    PirateMercenaryState,
    ResourceVeinBonus,
    AncientArtifactState,
    SpacePlagueState,
    NPCStates,
    DebrisField,
    Colony
} from '../../types';

// Re-exporting front-end types for consistency where applicable
export * from '../../types';

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