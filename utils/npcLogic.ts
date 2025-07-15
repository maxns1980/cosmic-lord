import { NPCState, BuildingType, Resources, BuildingLevels, ResearchLevels, ResearchType, NPCPersonality, ShipType, DefenseType, NPCFleetMission, MissionType, Fleet } from '../types.ts';
import { BUILDING_DATA, BASE_STORAGE_CAPACITY, RESEARCH_DATA, SHIPYARD_DATA, DEFENSE_DATA } from '../constants.ts';

const calculateNpcProductions = (buildings: BuildingLevels) => {
    const energyProduction = BUILDING_DATA[BuildingType.SOLAR_PLANT].production?.(buildings[BuildingType.SOLAR_PLANT]) ?? 0;
    
    const energyConsumption = (Object.keys(buildings) as BuildingType[]).reduce((total, type) => {
        const buildingInfo = BUILDING_DATA[type];
        if (buildings[type] > 0) {
           return total + (buildingInfo.energyConsumption?.(buildings[type]) ?? 0);
        }
        return total;
    }, 0);
    
    const efficiency = energyProduction >= energyConsumption ? 1 : Math.max(0, energyProduction / energyConsumption);
    
    const metalProd = (BUILDING_DATA[BuildingType.METAL_MINE].production?.(buildings[BuildingType.METAL_MINE]) ?? 0) * efficiency;
    const crystalProd = (BUILDING_DATA[BuildingType.CRYSTAL_MINE].production?.(buildings[BuildingType.CRYSTAL_MINE]) ?? 0) * efficiency;
    const deuteriumProd = (BUILDING_DATA[BuildingType.DEUTERIUM_SYNTHESIZER].production?.(buildings[BuildingType.DEUTERIUM_SYNTHESIZER]) ?? 0) * efficiency;

    return {
        metal: metalProd,
        crystal: crystalProd,
        deuterium: deuteriumProd,
    };
};

const calculateNpcMaxResources = (buildings: BuildingLevels): Resources => {
    return {
      metal: BUILDING_DATA[BuildingType.METAL_STORAGE].capacity?.(buildings[BuildingType.METAL_STORAGE]) || BASE_STORAGE_CAPACITY,
      crystal: BUILDING_DATA[BuildingType.CRYSTAL_STORAGE].capacity?.(buildings[BuildingType.CRYSTAL_STORAGE]) || BASE_STORAGE_CAPACITY,
      deuterium: BUILDING_DATA[BuildingType.DEUTERIUM_TANK].capacity?.(buildings[BuildingType.DEUTERIUM_TANK]) || BASE_STORAGE_CAPACITY,
    };
};

const canAfford = (resources: Resources, cost: Resources) => {
    return resources.metal >= cost.metal && resources.crystal >= cost.crystal && resources.deuterium >= cost.deuterium;
}

