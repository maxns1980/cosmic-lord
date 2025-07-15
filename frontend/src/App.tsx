
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    BuildingType, Resources, BuildingLevels, ResearchLevels, ResearchType, Fleet, QueueItem, QueueItemType, GameObject, 
    Defenses, FleetMission, MissionType, DefenseType, ShipType, Message, SpyReport, BattleReport, Loot, 
    SpyMessage, BattleMessage, MerchantState, MerchantStatus, MerchantInfoMessage, View, NPCStates, NPCState, EspionageEventMessage, NPCFleetMission, ShipLevels, DebrisField,
    PirateMercenaryState, PirateMercenaryStatus, PirateMessage, AsteroidImpactMessage, AsteroidImpactType,
    ResourceVeinBonus, ResourceVeinMessage,
    AncientArtifactState, AncientArtifactStatus, AncientArtifactChoice, AncientArtifactMessage,
    SpacePlagueState, SpacePlagueMessage, OfflineSummaryMessage,
    ExpeditionMessage, ExpeditionOutcomeType, CombatStats,
    Colony, ColonizationMessage,
    Inventory, ActiveBoosts, BoostType, Boost, ExplorationMessage, ExplorationOutcomeType
} from './types';
import { 
    INITIAL_RESOURCES, INITIAL_BUILDING_LEVELS, INITIAL_RESEARCH_LEVELS, INITIAL_FLEET, INITIAL_DEFENSES, 
    BUILDING_DATA, RESEARCH_DATA, SHIPYARD_DATA, DEFENSE_DATA, TICK_INTERVAL, ALL_GAME_OBJECTS, INITIAL_MERCHANT_STATE, 
    NPC_STATES_KEY, INITIAL_NPC_FLEET_MISSIONS, INITIAL_SHIP_LEVELS, SHIP_UPGRADE_DATA, INITIAL_DEBRIS_FIELDS, 
    DEBRIS_FIELD_RECOVERY_RATE, PLAYER_HOME_COORDS, PROTECTED_RESOURCES_FACTOR, INITIAL_PIRATE_MERCENARY_STATE, 
    INITIAL_RESOURCE_VEIN_BONUS, INITIAL_ANCIENT_ARTIFACT_STATE, INITIAL_SPACE_PLAGUE_STATE, INITIAL_COLONIES, COLONY_INCOME_BONUS_PER_HOUR,
    INITIAL_INVENTORY, INITIAL_ACTIVE_BOOSTS
} from './constants';
import Header from './components/Header';
import BuildingsPanel from './components/BuildingsPanel';
import ResearchPanel from './components/ResearchPanel';
import ShipyardPanel from './components/ShipyardPanel';
import DefensePanel from './components/DefensePanel';
import { FleetPanel } from './components/FleetPanel';
import MessagesPanel from './components/MessagesPanel';
import { MerchantPanel } from './components/MerchantPanel';
import Navigation from './components/Navigation';
import QueuePanel from './components/QueuePanel';
import GalaxyPanel from './components/GalaxyPanel';
import FleetUpgradesPanel from './components/FleetUpgradesPanel';
import PirateMercenaryPanel from './components/PirateMercenaryPanel';
import AncientArtifactModal from './components/AncientArtifactModal';
import InfoModal from './components/InfoModal';
import EncyclopediaModal from './components/EncyclopediaModal';
import InventoryModal from './components/InventoryModal';

// --- State Persistence ---
const SAVE_GAME_KEY = 'cosmic-lord-game-state';

type GameState = {
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
    lastMerchantCheckTime: number;
    pirateMercenaryState: PirateMercenaryState;
    lastPirateCheckTime: number;
    lastAsteroidCheckTime: number;
    resourceVeinBonus: ResourceVeinBonus;
    lastResourceVeinCheckTime: number;
    ancientArtifactState: AncientArtifactState;
    lastArtifactCheckTime: number;
    spacePlague: SpacePlagueState;
    lastSpacePlagueCheckTime: number;
    lastSaveTime: number;
    npcStates: NPCStates;
    awardedBonuses: BuildingType[];
    debrisFields: Record<string, DebrisField>;
    colonies: Colony[];
    inventory: Inventory;
    activeBoosts: ActiveBoosts;
    activeCostReduction: number;
    blackMarketHourlyIncome: number;
    lastBlackMarketIncomeCheck: number;
};

const loadState = (): GameState | null => {
    try {
        const serializedState = localStorage.getItem(SAVE_GAME_KEY);
        if (serializedState === null) {
            return null;
        }
        return JSON.parse(serializedState);
    } catch (err) {
        console.error("Could not load state from localStorage", err);
        return null;
    }
};

// --- Calculation Helpers (extracted for reuse) ---
const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const formatNumber = (num: number): string => {
    return Math.floor(num).toLocaleString('pl-PL');
};

const calculateMaxResources = (buildings: BuildingLevels): Resources => {
    const metalCapacity = BUILDING_DATA[BuildingType.METAL_STORAGE].capacity?.(buildings[BuildingType.METAL_STORAGE]) ?? 0;
    const crystalCapacity = BUILDING_DATA[BuildingType.CRYSTAL_STORAGE].capacity?.(buildings[BuildingType.CRYSTAL_STORAGE]) ?? 0;
    const deuteriumCapacity = BUILDING_DATA[BuildingType.DEUTERIUM_TANK].capacity?.(buildings[BuildingType.DEUTERIUM_TANK]) ?? 0;

    return {
      metal: metalCapacity,
      crystal: crystalCapacity,
      deuterium: deuteriumCapacity,
    };
};

const calculateProductions = (buildings: BuildingLevels, resourceVeinBonus: ResourceVeinBonus, colonies: Colony[], activeBoosts: ActiveBoosts) => {
    const energyProduction = BUILDING_DATA[BuildingType.SOLAR_PLANT].production?.(buildings[BuildingType.SOLAR_PLANT]) ?? 0;
    
    const energyConsumption = (Object.keys(buildings) as BuildingType[]).reduce((total, type) => {
        const buildingInfo = BUILDING_DATA[type as BuildingType];
        if (buildings[type as BuildingType] > 0) {
           return total + (buildingInfo.energyConsumption?.(buildings[type as BuildingType]) ?? 0);
        }
        return total;
    }, 0);
    
    const efficiency = energyProduction >= energyConsumption ? 1 : Math.max(0, energyProduction / energyConsumption);
    
    let metalProd = (BUILDING_DATA[BuildingType.METAL_MINE].production?.(buildings[BuildingType.METAL_MINE]) ?? 0) * efficiency;
    let crystalProd = (BUILDING_DATA[BuildingType.CRYSTAL_MINE].production?.(buildings[BuildingType.CRYSTAL_MINE]) ?? 0) * efficiency;
    let deuteriumProd = (BUILDING_DATA[BuildingType.DEUTERIUM_SYNTHESIZER].production?.(buildings[BuildingType.DEUTERIUM_SYNTHESIZER]) ?? 0) * efficiency;

    if (resourceVeinBonus.active && resourceVeinBonus.resourceType) {
        if (resourceVeinBonus.resourceType === 'metal') {
            metalProd *= resourceVeinBonus.bonusMultiplier;
        } else if (resourceVeinBonus.resourceType === 'crystal') {
            crystalProd *= resourceVeinBonus.bonusMultiplier;
        } else if (resourceVeinBonus.resourceType === 'deuterium') {
            deuteriumProd *= resourceVeinBonus.bonusMultiplier;
        }
    }

    if (activeBoosts[BoostType.RESOURCE_PRODUCTION_BOOST]) {
        const boostPercent = activeBoosts[BoostType.RESOURCE_PRODUCTION_BOOST]!.level / 100;
        metalProd *= (1 + boostPercent);
        crystalProd *= (1 + boostPercent);
        deuteriumProd *= (1 + boostPercent);
    }

    const colonyCount = colonies.length;
    metalProd += colonyCount * COLONY_INCOME_BONUS_PER_HOUR.metal;
    crystalProd += colonyCount * COLONY_INCOME_BONUS_PER_HOUR.crystal;
    deuteriumProd += colonyCount * COLONY_INCOME_BONUS_PER_HOUR.deuterium;

    return {
        metal: metalProd,
        crystal: crystalProd,
        deuterium: deuteriumProd,
        energy: { produced: energyProduction, consumed: energyConsumption, efficiency: efficiency }
    };
};

const getUnitsCost = (units: Partial<Fleet | Defenses>): Resources => {
    let cost: Resources = { metal: 0, crystal: 0, deuterium: 0 };
    for (const [unitId, count] of Object.entries(units)) {
        if (!count || count === 0) continue;
        const unitData = ALL_GAME_OBJECTS[unitId as keyof typeof ALL_GAME_OBJECTS];
        const unitCost = unitData.cost(1);
        cost.metal += unitCost.metal * count;
        cost.crystal += unitCost.crystal * count;
        cost.deuterium += (unitCost.deuterium || 0) * count;
    }
    return cost;
}

const getFleetValue = (fleet: Fleet, shipLevels: ShipLevels): number => {
    let value = 0;
    for (const [shipId, count] of Object.entries(fleet)) {
        if (!count || count === 0) continue;
        const shipData = SHIPYARD_DATA[shipId as ShipType];
        const shipLevel = shipLevels[shipId as ShipType] || 0;
        const cost = shipData.cost(1);
        const shipValue = (cost.metal + cost.crystal + cost.deuterium) * (1 + shipLevel * 0.1);
        value += shipValue * count;
    }
    return value;
};

const calculateCombatStats = (
    baseStats: CombatStats,
    research: ResearchLevels,
    activeBoosts: ActiveBoosts,
    upgradeLevel: number = 0,
    isPlagued: boolean = false
): CombatStats => {
    const weaponTechLevel = (research[ResearchType.WEAPON_TECHNOLOGY] || 0) + (activeBoosts[BoostType.COMBAT_TECH_BOOST]?.level || 0);
    const armorTechLevel = (research[ResearchType.ARMOR_TECHNOLOGY] || 0) + (activeBoosts[BoostType.ARMOR_TECH_BOOST]?.level || 0);
    
    let finalAttack = baseStats.attack * (1 + weaponTechLevel * 0.1) * (1 + upgradeLevel * 0.1);
    if (isPlagued) {
        finalAttack *= 0.8;
    }

    const finalShield = baseStats.shield * (1 + (research[ResearchType.SHIELDING_TECHNOLOGY] || 0) * 0.1) * (1 + upgradeLevel * 0.1);
    const finalStructuralIntegrity = baseStats.structuralIntegrity * (1 + armorTechLevel * 0.1) * (1 + upgradeLevel * 0.1);

    return {
        attack: finalAttack,
        shield: finalShield,
        structuralIntegrity: finalStructuralIntegrity,
    };
};

const calculateTotalPower = (
    units: Fleet | Defenses, 
    research: ResearchLevels, 
    shipLevels: ShipLevels | null, // null for defenses
    spacePlague?: SpacePlagueState,
    activeBoosts: ActiveBoosts = {}
): number => {
    let totalPower = 0;
    for (const [unitId, count] of Object.entries(units)) {
        if (!count || count <= 0) continue;
        const unitData = ALL_GAME_OBJECTS[unitId as keyof typeof ALL_GAME_OBJECTS];
        
        // Type guard to ensure we are dealing with a combat unit
        if (!('attack' in unitData)) {
            continue;
        }

        const isShip = "cargoCapacity" in unitData;

        const upgradeLevel = (isShip && shipLevels) ? shipLevels[unitId as ShipType] || 0 : 0;
        const isPlagued = (isShip && spacePlague) ? spacePlague.active && spacePlague.infectedShip === unitId : false;

        const finalStats = calculateCombatStats(unitData, research, activeBoosts, upgradeLevel, isPlagued);
        
        const unitPower = finalStats.attack + finalStats.shield + (finalStats.structuralIntegrity / 10);
        totalPower += unitPower * count;
    }
    return totalPower;
};


// --- EXPEDITION LOGIC ---
const processExpeditionOutcome = (mission: FleetMission, shipLevels: ShipLevels): { message: ExpeditionMessage, finalFleet: Fleet, finalLoot: Loot } => {
    const fleetValue = getFleetValue(mission.fleet, shipLevels);
    const rand = Math.random();

    let outcome: ExpeditionOutcomeType;
    const details: ExpeditionMessage['details'] = { fleetSent: mission.fleet };
    let finalFleet: Fleet = { ...mission.fleet };
    let finalLoot: Loot = {};

    if (rand < 0.15) { // 15% find resources
        outcome = ExpeditionOutcomeType.FIND_RESOURCES;
        const resourceGain = {
            metal: Math.floor(Math.random() * fleetValue * 0.1),
            crystal: Math.floor(Math.random() * fleetValue * 0.05),
            deuterium: Math.floor(Math.random() * fleetValue * 0.02),
        };
        details.resourcesGained = resourceGain;
        finalLoot = { ...finalLoot, ...resourceGain };
    } else if (rand < 0.20) { // 5% find credits
        outcome = ExpeditionOutcomeType.FIND_MONEY;
        const creditsGained = Math.floor(fleetValue * 0.2 + Math.random() * 5000);
        details.creditsGained = creditsGained;
        finalLoot = { ...finalLoot, credits: creditsGained };
    } else if (rand < 0.25) { // 5% find fleet
        outcome = ExpeditionOutcomeType.FIND_FLEET;
        const foundFleet: Fleet = {};
        if (Math.random() < 0.5) foundFleet[ShipType.LIGHT_FIGHTER] = Math.ceil(fleetValue / 20000);
        else foundFleet[ShipType.CARGO_SHIP] = Math.ceil(fleetValue / 30000);
        details.fleetGained = foundFleet;
        for (const ship in foundFleet) {
            finalFleet[ship as ShipType] = (finalFleet[ship as ShipType] || 0) + (foundFleet[ship as ShipType] || 0);
        }
    } else if (rand < 0.50) { // 25% nothing
        outcome = ExpeditionOutcomeType.NOTHING;
    } else if (rand < 0.65) { // 15% pirates
        outcome = ExpeditionOutcomeType.PIRATES;
        const lossPercent = 0.1 + Math.random() * 0.2; // 10-30% loss
        details.fleetLost = {};
        for (const ship in finalFleet) {
            const losses = Math.ceil((finalFleet[ship as ShipType] || 0) * lossPercent);
            if (losses > 0) {
                details.fleetLost[ship as ShipType] = losses;
                finalFleet[ship as ShipType] = (finalFleet[ship as ShipType] || 0) - losses;
                if (finalFleet[ship as ShipType]! < 0) finalFleet[ship as ShipType] = 0;
            }
        }
    } else if (rand < 0.75) { // 10% aliens
        outcome = ExpeditionOutcomeType.ALIENS;
        const lossPercent = 0.2 + Math.random() * 0.4; // 20-60% loss
        details.fleetLost = {};
         for (const ship in finalFleet) {
            const losses = Math.ceil((finalFleet[ship as ShipType] || 0) * lossPercent);
            if (losses > 0) {
                details.fleetLost[ship as ShipType] = losses;
                finalFleet[ship as ShipType] = (finalFleet[ship as ShipType] || 0) - losses;
                 if (finalFleet[ship as ShipType]! < 0) finalFleet[ship as ShipType] = 0;
            }
        }
    } else if (rand < 0.90) { // 15% delay
        outcome = ExpeditionOutcomeType.DELAY;
        details.delaySeconds = 30 * 60 + Math.random() * 60 * 60; // 30-90 min delay
        // Note: Actual delay is handled by extending return time, this is for the message
    } else { // 10% lost
        outcome = ExpeditionOutcomeType.LOST;
        details.fleetLost = { ...finalFleet };
        finalFleet = {};
    }

    const message: ExpeditionMessage = {
        id: `msg-${Date.now()}-exp`,
        type: 'expedition',
        timestamp: Date.now(),
        isRead: false,
        subject: `Raport z Wyprawy [${mission.targetCoords}]`,
        outcome,
        details,
    };

    return { message, finalFleet, finalLoot };
};

const getBoostNameForNotif = (boost: Omit<Boost, 'id' | 'duration'>) => {
    switch(boost.type) {
        case BoostType.EXTRA_BUILD_QUEUE: return `Dodatkowa kolejka budowy (${boost.level})`;
        case BoostType.RESOURCE_PRODUCTION_BOOST: return `Produkcja +${boost.level}%`;
        case BoostType.COMBAT_TECH_BOOST: return `Kalibracja Broni Polowej (+${boost.level})`;
        case BoostType.ARMOR_TECH_BOOST: return `Wzmocnienie Pancerza (+${boost.level})`;
        case BoostType.DRIVE_TECH_BOOST: return `Przeciążenie Napędu (+${boost.level}%)`;
        case BoostType.STORAGE_PROTECTION_BOOST: return `Moduł Ochronny Magazynów (${boost.level}%)`;
        case BoostType.SECTOR_ACTIVITY_SCAN: return 'Skan Aktywności Sektora';
        default: return 'Nieznany bonus';
    }
}