const checkNpcRequirements = (requirements: Partial<BuildingLevels & ResearchLevels> | undefined, buildings: BuildingLevels, research: ResearchLevels): boolean => {
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


// Simplified AI logic for spending resources
const spendResourcesAI = (npc: NPCState): NPCState => {
    const buildPriorities = {
        [NPCPersonality.AGGRESSIVE]: [
            // End-Game Units
            { type: ShipType.BATTLECRUISER, kind: 'ship', amount: 1 },
             // Capital Ships
            { type: ShipType.DESTROYER, kind: 'ship', amount: 1 },
            { type: ShipType.BATTLESHIP, kind: 'ship', amount: 1 },
            { type: ShipType.CRUISER, kind: 'ship', amount: 2 },
             // Research
            { type: ResearchType.WEAPON_TECHNOLOGY, kind: 'research' },
            { type: ResearchType.ARMOR_TECHNOLOGY, kind: 'research' },
            { type: ResearchType.SHIELDING_TECHNOLOGY, kind: 'research' },
            { type: ResearchType.COMBUSTION_DRIVE, kind: 'research' },
            { type: ResearchType.IMPULSE_DRIVE, kind: 'research' },
            { type: ResearchType.HYPERSPACE_DRIVE, kind: 'research' },
            // Ships
            { type: ShipType.HEAVY_FIGHTER, kind: 'ship', amount: 2 },
            { type: ShipType.MEDIUM_FIGHTER, kind: 'ship', amount: 5 },
            { type: ShipType.LIGHT_FIGHTER, kind: 'ship', amount: 10 },
            { type: ShipType.CARGO_SHIP, kind: 'ship', amount: 2 },
            // Defenses
            { type: DefenseType.PLASMA_TURRET, kind: 'defense', amount: 2 },
            { type: DefenseType.HEAVY_LASER_CANNON, kind: 'defense', amount: 5 },
            { type: DefenseType.LIGHT_LASER_CANNON, kind: 'defense', amount: 10 },
            // Research
            { type: ResearchType.SPY_TECHNOLOGY, kind: 'research' },
            { type: ResearchType.LASER_TECHNOLOGY, kind: 'research' },
            // Buildings
            { type: BuildingType.SHIPYARD, kind: 'building' },
            { type: BuildingType.RESEARCH_LAB, kind: 'building' },
            { type: BuildingType.SOLAR_PLANT, kind: 'building' },
            { type: BuildingType.DEUTERIUM_SYNTHESIZER, kind: 'building' },
            { type: BuildingType.METAL_MINE, kind: 'building' },
            { type: BuildingType.CRYSTAL_MINE, kind: 'building' },
        ],
        [NPCPersonality.ECONOMIC]: [
            // Buildings
            { type: BuildingType.METAL_MINE, kind: 'building' },
            { type: BuildingType.CRYSTAL_MINE, kind: 'building' },
            { type: BuildingType.DEUTERIUM_SYNTHESIZER, kind: 'building' },
            { type: BuildingType.SOLAR_PLANT, kind: 'building' },
            { type: BuildingType.METAL_STORAGE, kind: 'building' },
            { type: BuildingType.CRYSTAL_STORAGE, kind: 'building' },
            // Ships for transport
            { type: ShipType.HEAVY_CARGO_SHIP, kind: 'ship', amount: 1 },
            { type: ShipType.MEDIUM_CARGO_SHIP, kind: 'ship', amount: 2 },
            // Defense
            { type: DefenseType.ROCKET_LAUNCHER, kind: 'defense', amount: 20 },
            { type: DefenseType.LIGHT_LASER_CANNON, kind: 'defense', amount: 10 },
            // Research
            { type: ResearchType.ENERGY_TECHNOLOGY, kind: 'research' },
            { type: BuildingType.RESEARCH_LAB, kind: 'building' },
            { type: BuildingType.SHIPYARD, kind: 'building' },
        ],
        [NPCPersonality.BALANCED]: [
             // Buildings
            { type: BuildingType.METAL_MINE, kind: 'building' },
            { type: BuildingType.CRYSTAL_MINE, kind: 'building' },
            { type: BuildingType.SOLAR_PLANT, kind: 'building' },
            // Ships
            { type: ShipType.MEDIUM_FIGHTER, kind: 'ship', amount: 3 },
            { type: ShipType.LIGHT_FIGHTER, kind: 'ship', amount: 5 },
            { type: ShipType.CARGO_SHIP, kind: 'ship', amount: 3 },
            // Defense
            { type: DefenseType.ROCKET_LAUNCHER, kind: 'defense', amount: 10 },
            { type: DefenseType.LIGHT_LASER_CANNON, kind: 'defense', amount: 5 },
            // Research & supporting buildings
            { type: BuildingType.DEUTERIUM_SYNTHESIZER, kind: 'building' },
            { type: ResearchType.ARMOR_TECHNOLOGY, kind: 'research' },
            { type: ResearchType.COMBUSTION_DRIVE, kind: 'research' },
            { type: ResearchType.WEAPON_TECHNOLOGY, kind: 'research' },
            { type: BuildingType.SHIPYARD, kind: 'building' },
            { type: BuildingType.RESEARCH_LAB, kind: 'building' },
        ],
    };

    let updatedNpc = { ...npc, resources: { ...npc.resources } };

    // Try to build something up to 5 times per evolution cycle
    for (let i = 0; i < 5; i++) {
        let hasBuilt = false;
        for (const item of buildPriorities[npc.personality]) {
            let cost: Resources;
            let levelOrAmount: number;
            let data;
            let requirementsMet = false;

            switch(item.kind) {
                case 'building':
                    levelOrAmount = updatedNpc.buildings[item.type as BuildingType] + 1;
                    data = BUILDING_DATA[item.type as BuildingType];
                    requirementsMet = checkNpcRequirements(data.requirements, updatedNpc.buildings, updatedNpc.research);
                    cost = data.cost(levelOrAmount);
                    if (requirementsMet && canAfford(updatedNpc.resources, cost)) {
                        updatedNpc.buildings[item.type as BuildingType]++;
                        hasBuilt = true;
                    }
                    break;
                case 'research':
                     levelOrAmount = updatedNpc.research[item.type as ResearchType] + 1;
                     data = RESEARCH_DATA[item.type as ResearchType];
                     requirementsMet = checkNpcRequirements(data.requirements, updatedNpc.buildings, updatedNpc.research);
                     cost = data.cost(levelOrAmount);
                     if (requirementsMet && canAfford(updatedNpc.resources, cost)) {
                         updatedNpc.research[item.type as ResearchType]++;
                         hasBuilt = true;
                     }
                     break;
                case 'ship':
                    levelOrAmount = item.amount || 1;
                    data = SHIPYARD_DATA[item.type as ShipType];
                    requirementsMet = checkNpcRequirements(data.requirements, updatedNpc.buildings, updatedNpc.research);
                    cost = data.cost(1);
                    const totalCost = { metal: cost.metal * levelOrAmount, crystal: cost.crystal * levelOrAmount, deuterium: cost.deuterium * levelOrAmount };
                    if (requirementsMet && canAfford(updatedNpc.resources, totalCost)) {
                        updatedNpc.fleet[item.type as ShipType] = (updatedNpc.fleet[item.type as ShipType] || 0) + levelOrAmount;
                        cost = totalCost; // for resource deduction
                        hasBuilt = true;
                    }
                    break;
                case 'defense':
                    levelOrAmount = item.amount || 1;
                    data = DEFENSE_DATA[item.type as DefenseType];
                    requirementsMet = checkNpcRequirements(data.requirements, updatedNpc.buildings, updatedNpc.research);
                    cost = data.cost(1);
                    const totalDefenseCost = { metal: cost.metal * levelOrAmount, crystal: cost.crystal * levelOrAmount, deuterium: cost.deuterium * levelOrAmount };
                     if (requirementsMet && canAfford(updatedNpc.resources, totalDefenseCost)) {
                        updatedNpc.defenses[item.type as DefenseType] = (updatedNpc.defenses[item.type as DefenseType] || 0) + levelOrAmount;
                        cost = totalDefenseCost; // for resource deduction
                        hasBuilt = true;
                    }
                    break;
            }
            
            if (hasBuilt) {
                updatedNpc.resources.metal -= cost.metal;
                updatedNpc.resources.crystal -= cost.crystal;
                updatedNpc.resources.deuterium -= cost.deuterium;
                break; // Exit after one successful build per loop iteration
            }
        }
        if (!hasBuilt) break; // If nothing could be built, stop trying
    }

    return updatedNpc;
}

const missionDecisionAI = (npc: NPCState, sourceCoords: string): NPCFleetMission | null => {
     const militaryPower = Object.entries(npc.fleet).reduce((power, [shipId, count]) => {
        const shipData = SHIPYARD_DATA[shipId as ShipType];
        if (shipData && count) {
            const finalAttack = shipData.attack * (1 + (npc.research[ResearchType.WEAPON_TECHNOLOGY] || 0) * 0.1);
            const finalShield = shipData.shield * (1 + (npc.research[ResearchType.SHIELDING_TECHNOLOGY] || 0) * 0.1);
            const finalIntegrity = shipData.structuralIntegrity * (1 + (npc.research[ResearchType.ARMOR_TECHNOLOGY] || 0) * 0.1);
            return power + (finalAttack + finalShield + finalIntegrity / 10) * count;
        }
        return power;
    }, 0);

    // Aggressive NPCs are more likely to act
    if (npc.personality === NPCPersonality.AGGRESSIVE && militaryPower > 15000) {
        // 5% chance to attack
        if (Math.random() < 0.05) {
            const attackingFleet: Partial<Fleet> = {};

            const bcToSend = Math.floor((npc.fleet[ShipType.BATTLECRUISER] || 0) * 0.5);
            if (bcToSend > 0) attackingFleet[ShipType.BATTLECRUISER] = bcToSend;

            const destToSend = Math.floor((npc.fleet[ShipType.DESTROYER] || 0) * 0.5);
            if (destToSend > 0) attackingFleet[ShipType.DESTROYER] = destToSend;

            const bsToSend = Math.floor((npc.fleet[ShipType.BATTLESHIP] || 0) * 0.5);
            if (bsToSend > 0) attackingFleet[ShipType.BATTLESHIP] = bsToSend;

            const crToSend = Math.floor((npc.fleet[ShipType.CRUISER] || 0) * 0.5);
            if (crToSend > 0) attackingFleet[ShipType.CRUISER] = crToSend;
            
            const hfToSend = Math.floor((npc.fleet[ShipType.HEAVY_FIGHTER] || 0) * 0.5);
            if (hfToSend > 0) attackingFleet[ShipType.HEAVY_FIGHTER] = hfToSend;
            
            const mfToSend = Math.floor((npc.fleet[ShipType.MEDIUM_FIGHTER] || 0) * 0.5);
            if (mfToSend > 0) attackingFleet[ShipType.MEDIUM_FIGHTER] = mfToSend;
            
            const lfToSend = Math.floor((npc.fleet[ShipType.LIGHT_FIGHTER] || 0) * 0.5);
            if (lfToSend > 0) attackingFleet[ShipType.LIGHT_FIGHTER] = lfToSend;
            
            const cargoToSend = Math.floor((npc.fleet[ShipType.CARGO_SHIP] || 0) * 0.5);
            if (cargoToSend > 0) attackingFleet[ShipType.CARGO_SHIP] = cargoToSend;


            if (Object.values(attackingFleet).some(count => count && count > 0)) {
                const now = Date.now();
                const missionDuration = 30 * 60 * 1000; // 30 minutes for simplicity

                return {
                    id: `npc-m-${now}-${Math.random()}`,
                    sourceCoords,
                    fleet: attackingFleet,
                    missionType: MissionType.ATTACK,
                    startTime: now,
                    arrivalTime: now + missionDuration
                };
            }
        } 
        // 10% chance to spy
        else if (Math.random() < 0.1) {
             const hasProbes = (npc.research[ResearchType.SPY_TECHNOLOGY] || 0) > 0 && (npc.fleet[ShipType.SPY_PROBE] || 0) > 0;
             if (hasProbes) {
                const now = Date.now();
                const missionDuration = 5 * 60 * 1000; // 5 minutes for spy
                 return {
                    id: `npc-m-${now}-${Math.random()}`,
                    sourceCoords,
                    fleet: { [ShipType.SPY_PROBE]: 1 },
                    missionType: MissionType.SPY,
                    startTime: now,
                    arrivalTime: now + missionDuration
                };
             }
        }
    }
    return null;
}


export const evolveNpc = (npc: NPCState, offlineSeconds: number, coords: string): { updatedNpc: NPCState, mission: NPCFleetMission | null } => {
    let evolvedNpc = {
        ...npc,
        resources: { ...npc.resources },
        buildings: { ...npc.buildings },
        research: { ...npc.research },
        fleet: { ...npc.fleet },
        defenses: { ...npc.defenses },
    };

    // 1. Resource Production
    const productions = calculateNpcProductions(evolvedNpc.buildings);
    const maxResources = calculateNpcMaxResources(evolvedNpc.buildings);

    evolvedNpc.resources.metal = Math.min(maxResources.metal, evolvedNpc.resources.metal + (productions.metal / 3600) * offlineSeconds);
    evolvedNpc.resources.crystal = Math.min(maxResources.crystal, evolvedNpc.resources.crystal + (productions.crystal / 3600) * offlineSeconds);
    evolvedNpc.resources.deuterium = Math.min(maxResources.deuterium, evolvedNpc.resources.deuterium + (productions.deuterium / 3600) * offlineSeconds);

    // 2. AI spending resources
    evolvedNpc = spendResourcesAI(evolvedNpc);

    // 3. AI deciding to launch a mission
    const mission = missionDecisionAI(evolvedNpc, coords);

    // 4. Update timestamp
    evolvedNpc.lastUpdateTime = Date.now();

    return { updatedNpc: evolvedNpc, mission };
};