function App() {
  const savedState = useMemo(() => loadState(), []);

  const [resources, setResources] = useState<Resources>(savedState?.resources ?? INITIAL_RESOURCES);
  const [buildings, setBuildings] = useState<BuildingLevels>(savedState?.buildings ?? INITIAL_BUILDING_LEVELS);
  const [research, setResearch] = useState<ResearchLevels>(savedState?.research ?? INITIAL_RESEARCH_LEVELS);
  const [shipLevels, setShipLevels] = useState<ShipLevels>(savedState?.shipLevels ?? INITIAL_SHIP_LEVELS);
  const [fleet, setFleet] = useState<Fleet>(savedState?.fleet ?? INITIAL_FLEET);
  const [defenses, setDefenses] = useState<Defenses>(savedState?.defenses ?? INITIAL_DEFENSES);
  const [colonies, setColonies] = useState<Colony[]>(savedState?.colonies ?? INITIAL_COLONIES);
  const [fleetMissions, setFleetMissions] = useState<FleetMission[]>(savedState?.fleetMissions ?? []);
  const [npcFleetMissions, setNpcFleetMissions] = useState<NPCFleetMission[]>(savedState?.npcFleetMissions ?? INITIAL_NPC_FLEET_MISSIONS);
  const [messages, setMessages] = useState<Message[]>(savedState?.messages ?? []);
  const [buildQueue, setBuildQueue] = useState<QueueItem[]>(savedState?.buildQueue ?? []);
  const [credits, setCredits] = useState<number>(savedState?.credits ?? 10000);
  const [merchantState, setMerchantState] = useState<MerchantState>(savedState?.merchantState ?? INITIAL_MERCHANT_STATE);
  const [lastMerchantCheckTime, setLastMerchantCheckTime] = useState<number>(savedState?.lastMerchantCheckTime ?? Date.now());
  const [pirateMercenaryState, setPirateMercenaryState] = useState<PirateMercenaryState>(savedState?.pirateMercenaryState ?? INITIAL_PIRATE_MERCENARY_STATE);
  const [lastPirateCheckTime, setLastPirateCheckTime] = useState<number>(savedState?.lastPirateCheckTime ?? Date.now());
  const [lastAsteroidCheckTime, setLastAsteroidCheckTime] = useState<number>(savedState?.lastAsteroidCheckTime ?? Date.now());
  const [resourceVeinBonus, setResourceVeinBonus] = useState<ResourceVeinBonus>(savedState?.resourceVeinBonus ?? INITIAL_RESOURCE_VEIN_BONUS);
  const [lastResourceVeinCheckTime, setLastResourceVeinCheckTime] = useState<number>(savedState?.lastResourceVeinCheckTime ?? Date.now());
  const [ancientArtifactState, setAncientArtifactState] = useState<AncientArtifactState>(savedState?.ancientArtifactState ?? INITIAL_ANCIENT_ARTIFACT_STATE);
  const [lastArtifactCheckTime, setLastArtifactCheckTime] = useState<number>(savedState?.lastArtifactCheckTime ?? Date.now());
  const [spacePlague, setSpacePlague] = useState<SpacePlagueState>(savedState?.spacePlague ?? INITIAL_SPACE_PLAGUE_STATE);
  const [lastSpacePlagueCheckTime, setLastSpacePlagueCheckTime] = useState<number>(savedState?.lastSpacePlagueCheckTime ?? Date.now());
  const [inventory, setInventory] = useState<Inventory>(savedState?.inventory ?? INITIAL_INVENTORY);
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoosts>(savedState?.activeBoosts ?? INITIAL_ACTIVE_BOOSTS);
  const [activeCostReduction, setActiveCostReduction] = useState<number>(savedState?.activeCostReduction ?? 0);
  const [blackMarketHourlyIncome, setBlackMarketHourlyIncome] = useState<number>(savedState?.blackMarketHourlyIncome ?? 0);
  const [lastBlackMarketIncomeCheck, setLastBlackMarketIncomeCheck] = useState<number>(savedState?.lastBlackMarketIncomeCheck ?? Date.now());
  const [notification, setNotification] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>('buildings');
  const [fleetTarget, setFleetTarget] = useState<{coords: string, mission: MissionType} | null>(null);
  const [npcStates, setNpcStates] = useState<NPCStates>(savedState?.npcStates ?? {});
  const [awardedBonuses, setAwardedBonuses] = useState<BuildingType[]>(savedState?.awardedBonuses ?? []);
  const [debrisFields, setDebrisFields] = useState<Record<string, DebrisField>>(savedState?.debrisFields ?? INITIAL_DEBRIS_FIELDS);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const maxResources = useMemo(() => calculateMaxResources(buildings), [buildings]);
  const productions = useMemo(() => calculateProductions(buildings, resourceVeinBonus, colonies, activeBoosts), [buildings, resourceVeinBonus, colonies, activeBoosts]);

  // Effect for Saving State to localStorage
  useEffect(() => {
    const gameState: GameState = {
        resources,
        buildings,
        research,
        shipLevels,
        fleet,
        defenses,
        fleetMissions,
        npcFleetMissions,
        messages,
        buildQueue,
        credits,
        merchantState,
        lastMerchantCheckTime,
        pirateMercenaryState,
        lastPirateCheckTime,
        lastAsteroidCheckTime,
        resourceVeinBonus,
        lastResourceVeinCheckTime,
        ancientArtifactState,
        lastArtifactCheckTime,
        spacePlague,
        lastSpacePlagueCheckTime,
        lastSaveTime: Date.now(),
        npcStates,
        awardedBonuses,
        debrisFields,
        colonies,
        inventory,
        activeBoosts,
        activeCostReduction,
        blackMarketHourlyIncome,
        lastBlackMarketIncomeCheck,
    };
    try {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameState));
    } catch (err) {
        console.error("Could not save state", err);
    }
  }, [resources, buildings, research, shipLevels, fleet, defenses, fleetMissions, npcFleetMissions, messages, buildQueue, credits, merchantState, lastMerchantCheckTime, pirateMercenaryState, lastPirateCheckTime, lastAsteroidCheckTime, resourceVeinBonus, lastResourceVeinCheckTime, ancientArtifactState, lastArtifactCheckTime, spacePlague, lastSpacePlagueCheckTime, npcStates, awardedBonuses, debrisFields, colonies, inventory, activeBoosts, activeCostReduction, blackMarketHourlyIncome, lastBlackMarketIncomeCheck]);

  // Effect for Offline Progress Calculation (runs once on mount)
  useEffect(() => {
    if (savedState) {
        const offlineTimeMs = Date.now() - savedState.lastSaveTime;
        if (offlineTimeMs < 5000) return; // Ignore short offline periods

        const offlineSeconds = Math.floor(offlineTimeMs / 1000);
        showNotification(`Przetwarzanie postępu offline (${formatTime(offlineSeconds)})...`);

        let simState: GameState = JSON.parse(JSON.stringify(savedState));
        const offlineEvents: string[] = [];
        let simBlackMarketIncome = simState.blackMarketHourlyIncome || 0;

        // Simulate tick by tick
        for (let i = 0; i < offlineSeconds; i++) {
            const now = simState.lastSaveTime + (i + 1) * 1000;
            const simProductions = calculateProductions(simState.buildings, simState.resourceVeinBonus, simState.colonies, simState.activeBoosts);
            const simMaxResources = calculateMaxResources(simState.buildings);

            // --- Apply 1 second of production ---
            simState.resources.metal = Math.min(simMaxResources.metal, simState.resources.metal + simProductions.metal / 3600);
            simState.resources.crystal = Math.min(simMaxResources.crystal, simState.resources.crystal + simProductions.crystal / 3600);
            simState.resources.deuterium = Math.min(simMaxResources.deuterium, simState.resources.deuterium + simProductions.deuterium / 3600);
            
            // Black Market Income Simulation
            if (now - simState.lastBlackMarketIncomeCheck >= 3600 * 1000) {
                simState.lastBlackMarketIncomeCheck = now;
                const blackMarketLevel = simState.buildings[BuildingType.BLACK_MARKET];
                if (blackMarketLevel > 0) {
                    const minIncome = 50 * Math.pow(1.1, blackMarketLevel - 1);
                    const maxIncome = 200 * Math.pow(1.1, blackMarketLevel - 1);
                    simBlackMarketIncome = minIncome + Math.random() * (maxIncome - minIncome);
                    offlineEvents.push(`💹 Stawka Czarnego Rynku zaktualizowana do ${formatNumber(simBlackMarketIncome)}/h.`);
                } else {
                    simBlackMarketIncome = 0;
                }
            }
            simState.credits += simBlackMarketIncome / 3600;

            // --- Process build queue ---
            const newlyCompleted = simState.buildQueue.filter((item: QueueItem) => now >= item.endTime);
            if (newlyCompleted.length > 0) {
                newlyCompleted.forEach((item: QueueItem) => {
                    const info = ALL_GAME_OBJECTS[item.id as keyof typeof ALL_GAME_OBJECTS];
                    offlineEvents.push(`✅ Ukończono: ${info.name} ${item.type.match(/ship|defense/) ? 'zbudowano' : `poz. ${item.levelOrAmount}`}`);
                    if (item.type === 'building') simState.buildings[item.id as BuildingType] = item.levelOrAmount;
                    else if (item.type === 'research') simState.research[item.id as ResearchType] = item.levelOrAmount;
                    else if (item.type === 'ship_upgrade') simState.shipLevels[item.id as ShipType] = item.levelOrAmount;
                    else if (item.type === 'ship') simState.fleet[item.id as ShipType] = (simState.fleet[item.id as ShipType] || 0) + item.levelOrAmount;
                    else if (item.type === 'defense') simState.defenses[item.id as DefenseType] = (simState.defenses[item.id as DefenseType] || 0) + item.levelOrAmount;
                });
                simState.buildQueue = simState.buildQueue.filter((item: QueueItem) => now < item.endTime);
            }
            
            // --- Process fleet missions ---
            const activeMissions: FleetMission[] = [];
            simState.fleetMissions.forEach((mission: FleetMission) => {
                if (now >= mission.arrivalTime && mission.missionType === MissionType.COLONIZE) {
                    simState.colonies.push({ id: mission.targetCoords, name: `Kolonia ${mission.targetCoords}`, creationTime: now });
                    offlineEvents.push(`🌍 Pomyślnie skolonizowano [${mission.targetCoords}]!`);
                    // Colonization mission is one-way, it does not return.
                } else if (now >= mission.returnTime) { // Fleet returns
                    if (mission.missionType === MissionType.EXPEDITION) {
                        const { message, finalFleet, finalLoot } = processExpeditionOutcome(mission, simState.shipLevels);
                         offlineEvents.push(`🚀 Wyprawa na [${mission.targetCoords}] zakończona. Otrzymano raport.`);
                         simState.messages.unshift(message);
                         for (const ship in finalFleet) {
                            simState.fleet[ship as ShipType] = (simState.fleet[ship as ShipType] || 0) + (finalFleet[ship as ShipType] || 0);
                        }
                        if (finalLoot) {
                            simState.resources.metal = Math.min(simMaxResources.metal, simState.resources.metal + (finalLoot.metal || 0));
                            simState.resources.crystal = Math.min(simMaxResources.crystal, simState.resources.crystal + (finalLoot.crystal || 0));
                            simState.resources.deuterium = Math.min(simMaxResources.deuterium, simState.resources.deuterium + (finalLoot.deuterium || 0));
                            simState.credits += finalLoot.credits || 0;
                        }
                    } else {
                        offlineEvents.push(`🚀 Flota powróciła z misji [${mission.targetCoords}].`);
                        for (const ship in mission.fleet) {
                            simState.fleet[ship as ShipType] = (simState.fleet[ship as ShipType] || 0) + (mission.fleet[ship as ShipType] || 0);
                        }
                        if (mission.loot) {
                            simState.resources.metal = Math.min(simMaxResources.metal, simState.resources.metal + (mission.loot.metal || 0));
                            simState.resources.crystal = Math.min(simMaxResources.crystal, simState.resources.crystal + (mission.loot.crystal || 0));
                            simState.resources.deuterium = Math.min(simMaxResources.deuterium, simState.resources.deuterium + (mission.loot.deuterium || 0));
                            simState.credits += mission.loot.credits || 0;
                        }
                    }
                } else {
                    activeMissions.push(mission);
                }
            });
            simState.fleetMissions = activeMissions;

            // --- EVENT CHECKS (run every simulated hour for performance) ---
            if (i % 3600 === 0) {
                 // Merchant check
                if (now - simState.lastMerchantCheckTime > 6 * 3600 * 1000) {
                    simState.lastMerchantCheckTime = now;
                    if (simState.merchantState.status === MerchantStatus.INACTIVE && Math.random() < 0.35) {
                        simState.merchantState = { ...simState.merchantState, status: MerchantStatus.INCOMING, arrivalTime: now + 5 * 3600 * 1000 };
                        offlineEvents.push("💰 Wykryto sygnaturę kupca!");
                    }
                }
                // Pirate check
                if (now - simState.lastPirateCheckTime > 8 * 3600 * 1000) {
                    simState.lastPirateCheckTime = now;
                    if (simState.pirateMercenaryState.status === PirateMercenaryStatus.INACTIVE && Math.random() < 0.5) {
                         simState.pirateMercenaryState = { ...simState.pirateMercenaryState, status: PirateMercenaryStatus.INCOMING, arrivalTime: now + 3 * 3600 * 1000 };
                         offlineEvents.push("🏴‍☠️ Wykryto sygnał od najemników!");
                    }
                }
                // Asteroid check
                 if (now - simState.lastAsteroidCheckTime > 12 * 3600 * 1000) {
                    simState.lastAsteroidCheckTime = now;
                    if (Math.random() < 0.25) { // 25% chance
                        if (Math.random() < 0.5) { // Damage
                            const built = (Object.keys(simState.buildings) as BuildingType[]).filter(b => simState.buildings[b as BuildingType] > 0);
                            if(built.length > 0) {
                                const hit = built[Math.floor(Math.random() * built.length)];
                                simState.buildings[hit as BuildingType] = Math.max(0, simState.buildings[hit as BuildingType] - 1);
                                offlineEvents.push(`💥 Asteroida uszkodziła budynek: ${BUILDING_DATA[hit as BuildingType].name}!`);
                            }
                        } else { // Bonus
                            const type = Math.random() < 0.5 ? 'metal' : 'crystal';
                            const amount = Math.floor(5000 + Math.random() * 10000);
                            simState.resources[type] = Math.min(simMaxResources[type], simState.resources[type] + amount);
                            offlineEvents.push(`🌠 Deszcz meteorytów! +${formatNumber(amount)} ${type === 'metal' ? 'metalu' : 'kryształu'}!`);
                        }
                    }
                }
                // ... other hourly checks
            }

            // --- EVENT STATE MACHINES (run every tick) ---
            // Merchant
            if (simState.merchantState.status === MerchantStatus.INCOMING && now >= simState.merchantState.arrivalTime) {
                simState.merchantState = { ...simState.merchantState, status: MerchantStatus.ACTIVE, departureTime: now + 2 * 3600 * 1000 };
                offlineEvents.push("💰 Kupiec przybył.");
            } else if (simState.merchantState.status === MerchantStatus.ACTIVE && now >= simState.merchantState.departureTime) {
                simState.merchantState = { ...simState.merchantState, status: MerchantStatus.INACTIVE };
                offlineEvents.push("💰 Kupiec odleciał.");
            }
            // Pirates
            if (simState.pirateMercenaryState.status === PirateMercenaryStatus.INCOMING && now >= simState.pirateMercenaryState.arrivalTime) {
                simState.pirateMercenaryState = { ...simState.pirateMercenaryState, status: PirateMercenaryStatus.AVAILABLE, departureTime: now + 1 * 3600 * 1000 };
                offlineEvents.push("🏴‍☠️ Najemnicy przybyli z ofertą.");
            } else if (simState.pirateMercenaryState.status === PirateMercenaryStatus.AVAILABLE && now >= simState.pirateMercenaryState.departureTime) {
                simState.pirateMercenaryState = { ...INITIAL_PIRATE_MERCENARY_STATE, status: PirateMercenaryStatus.DEPARTED };
                offlineEvents.push("🏴‍☠️ Najemnicy odlecieli.");
            }
            // Resource Vein
            if (simState.resourceVeinBonus.active && now >= simState.resourceVeinBonus.endTime) {
                offlineEvents.push(`✨ Premia do wydobycia ${simState.resourceVeinBonus.resourceType} wygasła.`);
                simState.resourceVeinBonus = INITIAL_RESOURCE_VEIN_BONUS;
            }
            // Space Plague
            if (simState.spacePlague.active && now >= simState.spacePlague.endTime) {
                offlineEvents.push(`🦠 Zaraza na statkach ${SHIPYARD_DATA[simState.spacePlague.infectedShip!].name} została zwalczona.`);
                simState.spacePlague = INITIAL_SPACE_PLAGUE_STATE;
            }
        }
        
        // --- After Loop: Finalize and Apply State ---
        const summaryMessage: OfflineSummaryMessage = {
            id: `msg-${Date.now()}-offline`, type: 'offline_summary', timestamp: Date.now(), isRead: false,
            subject: 'Podsumowanie Offline',
            duration: offlineSeconds,
            events: offlineEvents,
        };
        simState.messages.unshift(summaryMessage);

        setResources(simState.resources);
        setBuildings(simState.buildings);
        setResearch(simState.research);
        setShipLevels(simState.shipLevels);
        setFleet(simState.fleet);
        setDefenses(simState.defenses);
        setFleetMissions(simState.fleetMissions);
        setNpcFleetMissions(simState.npcFleetMissions);
        setMessages(simState.messages);
        setBuildQueue(simState.buildQueue);
        setCredits(simState.credits);
        setMerchantState(simState.merchantState);
        setLastMerchantCheckTime(simState.lastMerchantCheckTime);
        setPirateMercenaryState(simState.pirateMercenaryState);
        setLastPirateCheckTime(simState.lastPirateCheckTime);
        setLastAsteroidCheckTime(simState.lastAsteroidCheckTime);
        setResourceVeinBonus(simState.resourceVeinBonus);
        setLastResourceVeinCheckTime(simState.lastResourceVeinCheckTime);
        setAncientArtifactState(simState.ancientArtifactState);
        setLastArtifactCheckTime(simState.lastArtifactCheckTime);
        setSpacePlague(simState.spacePlague);
        setLastSpacePlagueCheckTime(simState.lastSpacePlagueCheckTime);
        setNpcStates(simState.npcStates);
        setAwardedBonuses(simState.awardedBonuses);
        setDebrisFields(simState.debrisFields);
        setColonies(simState.colonies);
        setInventory(simState.inventory);
        setActiveBoosts(simState.activeBoosts);
        setActiveCostReduction(simState.activeCostReduction);
        setBlackMarketHourlyIncome(simBlackMarketIncome);
        setLastBlackMarketIncomeCheck(simState.lastBlackMarketIncomeCheck);

        showNotification(`Witaj z powrotem! Przetworzono postęp z ${formatTime(offlineSeconds)}.`);
    }
  }, []); // Eslint-disable-line react-hooks/exhaustive-deps - this must run only once on mount
  
  const handleArtifactChoice = useCallback((choice: AncientArtifactChoice) => {
    const now = Date.now();
    let newMessage: AncientArtifactMessage | null = null;
    
    switch (choice) {
        case AncientArtifactChoice.STUDY: {
            const cost = { credits: 5000, crystal: 2000 };
            if (credits >= cost.credits && resources.crystal >= cost.crystal) {
                setCredits(c => c - cost.credits);
                setResources(r => ({ ...r, crystal: r.crystal - cost.crystal }));

                if (Math.random() < 0.5) { // Success
                    const availableResearch = (Object.keys(research) as ResearchType[]).filter(r => (research[r] || 0) < 10); // cap at 10 for safety
                    if (availableResearch.length > 0) {
                        const techToUpgrade = availableResearch[Math.floor(Math.random() * availableResearch.length)];
                        const newLevel = (research[techToUpgrade] || 0) + 1;
                        setResearch(r => ({ ...r, [techToUpgrade]: newLevel }));
                        
                        const techName = RESEARCH_DATA[techToUpgrade].name;
                        showNotification(`Przełom! Zbadanie artefaktu ulepszyło ${techName} do poz. ${newLevel}!`);
                        newMessage = {
                            id: `msg-${now}-artifact`, type: 'ancient_artifact', timestamp: now, isRead: false,
                            subject: 'Sukces badawczy artefaktu',
                            choice,
                            outcome: { success: true, technology: techToUpgrade, newLevel }
                        };
                    } else { // All research maxed out
                         showNotification("Artefakt rezonuje z Twoją wiedzą, ale nie może już niczego ulepszyć.");
                         newMessage = {
                             id: `msg-${now}-artifact`, type: 'ancient_artifact', timestamp: now, isRead: false,
                             subject: 'Artefakt zbadany - bez efektu',
                             choice,
                             outcome: { success: false }
                         };
                    }
                } else { // Failure
                    showNotification("Niestety, artefakt okazał się bezwartościową bryłą metalu. Stracono surowce.");
                    newMessage = {
                        id: `msg-${now}-artifact`, type: 'ancient_artifact', timestamp: now, isRead: false,
                        subject: 'Porażka badawcza artefaktu',
                        choice,
                        outcome: { success: false }
                    };
                }
            } else {
                showNotification("Za mało surowców by zbadać artefakt!");
                return; // Don't close modal if can't afford
            }
            break;
        }
        case AncientArtifactChoice.SELL: {
            const creditsGained = 10000;
            setCredits(c => c + creditsGained);
            showNotification(`Sprzedano artefakt za ${formatNumber(creditsGained)} kredytów.`);
            newMessage = {
                id: `msg-${now}-artifact`, type: 'ancient_artifact', timestamp: now, isRead: false,
                subject: 'Sprzedano artefakt obcych',
                choice,
                outcome: { creditsGained }
            };
            break;
        }
        case AncientArtifactChoice.IGNORE: {
            showNotification("Postanowiono zignorować artefakt.");
             newMessage = {
                id: `msg-${now}-artifact`, type: 'ancient_artifact', timestamp: now, isRead: false,
                subject: 'Zignorowano artefakt',
                choice,
                outcome: {}
            };
            break;
        }
    }

    if (newMessage) {
        setMessages(m => [newMessage, ...m]);
    }
    setAncientArtifactState({ status: AncientArtifactStatus.INACTIVE });

}, [credits, resources, research, showNotification]);

const handleActivateBoost = useCallback((boostId: string) => {
    const boostToActivate = inventory.boosts.find(b => b.id === boostId);
    if (!boostToActivate) return;

    // Handle one-time boosts first
    if (boostToActivate.type === BoostType.CONSTRUCTION_COST_REDUCTION) {
        if (activeCostReduction > 0) {
            showNotification("Zniżka na budowę jest już aktywna!");
            return;
        }
        setInventory(prev => ({ ...prev, boosts: prev.boosts.filter(b => b.id !== boostId) }));
        setActiveCostReduction(boostToActivate.level);
        showNotification(`Aktywowano zniżkę ${boostToActivate.level}% na następną budowę/badanie!`);
        setIsInventoryOpen(false);
        return;
    }

    if (boostToActivate.type === BoostType.CONSTRUCTION_TIME_REDUCTION) {
        const queueToReduce = buildQueue[0];
        if (!queueToReduce) {
            showNotification("Brak aktywnej budowy lub badania do skrócenia!");
            return; // Don't consume boost if unusable
        }
        setInventory(prev => ({ ...prev, boosts: prev.boosts.filter(b => b.id !== boostId) }));
        const timeReductionSeconds = boostToActivate.level * 3600;
        setBuildQueue(prev => {
            const newQueue = [...prev];
            newQueue[0] = { ...newQueue[0], endTime: newQueue[0].endTime - timeReductionSeconds * 1000 };
            return newQueue;
        });
        showNotification(`Skrócono czas budowy o ${boostToActivate.level}h!`);
        setIsInventoryOpen(false);
        return;
    }

    if (boostToActivate.type === BoostType.SECTOR_ACTIVITY_SCAN) {
        if (activeBoosts[BoostType.SECTOR_ACTIVITY_SCAN]) {
            showNotification("Skan aktywności sektora jest już aktywny!");
            return;
        }
        setInventory(prev => ({ ...prev, boosts: prev.boosts.filter(b => b.id !== boostId) }));
        setActiveBoosts(prev => ({
            ...prev,
            [BoostType.SECTOR_ACTIVITY_SCAN]: {
                endTime: Date.now() + boostToActivate.duration * 1000,
            }
        }));
        showNotification(`Aktywowano skan aktywności sektora na ${boostToActivate.duration / 3600}h!`);
        setIsInventoryOpen(false);
        return;
    }

     if (boostToActivate.type === BoostType.ABANDONED_COLONY_LOOT) {
        setInventory(prev => ({ ...prev, boosts: prev.boosts.filter(b => b.id !== boostId) }));
        const loot = {
            metal: Math.floor(20000 + Math.random() * 30000), // 20k-50k
            crystal: Math.floor(20000 + Math.random() * 30000), // 20k-50k
            deuterium: Math.floor(5000 + Math.random() * 5000), // 5k-10k
            credits: Math.floor(5000 + Math.random() * 5000), // 5k-10k
        };
        setResources(r => ({
            metal: Math.min(maxResources.metal, r.metal + loot.metal),
            crystal: Math.min(maxResources.crystal, r.crystal + loot.crystal),
            deuterium: Math.min(maxResources.deuterium, r.deuterium + loot.deuterium),
        }));
        setCredits(c => c + loot.credits);
        showNotification(`Zrabowano opuszczoną kolonię! Zysk: ${formatNumber(loot.metal)} metalu, ${formatNumber(loot.crystal)} kryształu i ${formatNumber(loot.credits)} kredytów!`);
        setIsInventoryOpen(false);
        return;
    }

    // Handle timed boosts
    if (activeBoosts[boostToActivate.type]) {
        showNotification("Podobny bonus jest już aktywny!");
        return;
    }

    setInventory(prev => ({
        ...prev,
        boosts: prev.boosts.filter(b => b.id !== boostId),
    }));

    setActiveBoosts(prev => ({
        ...prev,
        [boostToActivate.type]: {
            level: boostToActivate.level,
            endTime: Date.now() + boostToActivate.duration * 1000,
        }
    }));

    showNotification(`Bonus "${getBoostNameForNotif(boostToActivate)}" został aktywowany!`);
    setIsInventoryOpen(false);
}, [inventory, activeBoosts, showNotification, activeCostReduction, buildQueue, resources, credits, maxResources]);

  // Main Game Tick
  useEffect(() => {
    const gameLoop = setInterval(() => {
      const now = Date.now();
      
      // Resource update
      setResources(prev => ({
        metal: Math.min(prev.metal + productions.metal / (3600 / (TICK_INTERVAL / 1000)), maxResources.metal),
        crystal: Math.min(prev.crystal + productions.crystal / (3600 / (TICK_INTERVAL / 1000)), maxResources.crystal),
        deuterium: Math.min(prev.deuterium + productions.deuterium / (3600 / (TICK_INTERVAL / 1000)), maxResources.deuterium),
      }));
      setCredits(prev => prev + blackMarketHourlyIncome / (3600 / (TICK_INTERVAL / 1000)));

      // Black Market income randomization
      if (now - lastBlackMarketIncomeCheck >= 3600 * 1000) {
          setLastBlackMarketIncomeCheck(now);
          const blackMarketLevel = buildings[BuildingType.BLACK_MARKET];
          if (blackMarketLevel > 0) {
              const minIncome = 50 * Math.pow(1.1, blackMarketLevel - 1);
              const maxIncome = 200 * Math.pow(1.1, blackMarketLevel - 1);
              const newIncome = minIncome + Math.random() * (maxIncome - minIncome);
              setBlackMarketHourlyIncome(newIncome);
          } else {
              setBlackMarketHourlyIncome(0);
          }
      }

      // Queue update
      const completedQueueItems = buildQueue.filter(item => now >= item.endTime);
      if (completedQueueItems.length > 0) {
          completedQueueItems.forEach(item => {
              const objectInfo = ALL_GAME_OBJECTS[item.id as keyof typeof ALL_GAME_OBJECTS];
              showNotification(`${objectInfo.name} ${item.type.match(/^(ship|defense)$/) ? 'zbudowano' : 'ukończono na poziomie'} ${item.levelOrAmount}!`);
              if (item.type === 'building') {
                  setBuildings(prev => ({ ...prev, [item.id]: item.levelOrAmount }));

                  // --- Bonus Logic ---
                  const buildingType = item.id as BuildingType;
                  if (item.levelOrAmount === 2 && !awardedBonuses.includes(buildingType)) {
                      let bonusResources: Partial<Resources> | null = null;
                      let bonusMessage: string | null = null;

                      switch (buildingType) {
                          case BuildingType.METAL_MINE:
                              bonusResources = { metal: 1000 };
                              bonusMessage = 'Bonus za Kopalnię Metalu poz. 2: +1000 Metalu!';
                              break;
                          case BuildingType.CRYSTAL_MINE:
                              bonusResources = { crystal: 700 };
                              bonusMessage = 'Bonus za Kopalnię Kryształu poz. 2: +700 Kryształu!';
                              break;
                          case BuildingType.DEUTERIUM_SYNTHESIZER:
                              bonusResources = { deuterium: 300 };
                              bonusMessage = 'Bonus za Syntezator Deuteru poz. 2: +300 Deuteru!';
                              break;
                      }
                      
                      if (bonusResources && bonusMessage) {
                          setResources(prev => ({
                              metal: Math.min(prev.metal + (bonusResources?.metal || 0), maxResources.metal),
                              crystal: Math.min(prev.crystal + (bonusResources?.crystal || 0), maxResources.crystal),
                              deuterium: Math.min(prev.deuterium + (bonusResources?.deuterium || 0), maxResources.deuterium),
                          }));
                          setAwardedBonuses(prev => [...prev, buildingType]);
                          showNotification(bonusMessage);
                      }
                  }
              }
              else if (item.type === 'research') setResearch(prev => ({ ...prev, [item.id]: item.levelOrAmount }));
              else if (item.type === 'ship_upgrade') setShipLevels(prev => ({ ...prev, [item.id]: item.levelOrAmount }));
              else if (item.type === 'ship') setFleet(prev => ({ ...prev, [item.id]: (prev[item.id as keyof Fleet] || 0) + item.levelOrAmount }));
              else if (item.type === 'defense') setDefenses(prev => ({ ...prev, [item.id]: (prev[item.id as keyof Defenses] || 0) + item.levelOrAmount }));
          });
          setBuildQueue(prev => prev.filter(item => now < item.endTime));
      }

      // --- Player Fleet Mission Processing Loop (Refactored for Correct Return-Trip Timing) ---
      if (fleetMissions.length > 0) {
        const missionsToKeep: FleetMission[] = [];
        const returningFleets: FleetMission[] = [];
        const completedMissions: FleetMission[] = [];

        for (const mission of fleetMissions) {
            // Stage 1: Check for missions that are complete (returned or one-way arrived)
            if (now >= mission.returnTime) {
                if (mission.missionType !== MissionType.COLONIZE) {
                    returningFleets.push(mission);
                } else {
                    // This case should not be reached if handled correctly at arrival, but as a safeguard.
                    completedMissions.push(mission);
                }
                continue;
            }

            // Stage 2: Check for missions arriving at their destination
            if (now >= mission.arrivalTime && !mission.processedArrival) {
                let updatedMission = { ...mission, processedArrival: true };
                
                if (updatedMission.missionType === MissionType.COLONIZE) {
                    const newColony: Colony = {
                        id: updatedMission.targetCoords,
                        name: `Kolonia ${updatedMission.targetCoords}`,
                        creationTime: now,
                    };
                    setColonies(prev => [...prev, newColony]);

                    const newMessage: ColonizationMessage = {
                        id: `msg-${now}-colonize`, type: 'colonization', timestamp: now, isRead: false,
                        subject: `Kolonizacja [${updatedMission.targetCoords}]`,
                        coords: updatedMission.targetCoords,
                        success: true,
                    };
                    setMessages(m => [newMessage, ...m]);
                    showNotification(`Pomyślnie założono nową kolonię na [${updatedMission.targetCoords}]!`);
                    
                    completedMissions.push(updatedMission); // One-way mission, remove from active list
                    continue; // Skip to next mission
                } else if (updatedMission.missionType === MissionType.EXPLORE) {
                    showNotification(`Flota rozpoczęła 5-godzinną eksplorację na [${updatedMission.targetCoords}].`);
                }
                
                const targetNpc = npcStates[updatedMission.targetCoords];

                if (updatedMission.missionType === MissionType.ATTACK && targetNpc) {
                    
                    const attackerFleetPower = calculateTotalPower(updatedMission.fleet, research, shipLevels, spacePlague, activeBoosts);
                    const defenderPower = calculateTotalPower(targetNpc.fleet, targetNpc.research, null) + calculateTotalPower(targetNpc.defenses, targetNpc.research, null);

                    const attackerLossRatio = Math.max(0.1, defenderPower / (attackerFleetPower + defenderPower + 1) * (0.8 + Math.random() * 0.4));
                    const defenderLossRatio = Math.max(0.1, attackerFleetPower / (attackerFleetPower + defenderPower + 1) * (0.8 + Math.random() * 0.4));

                    const attackerLosses: Partial<Fleet> = {};
                    Object.keys(updatedMission.fleet).forEach(key => { attackerLosses[key as ShipType] = Math.floor((updatedMission.fleet[key as ShipType] || 0) * attackerLossRatio); });

                    const defenderLosses: Partial<Fleet> = {};
                    Object.keys(targetNpc.fleet).forEach(key => { defenderLosses[key as ShipType] = Math.floor((targetNpc.fleet[key as ShipType] || 0) * defenderLossRatio); });
                    
                    const defenderDefensesLosses: Partial<Defenses> = {};
                    Object.keys(targetNpc.defenses).forEach(key => { defenderDefensesLosses[key as DefenseType] = Math.floor((targetNpc.defenses[key as DefenseType] || 0) * defenderLossRatio); });

                    const survivingAttackerFleet = { ...updatedMission.fleet };
                    Object.keys(attackerLosses).forEach(key => { survivingAttackerFleet[key as ShipType] = Math.max(0, (survivingAttackerFleet[key as ShipType] || 0) - (attackerLosses[key as ShipType] || 0)); });
                    const actualCargoCapacity = Object.entries(survivingAttackerFleet).reduce((total, [shipType, count]) => total + (SHIPYARD_DATA[shipType as ShipType].cargoCapacity * (count || 0)), 0);

                    const npcMaxResources = calculateMaxResources(targetNpc.buildings);
                    const protectedMetal = npcMaxResources.metal * PROTECTED_RESOURCES_FACTOR;
                    const protectedCrystal = npcMaxResources.crystal * PROTECTED_RESOURCES_FACTOR;
                    const protectedDeuterium = npcMaxResources.deuterium * PROTECTED_RESOURCES_FACTOR;

                    const lootableMetal = Math.max(0, targetNpc.resources.metal - protectedMetal) / 2; // Can only steal 50%
                    const lootableCrystal = Math.max(0, targetNpc.resources.crystal - protectedCrystal) / 2;
                    const lootableDeuterium = Math.max(0, targetNpc.resources.deuterium - protectedDeuterium) / 2;

                    const totalLootable = lootableMetal + lootableCrystal + lootableDeuterium;
                    const lootRatio = totalLootable > 0 ? Math.min(1, actualCargoCapacity / totalLootable) : 0;

                    const actualLoot: Loot = {
                        metal: Math.floor(lootableMetal * lootRatio),
                        crystal: Math.floor(lootableCrystal * lootRatio),
                        deuterium: Math.floor(lootableDeuterium * lootRatio),
                        credits: Math.floor(Math.random() * 5000),
                    };
                    
                    const allLossesCost = { 
                        metal: getUnitsCost(attackerLosses).metal + getUnitsCost(defenderLosses).metal + getUnitsCost(defenderDefensesLosses).metal,
                        crystal: getUnitsCost(attackerLosses).crystal + getUnitsCost(defenderLosses).crystal + getUnitsCost(defenderDefensesLosses).crystal,
                        deuterium: 0,
                    };
                    const debrisCreated: DebrisField = {
                        metal: (allLossesCost.metal || 0) * DEBRIS_FIELD_RECOVERY_RATE,
                        crystal: (allLossesCost.crystal || 0) * DEBRIS_FIELD_RECOVERY_RATE
                    };
                    setDebrisFields(prev => {
                        const newDebrisFields = {...prev};
                        const existingDebris = newDebrisFields[updatedMission.targetCoords] || { metal: 0, crystal: 0 };
                        newDebrisFields[updatedMission.targetCoords] = {
                            metal: (existingDebris.metal || 0) + (debrisCreated.metal || 0),
                            crystal: (existingDebris.crystal || 0) + (debrisCreated.crystal || 0),
                        };
                        return newDebrisFields;
                    });
                    
                    const battleReport: BattleReport = {
                        id: `br-${now}-${Math.random()}`, targetCoords: updatedMission.targetCoords, isPlayerAttacker: true,
                        attackerName: 'Ty', defenderName: `${targetNpc.name} (NPC)`,
                        attackerFleet: updatedMission.fleet, defenderFleet: targetNpc.fleet, defenderDefenses: targetNpc.defenses,
                        attackerLosses, defenderLosses, defenderDefensesLosses, loot: actualLoot, debrisCreated,
                    };

                    updatedMission.fleet = survivingAttackerFleet;
                    updatedMission.loot = actualLoot;
                    
                    const newNpcState = {...targetNpc};
                    newNpcState.resources.metal -= actualLoot.metal || 0;
                    newNpcState.resources.crystal -= actualLoot.crystal || 0;
                    newNpcState.resources.deuterium -= actualLoot.deuterium || 0;
                    Object.keys(defenderLosses).forEach(k => { newNpcState.fleet[k as ShipType] = Math.max(0, (newNpcState.fleet[k as ShipType] || 0) - (defenderLosses[k as ShipType] || 0))});
                    Object.keys(defenderDefensesLosses).forEach(k => { newNpcState.defenses[k as DefenseType] = Math.max(0, (newNpcState.defenses[k as DefenseType] || 0) - (defenderDefensesLosses[k as DefenseType] || 0))});
                    setNpcStates(prev => ({ ...prev, [updatedMission.targetCoords]: newNpcState }));
                    
                    const newMessage: BattleMessage = { id: `msg-${now}-${Math.random()}`, type: 'battle', timestamp: now, isRead: false, subject: `Raport bojowy: Atak na [${updatedMission.targetCoords}]`, report: battleReport };
                    setMessages(prev => [newMessage, ...prev]);
                    showNotification(`Flota dotarła do [${updatedMission.targetCoords}]. Otrzymano nowy raport bojowy.`);

                } else if (updatedMission.missionType === MissionType.SPY) {
                    const spyReport: SpyReport = targetNpc 
                        ? { targetCoords: updatedMission.targetCoords, resources: targetNpc.resources, fleet: targetNpc.fleet, defenses: targetNpc.defenses, buildings: targetNpc.buildings, research: targetNpc.research }
                        : { targetCoords: updatedMission.targetCoords, resources: {}, fleet: {}, defenses: {}, buildings: {}, research: {} };
                    
                    const newMessage: SpyMessage = { id: `msg-${now}-${Math.random()}`, type: 'spy', timestamp: now, isRead: false, subject: `Raport szpiegowski z [${updatedMission.targetCoords}]`, report: spyReport };
                    setMessages(prev => [newMessage, ...prev]);
                    showNotification(`Otrzymano nowy raport szpiegowski z [${updatedMission.targetCoords}].`);
                
                } else if (updatedMission.missionType === MissionType.HARVEST) {
                    const targetDebris = debrisFields[updatedMission.targetCoords];
                    if (targetDebris) {
                        const recyclerCapacity = Object.entries(updatedMission.fleet).reduce((cap, [type, count]) => type === ShipType.RECYCLER ? cap + (SHIPYARD_DATA[type].cargoCapacity * (count || 0)) : cap, 0);
                        const availableMetal = targetDebris.metal || 0;
                        const availableCrystal = targetDebris.crystal || 0;
                        const totalAvailable = availableMetal + availableCrystal;
                        const harvestRatio = totalAvailable > 0 ? Math.min(1, recyclerCapacity / totalAvailable) : 0;
                        
                        const harvestedMetal = Math.floor(availableMetal * harvestRatio);
                        const harvestedCrystal = Math.floor(availableCrystal * harvestRatio);
                        
                        updatedMission.loot = { metal: harvestedMetal, crystal: harvestedCrystal };
                        setDebrisFields(prev => ({ ...prev, [updatedMission.targetCoords]: { metal: availableMetal - harvestedMetal, crystal: availableCrystal - harvestedCrystal }}));
                        showNotification(`Zebrano ${harvestedMetal} metalu i ${harvestedCrystal} kryształu z [${updatedMission.targetCoords}].`);
                    }
                } else if (updatedMission.missionType === MissionType.EXPEDITION) {
                    // Expedition outcome is only processed on return
                }
                
                missionsToKeep.push(updatedMission);
            } 
            // Stage 2.5: Handle ongoing EXPLORE missions
            else if (mission.missionType === MissionType.EXPLORE && mission.explorationEndTime && now >= mission.explorationEndTime && !mission.processedExploration) {
                let updatedMission = { ...mission, processedExploration: true };
                let newMessage: ExplorationMessage;
                const rand = Math.random();

                if (rand < 0.25) { // FIND_SHIP_WRECK (25%)
                    const fleetGained: Fleet = {
                        [ShipType.LIGHT_FIGHTER]: Math.floor(1 + Math.random() * 2), // 1-2
                        [ShipType.CARGO_SHIP]: 1
                    };
                    setFleet(prev => {
                        const newFleet = { ...prev };
                        for (const shipType in fleetGained) {
                            newFleet[shipType as ShipType] = (newFleet[shipType as ShipType] || 0) + (fleetGained[shipType as ShipType] || 0);
                        }
                        return newFleet;
                    });
                    newMessage = {
                        id: `msg-${now}-explore-wreck`, type: 'exploration', timestamp: now, isRead: false,
                        subject: `Odnaleziono wrak na [${mission.targetCoords}]!`,
                        outcome: ExplorationOutcomeType.FIND_SHIP_WRECK,
                        details: { targetCoords: mission.targetCoords, fleetGained }
                    };
                } else if (rand < 0.50) { // FIND_BOOST: SECTOR_ACTIVITY_SCAN (25%)
                    const foundBoost: Boost = { id: `boost-${now}-scan`, type: BoostType.SECTOR_ACTIVITY_SCAN, level: 1, duration: 2 * 3600 };
                    setInventory(prev => ({ ...prev, boosts: [...prev.boosts, foundBoost] }));
                    newMessage = {
                        id: `msg-${now}-explore-boost`, type: 'exploration', timestamp: now, isRead: false,
                        subject: `Cenne dane na [${mission.targetCoords}]!`,
                        outcome: ExplorationOutcomeType.FIND_BOOST,
                        details: { targetCoords: mission.targetCoords, foundBoost }
                    };
                } else if (rand < 0.75) { // FIND_BOOST: ABANDONED_COLONY_LOOT (25%)
                    const foundBoost: Boost = { id: `boost-${now}-loot`, type: BoostType.ABANDONED_COLONY_LOOT, level: 1, duration: 0 };
                    setInventory(prev => ({ ...prev, boosts: [...prev.boosts, foundBoost] }));
                    newMessage = {
                        id: `msg-${now}-explore-boost`, type: 'exploration', timestamp: now, isRead: false,
                        subject: `Mapa kolonii na [${mission.targetCoords}]!`,
                        outcome: ExplorationOutcomeType.FIND_BOOST,
                        details: { targetCoords: mission.targetCoords, foundBoost }
                    };
                } else if (rand < 0.90) { // HOSTILES (15%)
                    const lossPercent = 0.1 + Math.random() * 0.3; // 10-40% loss
                    const fleetLost: Partial<Fleet> = {};
                    for (const ship in updatedMission.fleet) {
                        const losses = Math.ceil((updatedMission.fleet[ship as ShipType] || 0) * lossPercent);
                        if (losses > 0) {
                            fleetLost[ship as ShipType] = losses;
                            updatedMission.fleet[ship as ShipType] = (updatedMission.fleet[ship as ShipType] || 0) - losses;
                            if (updatedMission.fleet[ship as ShipType]! < 0) updatedMission.fleet[ship as ShipType] = 0;
                        }
                    }
                    newMessage = {
                        id: `msg-${now}-explore`, type: 'exploration', timestamp: now, isRead: false,
                        subject: `Niebezpieczeństwo na [${mission.targetCoords}]!`,
                        outcome: ExplorationOutcomeType.HOSTILES,
                        details: { targetCoords: mission.targetCoords, fleetLost }
                    };
                } else { // NOTHING (10%)
                    newMessage = {
                        id: `msg-${now}-explore`, type: 'exploration', timestamp: now, isRead: false,
                        subject: `Eksploracja [${mission.targetCoords}]`,
                        outcome: ExplorationOutcomeType.NOTHING,
                        details: { targetCoords: mission.targetCoords }
                    };
                }
                
                showNotification(`Eksploracja na [${mission.targetCoords}] zakończona. Otrzymano raport.`);
                setMessages(m => [newMessage, ...m]);
                missionsToKeep.push(updatedMission);
            }
            else {
                // If it's not arriving now and not returning now, just keep it.
                missionsToKeep.push(mission);
            }
        }
        
        // Stage 3: Batch update state for returning fleets.
        if (returningFleets.length > 0) {
            let newFleet = { ...fleet };
            let newResources = { ...resources };
            let newCredits = credits;
            const newMessages: Message[] = [];

            for (const mission of returningFleets) {
                if (mission.missionType === MissionType.EXPEDITION) {
                    const { message, finalFleet, finalLoot } = processExpeditionOutcome(mission, shipLevels);
                    newMessages.push(message);

                    for (const shipType in finalFleet) {
                        newFleet[shipType as ShipType] = (newFleet[shipType as ShipType] || 0) + (finalFleet[shipType as ShipType] || 0);
                    }
                    if (finalLoot) {
                        newResources.metal = Math.min(maxResources.metal, newResources.metal + (finalLoot.metal || 0));
                        newResources.crystal = Math.min(maxResources.crystal, newResources.crystal + (finalLoot.crystal || 0));
                        newResources.deuterium = Math.min(maxResources.deuterium, newResources.deuterium + (finalLoot.deuterium || 0));
                        newCredits += finalLoot.credits || 0;
                    }
                     showNotification(`Wyprawa na [${mission.targetCoords}] zakończyła się. Otrzymano nowy raport.`);
                } else {
                    // Standard mission return (includes EXPLORE return)
                    for (const shipType in mission.fleet) {
                        newFleet[shipType as ShipType] = (newFleet[shipType as ShipType] || 0) + (mission.fleet[shipType as ShipType] || 0);
                    }
                     if (mission.loot) {
                        newResources.metal = Math.min(maxResources.metal, newResources.metal + (mission.loot.metal || 0));
                        newResources.crystal = Math.min(maxResources.crystal, newResources.crystal + (mission.loot.crystal || 0));
                        newResources.deuterium = Math.min(maxResources.deuterium, newResources.deuterium + (mission.loot.deuterium || 0));
                        newCredits += mission.loot.credits || 0;
                    }
                    showNotification(`Flota powróciła z misji [${mission.targetCoords}].`);
                }
            }

            setFleet(newFleet);
            setResources(newResources);
            setCredits(newCredits);
            if(newMessages.length > 0) {
                setMessages(prev => [...newMessages, ...prev]);
            }
        }
        
        // Stage 4: Update the mission list with the processed list
        if (completedMissions.length > 0 || returningFleets.length > 0) {
             setFleetMissions(missionsToKeep);
        }
      }

      // NPC fleet missions update
      const completedNpcMissions = npcFleetMissions.filter(m => now >= m.arrivalTime);
      if (completedNpcMissions.length > 0) {
          completedNpcMissions.forEach(mission => {
              const attackerNpc = npcStates[mission.sourceCoords];
              if (!attackerNpc) return;

              if (mission.missionType === MissionType.SPY) {
                  const attackerDisplayName = `${attackerNpc.name} (NPC)`;
                  const newMessage: EspionageEventMessage = { 
                      id: `msg-${now}-esp`, type: 'espionage_event', timestamp: now, isRead: false, 
                      subject: `Wykryto szpiegostwo z [${mission.sourceCoords}]!`, 
                      spyCoords: mission.sourceCoords, spyName: attackerNpc.name
                  };
                  setMessages(prev => [newMessage, ...prev]);
                  showNotification(`Twoja planeta została wyszpiegowana przez gracza ${attackerDisplayName} z [${mission.sourceCoords}]!`);
              } else if (mission.missionType === MissionType.ATTACK) {
                    const attackerDisplayName = `${attackerNpc.name} (NPC)`;
                    
                    const attackerPower = calculateTotalPower(mission.fleet, attackerNpc.research, null);
                    const defenderPower = calculateTotalPower(fleet, research, shipLevels, spacePlague, activeBoosts) + calculateTotalPower(defenses, research, null, undefined, activeBoosts);

                    const attackerLossRatio = Math.max(0.1, defenderPower / (attackerPower + defenderPower + 1) * (0.8 + Math.random() * 0.4));
                    const defenderLossRatio = Math.max(0.1, attackerPower / (attackerPower + defenderPower + 1) * (0.8 + Math.random() * 0.4));

                    const attackerLosses: Partial<Fleet> = {};
                    Object.keys(mission.fleet).forEach(key => { attackerLosses[key as ShipType] = Math.floor((mission.fleet[key as ShipType] || 0) * attackerLossRatio); });
                    const defenderLosses: Partial<Fleet> = {};
                    Object.keys(fleet).forEach(key => { defenderLosses[key as ShipType] = Math.floor((fleet[key as ShipType] || 0) * defenderLossRatio); });
                    const defenderDefensesLosses: Partial<Defenses> = {};
                    Object.keys(defenses).forEach(key => { defenderDefensesLosses[key as DefenseType] = Math.floor((defenses[key as DefenseType] || 0) * defenderLossRatio); });
                    
                    const survivingAttackerFleet = { ...mission.fleet };
                    Object.keys(attackerLosses).forEach(key => { survivingAttackerFleet[key as ShipType] = (survivingAttackerFleet[key as ShipType] || 0) - (attackerLosses[key as ShipType] || 0); });
                    const cargoCapacity = Object.entries(survivingAttackerFleet).reduce((total, [shipType, count]) => total + (SHIPYARD_DATA[shipType as ShipType].cargoCapacity * (count || 0)), 0);

                    const protectionFactor = activeBoosts[BoostType.STORAGE_PROTECTION_BOOST]
                        ? activeBoosts[BoostType.STORAGE_PROTECTION_BOOST]!.level / 100
                        : PROTECTED_RESOURCES_FACTOR;

                    const protectedMetal = maxResources.metal * protectionFactor;
                    const protectedCrystal = maxResources.crystal * protectionFactor;
                    const protectedDeuterium = maxResources.deuterium * protectionFactor;

                    const lootableMetal = Math.max(0, resources.metal - protectedMetal) / 2;
                    const lootableCrystal = Math.max(0, resources.crystal - protectedCrystal) / 2;
                    const lootableDeuterium = Math.max(0, resources.deuterium - protectedDeuterium) / 2;
                    
                    const totalLootable = lootableMetal + lootableCrystal + lootableDeuterium;
                    const lootRatio = totalLootable > 0 ? Math.min(1, cargoCapacity / totalLootable) : 0;

                    const actualLoot: Loot = {
                        metal: Math.floor(lootableMetal * lootRatio),
                        crystal: Math.floor(lootableCrystal * lootRatio),
                        deuterium: Math.floor(lootableDeuterium * lootRatio),
                    };

                    const allLossesCost = { 
                        metal: getUnitsCost(attackerLosses).metal + getUnitsCost(defenderLosses).metal + getUnitsCost(defenderDefensesLosses).metal,
                        crystal: getUnitsCost(attackerLosses).crystal + getUnitsCost(defenderLosses).crystal + getUnitsCost(defenderDefensesLosses).crystal,
                        deuterium: 0,
                    };
                    const debrisCreated: DebrisField = {
                        metal: (allLossesCost.metal || 0) * DEBRIS_FIELD_RECOVERY_RATE,
                        crystal: (allLossesCost.crystal || 0) * DEBRIS_FIELD_RECOVERY_RATE
                    };
                    setDebrisFields(prev => {
                        const newDebrisFields = {...prev};
                        const existingDebris = newDebrisFields[PLAYER_HOME_COORDS] || { metal: 0, crystal: 0 };
                        newDebrisFields[PLAYER_HOME_COORDS] = {
                            metal: (existingDebris.metal || 0) + (debrisCreated.metal || 0),
                            crystal: (existingDebris.crystal || 0) + (debrisCreated.crystal || 0),
                        };
                        return newDebrisFields;
                    });

                    const battleReport: BattleReport = {
                        id: `br-${now}-${Math.random()}`, targetCoords: 'Twoja planeta', isPlayerAttacker: false,
                        attackerName: attackerDisplayName, defenderName: 'Ty',
                        attackerFleet: mission.fleet, defenderFleet: fleet, defenderDefenses: defenses,
                        attackerLosses, defenderLosses, defenderDefensesLosses, loot: actualLoot, debrisCreated,
                    };

                    // Update player state
                    setFleet(prev => { const next = {...prev}; Object.keys(defenderLosses).forEach(k => next[k as ShipType] = Math.max(0, (prev[k as ShipType] || 0) - (defenderLosses[k as ShipType] || 0))); return next; });
                    setDefenses(prev => { const next = {...prev}; Object.keys(defenderDefensesLosses).forEach(k => next[k as DefenseType] = Math.max(0, (prev[k as DefenseType] || 0) - (defenderDefensesLosses[k as DefenseType] || 0))); return next; });
                    setResources(prev => ({
                        metal: Math.max(0, prev.metal - (actualLoot.metal || 0)),
                        crystal: Math.max(0, prev.crystal - (actualLoot.crystal || 0)),
                        deuterium: Math.max(0, prev.deuterium - (actualLoot.deuterium || 0)),
                    }));

                    // Update NPC state
                    const newNpcState = {...attackerNpc};
                    newNpcState.resources.metal += actualLoot.metal || 0;
                    newNpcState.resources.crystal += actualLoot.crystal || 0;
                    newNpcState.resources.deuterium += actualLoot.deuterium || 0;
                    Object.keys(attackerLosses).forEach(key => { newNpcState.fleet[key as ShipType] = Math.max(0, (newNpcState.fleet[key as ShipType] || 0) - (attackerLosses[key as ShipType] || 0)); });
                    setNpcStates(prev => ({ ...prev, [mission.sourceCoords]: newNpcState }));

                    const newMessage: BattleMessage = { id: `msg-${now}-${Math.random()}`, type: 'battle', timestamp: now, isRead: false, subject: `Atak na Twoją planetę przez gracza ${attackerDisplayName} [${mission.sourceCoords}]`, report: battleReport };
                    setMessages(prev => [newMessage, ...prev]);
                    showNotification(`Twoja planeta została zaatakowana przez gracza ${attackerDisplayName}!`);
              }
          });
          setNpcFleetMissions(prev => prev.filter(m => now < m.arrivalTime));
      }


      // Merchant state machine
      setMerchantState(prev => {
          if (prev.status === MerchantStatus.INCOMING && now >= prev.arrivalTime) {
              const departureTime = now + 2 * 3600 * 1000;
              const newMessage: MerchantInfoMessage = { id: `msg-${now}-merch-active`, type: 'merchant', timestamp: now, isRead: false, subject: 'Kupiec przybył!', merchantStatus: MerchantStatus.ACTIVE, eventTime: departureTime };
              setMessages(m => [newMessage, ...m]);
              showNotification("Transportowiec handlowy przybył!");
              return { ...prev, status: MerchantStatus.ACTIVE, departureTime: departureTime };
          }
          if (prev.status === MerchantStatus.ACTIVE && now >= prev.departureTime) {
              const newMessage: MerchantInfoMessage = { id: `msg-${now}-merch-gone`, type: 'merchant', timestamp: now, isRead: false, subject: 'Kupiec odleciał', merchantStatus: MerchantStatus.INACTIVE, eventTime: now };
              setMessages(m => [newMessage, ...m]);
              if (activeView === 'merchant') setActiveView('buildings');
              showNotification("Kupiec odleciał.");
              return { ...prev, status: MerchantStatus.INACTIVE };
          }
          return prev;
      });

      // Merchant check
      if (now - lastMerchantCheckTime > 6 * 3600 * 1000) {
          setLastMerchantCheckTime(now);
          if (merchantState.status === MerchantStatus.INACTIVE && Math.random() < 0.35) {
              const arrivalTime = now + 5 * 3600 * 1000;
              const newRates = {
                  metal: { buy: 2 + Math.random(), sell: 1 + Math.random() * 0.5 },
                  crystal: { buy: 4 + Math.random() * 2, sell: 2 + Math.random() },
                  deuterium: { buy: 6 + Math.random() * 3, sell: 3 + Math.random() * 1.5 },
              };
              setMerchantState({ status: MerchantStatus.INCOMING, arrivalTime, departureTime: 0, rates: newRates });
              const newMessage: MerchantInfoMessage = { id: `msg-${now}-merch-coming`, type: 'merchant', timestamp: now, isRead: false, subject: 'Kupiec w drodze', merchantStatus: MerchantStatus.INCOMING, eventTime: arrivalTime };
              setMessages(m => [newMessage, ...m]);
              showNotification("Wykryto sygnaturę transportowca handlowego!");
          }
      }

        // --- Pirate Mercenary State Machine ---
      setPirateMercenaryState(prev => {
          if (prev.status === PirateMercenaryStatus.INCOMING && now >= prev.arrivalTime) {
              const newDepartureTime = prev.arrivalTime + 1 * 3600 * 1000;
              const newState: PirateMercenaryState = { ...prev, status: PirateMercenaryStatus.AVAILABLE, departureTime: newDepartureTime };
              const newMessage: PirateMessage = { id: `msg-${now}-pirate-avail`, type: 'pirate', timestamp: now, isRead: false, subject: 'Najemnicy przybyli', pirateState: newState };
              setMessages(m => [newMessage, ...m]);
              showNotification("Piraci-najemnicy przybyli. Masz godzinę, by ich wynająć!");
              return newState;
          }
          if (prev.status === PirateMercenaryStatus.AVAILABLE && now >= prev.departureTime) {
              const newState: PirateMercenaryState = { ...prev, status: PirateMercenaryStatus.DEPARTED };
              const newMessage: PirateMessage = { id: `msg-${now}-pirate-gone`, type: 'pirate', timestamp: now, isRead: false, subject: 'Najemnicy odlecieli', pirateState: newState };
              setMessages(m => [newMessage, ...m]);
              showNotification("Oferta najemników wygasła i odlecieli.");
              return newState;
          }
           if (prev.status === PirateMercenaryStatus.DEPARTED && now >= prev.departureTime + 60 * 1000) { // 1 min cleanup after they are gone
              return { ...INITIAL_PIRATE_MERCENARY_STATE };
          }
          return prev;
      });

      // --- Pirate Mercenary Check ---
      if (now - lastPirateCheckTime > 8 * 3600 * 1000) { // Check every 8 hours
          setLastPirateCheckTime(now);
          // 50% chance each check gives an average of 1.5 events per day (3 checks/day)
          if (pirateMercenaryState.status === PirateMercenaryStatus.INACTIVE && Math.random() < 0.5) {
                const totalShips = Math.floor(Math.random() * 9) + 2; // 2-10
                const lightFighterRatio = 0.7 + Math.random() * 0.1; // 70-80%
                const lightFighters = Math.round(totalShips * lightFighterRatio);
                const heavyFighters = totalShips - lightFighters;

                const pirateFleet: Fleet = {};
                if (lightFighters > 0) pirateFleet[ShipType.LIGHT_FIGHTER] = lightFighters;
                if (heavyFighters > 0) pirateFleet[ShipType.HEAVY_FIGHTER] = heavyFighters;
                
                const lfCost = SHIPYARD_DATA[ShipType.LIGHT_FIGHTER].cost(1);
                const hfCost = SHIPYARD_DATA[ShipType.HEAVY_FIGHTER].cost(1);
                
                const totalResourceCost: Resources = {
                    metal: (lfCost.metal * (lightFighters || 0)) + (hfCost.metal * (heavyFighters || 0)),
                    crystal: (lfCost.crystal * (lightFighters || 0)) + (hfCost.crystal * (heavyFighters || 0)),
                    deuterium: (lfCost.deuterium * (lightFighters || 0)) + (hfCost.deuterium * (heavyFighters || 0)),
                };

                const hireCost = Math.floor(
                    (totalResourceCost.metal * 1.5 + totalResourceCost.crystal * 2.5 + totalResourceCost.deuterium * 4) * 1.2
                );

                const arrivalTime = now + 3 * 3600 * 1000;

                const newState: PirateMercenaryState = {
                    status: PirateMercenaryStatus.INCOMING,
                    fleet: pirateFleet,
                    hireCost: hireCost,
                    arrivalTime: arrivalTime,
                    departureTime: 0, // Will be set on arrival
                };
                
                setPirateMercenaryState(newState);

                const newMessage: PirateMessage = { id: `msg-${now}-pirate-inc`, type: 'pirate', timestamp: now, isRead: false, subject: 'Sygnał od najemników', pirateState: newState };
                setMessages(m => [newMessage, ...m]);
                showNotification("Wykryto sygnaturę floty piratów-najemników! Będą tu za 3 godziny.");
          }
      }

      // Asteroid Impact Event Check
      if (now - lastAsteroidCheckTime > 12 * 3600 * 1000) { // Check every 12 hours
          setLastAsteroidCheckTime(now);
          if (Math.random() < 0.25) { // 25% chance to trigger
              // Negative Outcome: Building Damage
              if (Math.random() < 0.5) {
                  const builtBuildings = (Object.keys(buildings) as BuildingType[])
                      .filter(b => buildings[b as BuildingType] > 0);
                  
                  if (builtBuildings.length > 0) {
                      const buildingToHit = builtBuildings[Math.floor(Math.random() * builtBuildings.length)];
                      const currentLevel = buildings[buildingToHit as BuildingType];
                      const newLevel = currentLevel - 1;

                      setBuildings(prev => ({ ...prev, [buildingToHit]: newLevel }));

                      const buildingName = BUILDING_DATA[buildingToHit as BuildingType].name;
                      const notificationText = `Uderzenie meteorytu! Twoja ${buildingName} została uszkodzona!`;
                      showNotification(notificationText);
                      
                      const newMessage: AsteroidImpactMessage = {
                          id: `msg-${now}-asteroid`,
                          type: 'asteroid_impact',
                          timestamp: now,
                          isRead: false,
                          subject: 'Uderzenie meteorytu!',
                          impactType: AsteroidImpactType.DAMAGE,
                          details: {
                              buildingId: buildingToHit as BuildingType,
                              newLevel: newLevel,
                          }
                      };
                      setMessages(m => [newMessage, ...m]);
                  }
              } 
              // Positive Outcome: Resource Bonus
              else {
                  const resourceType = (Math.random() < 0.5 ? 'metal' : 'crystal') as 'metal' | 'crystal';
                  const bonusAmount = Math.floor(5000 + Math.random() * (productions[resourceType] * 2 + 5000));
                  
                  setResources(prev => ({
                      ...prev,
                      [resourceType]: Math.min(prev[resourceType] + bonusAmount, maxResources[resourceType])
                  }));

                  const resourceName = resourceType === 'metal' ? 'Metalu' : 'Kryształu';
                  const notificationText = `Deszcz meteorytów! Otrzymano bonus: +${formatNumber(bonusAmount)} ${resourceName}!`;
                  showNotification(notificationText);

                  const newMessage: AsteroidImpactMessage = {
                      id: `msg-${now}-asteroid`,
                      type: 'asteroid_impact',
                      timestamp: now,
                      isRead: false,
                      subject: 'Deszcz meteorytów!',
                      impactType: AsteroidImpactType.BONUS,
                      details: {
                          resourceType: resourceType,
                          amount: bonusAmount,
                      }
                  };
                  setMessages(m => [newMessage, ...m]);
              }
          }
      }

      // --- Resource Vein Bonus State Machine ---
        if (resourceVeinBonus.active && now >= resourceVeinBonus.endTime) {
            const expiredBonusType = resourceVeinBonus.resourceType;
            if (expiredBonusType) {
                const resourceNameMap = {metal: 'Metalu', crystal: 'Kryształu', deuterium: 'Deuteru'};
                const resourceName = resourceNameMap[expiredBonusType];
                showNotification(`Premia do wydobycia ${resourceName} wygasła.`);
                const newMessage: ResourceVeinMessage = {
                    id: `msg-${now}-vein-expired`,
                    type: 'resource_vein',
                    timestamp: now,
                    isRead: false,
                    subject: `Koniec premii do wydobycia ${resourceName}`,
                    resourceType: expiredBonusType,
                    bonusEndTime: resourceVeinBonus.endTime,
                    status: 'expired'
                };
                setMessages(m => [newMessage, ...m]);
            }
            setResourceVeinBonus(INITIAL_RESOURCE_VEIN_BONUS);
        }

        // --- Resource Vein Bonus Check ---
        if (now - lastResourceVeinCheckTime > 24 * 3600 * 1000) { // Check every 24 hours
            setLastResourceVeinCheckTime(now);
            if (!resourceVeinBonus.active && Math.random() < 0.15) { // 15% chance, only if no other bonus is active
                const possibleResources: (keyof Resources)[] = ['metal', 'crystal', 'deuterium'];
                const resourceType = possibleResources[Math.floor(Math.random() * possibleResources.length)];
                const bonusEndTime = now + 24 * 3600 * 1000;

                setResourceVeinBonus({
                    active: true,
                    resourceType,
                    endTime: bonusEndTime,
                    bonusMultiplier: 1.25,
                });
                
                const resourceNameMap = {metal: 'Metalu', crystal: 'Kryształu', deuterium: 'Deuteru'};
                const resourceName = resourceNameMap[resourceType];
                showNotification(`Odkryto bogatą żyłę ${resourceName}! Produkcja +25% na 24h!`);

                const newMessage: ResourceVeinMessage = {
                    id: `msg-${now}-vein-active`,
                    type: 'resource_vein',
                    timestamp: now,
                    isRead: false,
                    subject: `Odkryto bogatą żyłę ${resourceName}!`,
                    resourceType,
                    bonusEndTime,
                    status: 'activated'
                };
                setMessages(m => [newMessage, ...m]);
            }
        }

        // --- Ancient Artifact Event Check ---
        if (now - lastArtifactCheckTime > 24 * 3600 * 1000) { // Check every 24 hours
            setLastArtifactCheckTime(now);
            // 20% chance, only if no other event is active and player has a research lab
            if (ancientArtifactState.status === AncientArtifactStatus.INACTIVE && buildings[BuildingType.RESEARCH_LAB] > 0 && Math.random() < 0.20) { 
                setAncientArtifactState({ status: AncientArtifactStatus.AWAITING_CHOICE });
                showNotification("Niezwykłe odkrycie! Twoi koloniści odkopali tajemniczy artefakt!");
            }
        }

        // --- Space Plague State Machine & Event Check ---
        if (spacePlague.active && now >= spacePlague.endTime) {
            if (spacePlague.infectedShip) {
                const shipName = SHIPYARD_DATA[spacePlague.infectedShip].name;
                showNotification(`Zaraza na statkach typu ${shipName} została zwalczona!`);
                 const newMessage: SpacePlagueMessage = {
                    id: `msg-${now}-plague-end`, type: 'space_plague', timestamp: now, isRead: false,
                    subject: `Zaraza zwalczona: ${shipName}`,
                    infectedShip: spacePlague.infectedShip,
                    status: 'expired'
                };
                setMessages(m => [newMessage, ...m]);
            }
            setSpacePlague(INITIAL_SPACE_PLAGUE_STATE);
        }

        if (now - lastSpacePlagueCheckTime > 24 * 3600 * 1000) { // Check every 24h
            setLastSpacePlagueCheckTime(now);
            const ownedShipTypes = (Object.keys(fleet) as ShipType[]).filter(t => (fleet[t] || 0) > 0);
            if (!spacePlague.active && ownedShipTypes.length > 0 && Math.random() < 0.20) { // 20% chance
                const shipToInfect = ownedShipTypes[Math.floor(Math.random() * ownedShipTypes.length)];
                setSpacePlague({
                    active: true,
                    infectedShip: shipToInfect,
                    endTime: now + 12 * 3600 * 1000, // Lasts 12 hours
                });
                const shipName = SHIPYARD_DATA[shipToInfect].name;
                showNotification(`Kosmiczna zaraza! ${shipName} zostały zainfekowane! Atak -20%.`);
                const newMessage: SpacePlagueMessage = {
                    id: `msg-${now}-plague-start`, type: 'space_plague', timestamp: now, isRead: false,
                    subject: `Wykryto zarazę na statkach: ${shipName}`,
                    infectedShip: shipToInfect,
                    status: 'activated'
                };
                setMessages(m => [newMessage, ...m]);
            }
        }
        
        // --- Active Boosts Check ---
        const newActiveBoosts: ActiveBoosts = {};
        let boostsChanged = false;
        for (const key in activeBoosts) {
            const boostType = key as BoostType;
            const boost = activeBoosts[boostType];
            if (boost && boost.endTime > now) {
                newActiveBoosts[boostType] = boost;
            } else {
                showNotification(`Bonus "${getBoostNameForNotif({ type: boostType, level: (boost as any).level || 1 })}" wygasł.`);
                boostsChanged = true;
            }
        }
        if (boostsChanged) {
            setActiveBoosts(newActiveBoosts);
        }


    }, TICK_INTERVAL);
    return () => clearInterval(gameLoop);
  }, [productions, buildQueue, maxResources, fleet, defenses, fleetMissions, npcFleetMissions, npcStates, showNotification, lastMerchantCheckTime, merchantState, activeView, research, resources, shipLevels, awardedBonuses, debrisFields, pirateMercenaryState, lastPirateCheckTime, lastAsteroidCheckTime, resourceVeinBonus, lastResourceVeinCheckTime, ancientArtifactState, lastArtifactCheckTime, buildings, handleArtifactChoice, spacePlague, lastSpacePlagueCheckTime, colonies, inventory, activeBoosts, handleActivateBoost, activeCostReduction, credits, blackMarketHourlyIncome, lastBlackMarketIncomeCheck]);

  const handleAddToQueue = useCallback((id: GameObject, type: QueueItemType, amount = 1) => {
    const queueCapacity = activeBoosts[BoostType.EXTRA_BUILD_QUEUE]?.level || 1;
    const buildingQueueCount = buildQueue.filter(item => ['building', 'research', 'ship_upgrade'].includes(item.type)).length;
    const shipyardQueueCount = buildQueue.filter(item => ['ship', 'defense'].includes(item.type)).length;

    if ((type === 'building' || type === 'research' || type === 'ship_upgrade') && buildingQueueCount >= queueCapacity) {
        showNotification(`Kolejka budowy/badań jest pełna! (Max: ${queueCapacity})`);
        return;
    }
    if ((type === 'ship' || type === 'defense') && shipyardQueueCount >= queueCapacity) {
        showNotification(`Stocznia jest zajęta! (Max: ${queueCapacity})`);
        return;
    }


    const objectInfo = ALL_GAME_OBJECTS[id as keyof typeof ALL_GAME_OBJECTS];
    let levelOrAmount: number;
    if (type === 'building') levelOrAmount = buildings[id as BuildingType] + 1;
    else if (type === 'research') levelOrAmount = research[id as keyof ResearchLevels] + 1;
    else if (type === 'ship_upgrade') levelOrAmount = shipLevels[id as ShipType] + 1;
    else levelOrAmount = amount;
    
    if (type === 'ship') {
        const shipData = SHIPYARD_DATA[id as ShipType];
        if (shipData.requiredEnergy && productions.energy.produced < shipData.requiredEnergy) {
            showNotification(`Budowa ${shipData.name} wymaga ${formatNumber(shipData.requiredEnergy)} energii!`);
            return;
        }
    }

    let cost = objectInfo.cost(levelOrAmount);

    if (activeCostReduction > 0 && (type === 'building' || type === 'research')) {
        const reduction = activeCostReduction / 100;
        cost = {
            metal: Math.floor(cost.metal * (1 - reduction)),
            crystal: Math.floor(cost.crystal * (1 - reduction)),
            deuterium: Math.floor(cost.deuterium * (1 - reduction)),
        };
        showNotification(`Zastosowano zniżkę ${activeCostReduction}%!`);
        setActiveCostReduction(0); // Consume the boost
    }

    const totalCost = { metal: (cost.metal || 0) * amount, crystal: (cost.crystal || 0) * amount, deuterium: (cost.deuterium || 0) * amount };
    
    if (resources.metal >= totalCost.metal && resources.crystal >= totalCost.crystal && resources.deuterium >= totalCost.deuterium) {
      setResources(prev => ({ metal: prev.metal - totalCost.metal, crystal: prev.crystal - totalCost.crystal, deuterium: prev.deuterium - totalCost.deuterium }));
      const buildTime = objectInfo.buildTime(levelOrAmount) * ((type === 'ship' || type === 'defense') ? amount : 1);
      const now = Date.now();
      const newItem: QueueItem = { id, type, levelOrAmount, buildTime, startTime: now, endTime: now + buildTime * 1000 };
      setBuildQueue(prev => [...prev, newItem]);
      showNotification(`Rozpoczęto: ${objectInfo.name}`);
    } else {
      showNotification("Za mało surowców!");
    }
  }, [resources, buildings, research, shipLevels, buildQueue, showNotification, productions.energy.produced, activeBoosts, activeCostReduction]);
  
  const handleSendFleet = useCallback((missionFleet: Fleet, targetCoords: string, missionType: MissionType) => {
      const now = Date.now();
      const isTargetOccupied = npcStates[targetCoords] || colonies.some(c => c.id === targetCoords) || targetCoords === PLAYER_HOME_COORDS;

      if (missionType === MissionType.SPY && (!missionFleet[ShipType.SPY_PROBE] || (missionFleet[ShipType.SPY_PROBE] ?? 0) === 0)) {
          showNotification("Misja szpiegowska wymaga przynajmniej jednej Sondy Szpiegowskiej!");
          return;
      }
      if (missionType === MissionType.HARVEST && (!missionFleet[ShipType.RECYCLER] || (missionFleet[ShipType.RECYCLER] ?? 0) === 0)) {
          showNotification("Misja zbierania wymaga przynajmniej jednego Recyklera!");
          return;
      }
      if (missionType === MissionType.EXPLORE) {
          if (!missionFleet[ShipType.RESEARCH_VESSEL] || (missionFleet[ShipType.RESEARCH_VESSEL] ?? 0) === 0) {
              showNotification("Misja eksploracyjna wymaga Okrętu Badawczego!");
              return;
          }
          if (isTargetOccupied) {
              showNotification("Można eksplorować tylko niezamieszkane planety!");
              return;
          }
      }
      if (missionType === MissionType.EXPEDITION) {
        const maxExpeditions = 1 + (research[ResearchType.ASTROPHYSICS] || 0);
        const currentExpeditions = fleetMissions.filter(m => m.missionType === MissionType.EXPEDITION).length;
        if(currentExpeditions >= maxExpeditions) {
            showNotification(`Przekroczono limit wypraw! (Max: ${maxExpeditions})`);
            return;
        }
      }
      if (missionType === MissionType.COLONIZE) {
        if (!missionFleet[ShipType.COLONY_SHIP] || (missionFleet[ShipType.COLONY_SHIP] ?? 0) === 0) {
            showNotification("Misja kolonizacyjna wymaga Statku Kolonizacyjnego!");
            return;
        }
        const maxColonies = research[ResearchType.ASTROPHYSICS] || 0;
        if (colonies.length >= maxColonies) {
            showNotification(`Przekroczono limit kolonii! (Max: ${maxColonies}). Zbadaj Astrofizykę, by go zwiększyć.`);
            return;
        }
        if (isTargetOccupied) {
            showNotification("Ta pozycja jest już zajęta!");
            return;
        }
      }

      const speeds = Object.entries(missionFleet).map(([shipId, count]) => {
          if (!count || count <= 0) return Infinity;
          const shipData = SHIPYARD_DATA[shipId as ShipType];
          const driveTech = shipData.drive;
          const driveLevel = research[driveTech] || 0;
          let speedMultiplier = 0.1;
          if (driveTech === ResearchType.IMPULSE_DRIVE) speedMultiplier = 0.2;
          if (driveTech === ResearchType.HYPERSPACE_DRIVE) speedMultiplier = 0.3;
          
          return shipData.speed * (1 + driveLevel * speedMultiplier);
      });
      
      const speedBoost = 1 + (activeBoosts[BoostType.DRIVE_TECH_BOOST]?.level || 0) / 100;
      const slowestSpeed = Math.min(...speeds) * speedBoost;
      let missionDuration = Math.floor(36000000 / slowestSpeed); // one way

      if (missionType === MissionType.EXPEDITION) {
          missionDuration = Math.floor(missionDuration * (1.5 + Math.random())); // Expeditions take longer
      }
      
      const arrivalTime = now + missionDuration * 1000;
      let returnTime = now + missionDuration * 2 * 1000;
      let explorationEndTime: number | undefined;

      if(missionType === MissionType.EXPEDITION) {
        const holdTime = (10 + Math.random() * 20) * 60 * 1000; // 10-30 min hold time
        returnTime += holdTime;
      }
      if(missionType === MissionType.COLONIZE) {
          returnTime = arrivalTime; // One-way trip
      }
      if(missionType === MissionType.EXPLORE) {
          explorationEndTime = arrivalTime + 5 * 3600 * 1000;
          returnTime = explorationEndTime + missionDuration * 1000;
      }

      const newMission: FleetMission = { 
          id: `m-${now}`, fleet: missionFleet, missionType, targetCoords, 
          startTime: now, arrivalTime, returnTime, explorationEndTime,
          processedArrival: false, loot: {}, processedExploration: false,
      };

      setFleetMissions(prev => [...prev, newMission]);
      setFleet(prev => {
          const newFleet = { ...prev };
          for (const shipType in missionFleet) newFleet[shipType as ShipType] = (newFleet[shipType as ShipType] || 0) - (missionFleet[shipType as ShipType] || 0);
          return newFleet;
      });
      showNotification(`Flota wysłana na misję (${missionType}) do [${targetCoords}]. Powrót za ${formatTime((returnTime - now)/1000)}.`);
  }, [showNotification, research, fleetMissions, colonies, npcStates, activeBoosts]);

  const handleMarkAsRead = useCallback((messageId: string) => { setMessages(msgs => msgs.map(m => m.id === messageId ? { ...m, isRead: true } : m)); }, []);
  const handleDeleteMessage = useCallback((messageId: string) => { setMessages(msgs => msgs.filter(m => m.id !== messageId)); }, []);
  const handleDeleteAllMessages = useCallback(() => { setMessages([]); }, []);

  const handleTrade = useCallback((resource: keyof Resources, amount: number, tradeType: 'buy' | 'sell') => {
      if (merchantState.status !== MerchantStatus.ACTIVE) {
          showNotification("Handel jest niedostępny.");
          return;
      }
      const rate = merchantState.rates[resource][tradeType];
      const costOrGain = Math.floor(amount * rate);

      if (tradeType === 'buy') {
          if (credits < costOrGain) {
              showNotification("Za mało kredytów!");
              return;
          }
          if (resources[resource] + amount > maxResources[resource]) {
              showNotification("Niewystarczająca pojemność magazynu!");
              return;
          }
          setCredits(c => c - costOrGain);
          setResources(r => ({ ...r, [resource]: r[resource] + amount }));
          showNotification(`Kupiono ${amount.toLocaleString()} ${resource} za ${costOrGain.toLocaleString()} kredytów.`);
      } else { // sell
          if (resources[resource] < amount) {
              showNotification(`Za mało ${resource}!`);
              return;
          }
          setCredits(c => c + costOrGain);
          setResources(r => ({ ...r, [resource]: r[resource] - amount }));
          showNotification(`Sprzedano ${amount.toLocaleString()} ${resource} za ${costOrGain.toLocaleString()} kredytów.`);
      }
  }, [merchantState, credits, resources, maxResources, showNotification]);

  const handleHirePirates = useCallback(() => {
    if (pirateMercenaryState.status !== PirateMercenaryStatus.AVAILABLE) return;

    if (credits < pirateMercenaryState.hireCost) {
        showNotification("Za mało kredytów by wynająć najemników!");
        return;
    }

    const hireCost = pirateMercenaryState.hireCost;
    const hiredFleet = pirateMercenaryState.fleet;

    setCredits(c => c - hireCost);
    setFleet(prev => {
        const newFleet = { ...prev };
        for (const shipType in hiredFleet) {
            newFleet[shipType as ShipType] = (newFleet[shipType as ShipType] || 0) + (hiredFleet[shipType as ShipType] || 0);
        }
        return newFleet;
    });

    const successState: PirateMercenaryState = { ...pirateMercenaryState, status: PirateMercenaryStatus.DEPARTED };
    const newMessage: PirateMessage = { id: `msg-${Date.now()}-pirate-hired`, type: 'pirate', timestamp: Date.now(), isRead: false, subject: 'Wynajęto najemników', pirateState: successState };
    setMessages(m => [newMessage, ...m]);
    
    setPirateMercenaryState(INITIAL_PIRATE_MERCENARY_STATE);
    showNotification("Najemnicy dołączyli do Twojej floty!");
  }, [pirateMercenaryState, credits, showNotification]);


  const handleActionFromGalaxy = useCallback((targetCoords: string, missionType: MissionType) => {
    setFleetTarget({ coords: targetCoords, mission: missionType });
    setActiveView('fleet');
  }, []);

  const handleNpcUpdate = useCallback((updates: Partial<NPCStates>) => {
      setNpcStates(prev => ({...prev, ...updates}));
  }, []);
  
  const handleNpcMissionLaunch = useCallback((mission: NPCFleetMission) => {
      setNpcFleetMissions(prev => [...prev, mission]);
      const npc = npcStates[mission.sourceCoords];
      if (npc) {
        showNotification(`Wykryto flotę gracza ${npc.name} (NPC) z [${mission.sourceCoords}] zmierzającą w Twoją stronę!`);
      }
  }, [npcStates, showNotification]);


  return (
    <div className="min-h-screen bg-gray-900 bg-cover bg-center bg-fixed" style={{backgroundImage: "url('https://picsum.photos/seed/galaxy/1920/1080')"}}>
      {isInfoModalOpen && <InfoModal onClose={() => setIsInfoModalOpen(false)} />}
      {isEncyclopediaOpen && <EncyclopediaModal onClose={() => setIsEncyclopediaOpen(false)} />}
      {isInventoryOpen && <InventoryModal inventory={inventory} onActivateBoost={handleActivateBoost} onClose={() => setIsInventoryOpen(false)} />}
      {ancientArtifactState.status === AncientArtifactStatus.AWAITING_CHOICE && (
        <AncientArtifactModal onChoice={handleArtifactChoice} />
      )}
      <div className="min-h-screen bg-black bg-opacity-70 backdrop-blur-sm">
        <Header 
            resources={resources} 
            productions={productions} 
            maxResources={maxResources}
            credits={credits}
            blackMarketHourlyIncome={blackMarketHourlyIncome} 
            resourceVeinBonus={resourceVeinBonus} 
            inventory={inventory}
            activeBoosts={activeBoosts}
            onInfoClick={() => setIsInfoModalOpen(true)}
            onEncyclopediaClick={() => setIsEncyclopediaOpen(true)}
            onInventoryClick={() => setIsInventoryOpen(true)}
            npcFleetMissions={npcFleetMissions}
        />
        <PirateMercenaryPanel pirateState={pirateMercenaryState} credits={credits} onHire={handleHirePirates} />
        <main className="container mx-auto p-4 md:p-8">
            <Navigation 
                activeView={activeView} 
                setActiveView={setActiveView} 
                unreadMessagesCount={messages.filter(m => !m.isRead).length}
                merchantState={merchantState}
            />
            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-blue-900 border border-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
                    {notification}
                </div>
            )}
            
            <QueuePanel queue={buildQueue} queueCapacity={activeBoosts[BoostType.EXTRA_BUILD_QUEUE]?.level || 1} />

            <div className="mt-6">
                {activeView === 'buildings' && <BuildingsPanel buildings={buildings} research={research} resources={resources} onUpgrade={(type) => handleAddToQueue(type, 'building')} buildQueue={buildQueue} energyEfficiency={productions.energy.efficiency} />}
                {activeView === 'research' && <ResearchPanel buildings={buildings} research={research} resources={resources} onUpgrade={(type) => handleAddToQueue(type, 'research')} buildQueue={buildQueue} />}
                {activeView === 'fleet_upgrades' && <FleetUpgradesPanel buildings={buildings} research={research} shipLevels={shipLevels} resources={resources} onUpgrade={(type) => handleAddToQueue(type, 'ship_upgrade')} buildQueue={buildQueue} />}
                {activeView === 'shipyard' && <ShipyardPanel buildings={buildings} research={research} resources={resources} onBuild={(type, amount) => handleAddToQueue(type, 'ship', amount)} buildQueue={buildQueue} fleet={fleet} />}
                {activeView === 'defense' && <DefensePanel buildings={buildings} research={research} resources={resources} onBuild={(type, amount) => handleAddToQueue(type, 'defense', amount)} buildQueue={buildQueue} defenses={defenses} />}
                {activeView === 'fleet' && <FleetPanel fleet={fleet} fleetMissions={fleetMissions} onSendFleet={handleSendFleet} research={research} initialTarget={fleetTarget} onClearInitialTarget={() => setFleetTarget(null)} spacePlague={spacePlague} colonies={colonies} npcStates={npcStates} />}
                {activeView === 'galaxy' && <GalaxyPanel onAction={handleActionFromGalaxy} npcStates={npcStates} onNpcUpdate={handleNpcUpdate} onNpcMissionLaunch={handleNpcMissionLaunch} debrisFields={debrisFields} colonies={colonies} />}
                {activeView === 'messages' && <MessagesPanel messages={messages} onRead={handleMarkAsRead} onDelete={handleDeleteMessage} onDeleteAll={handleDeleteAllMessages} />}
                {activeView === 'merchant' && merchantState.status === MerchantStatus.ACTIVE && <MerchantPanel merchantState={merchantState} resources={resources} credits={credits} maxResources={maxResources} onTrade={handleTrade} />}
            </div>
           <footer className="text-center text-gray-500 mt-12 pb-4">
              <p>Kosmiczny Władca - Inspirowane OGame</p>
              <p>Stan gry jest automatycznie zapisywany w Twojej przeglądarce.</p>
           </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
