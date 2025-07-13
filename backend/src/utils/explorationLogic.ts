

import { Fleet, ExplorationOutcomeType, Loot, ShipType, Boost, BoostType } from '../types';
import { SHIPYARD_DATA } from '../constants';
import { v4 as uuidv4 } from 'uuid';


interface ExplorationResult {
    outcome: ExplorationOutcomeType;
    fleetAfter: Fleet;
    details: {
        fleetLost?: Partial<Fleet>;
        resourcesGained?: Partial<Loot>;
        fleetGained?: Partial<Fleet>;
        foundBoost?: Boost;
    }
}

const outcomeProbabilities: { outcome: ExplorationOutcomeType, weight: number }[] = [
    { outcome: ExplorationOutcomeType.NOTHING, weight: 40 },
    { outcome: ExplorationOutcomeType.FIND_RESOURCES, weight: 25 },
    { outcome: ExplorationOutcomeType.FIND_SHIP_WRECK, weight: 15 },
    { outcome: ExplorationOutcomeType.HOSTILES, weight: 15 },
    { outcome: ExplorationOutcomeType.FIND_BOOST, weight: 5 },
];

const boostProbabilities: { type: BoostType, level: number, duration: number, weight: number }[] = [
    { type: BoostType.RESOURCE_PRODUCTION_BOOST, level: 20, duration: 86400, weight: 30 }, // 24h
    { type: BoostType.COMBAT_TECH_BOOST, level: 1, duration: 3600, weight: 20 }, // 1h
    { type: BoostType.ARMOR_TECH_BOOST, level: 1, duration: 3600, weight: 20 }, // 1h
    { type: BoostType.DRIVE_TECH_BOOST, level: 20, duration: 3600, weight: 15 }, // 1h
    { type: BoostType.EXTRA_BUILD_QUEUE, level: 2, duration: 86400, weight: 10 }, // 24h
    { type: BoostType.SECTOR_ACTIVITY_SCAN, level: 1, duration: 7200, weight: 5 }, // 2h
];

const selectRandom = <T extends { weight: number }>(probabilities: T[]): T => {
    const totalWeight = probabilities.reduce((sum, current) => sum + current.weight, 0);
    let random = Math.random() * totalWeight;

    for (const prob of probabilities) {
        if (random < prob.weight) {
            return prob;
        }
        random -= prob.weight;
    }
    return probabilities[0]; // Fallback
};

export const handleExploration = (fleet: Fleet): ExplorationResult => {
    const outcomeType = selectRandom(outcomeProbabilities).outcome;
    
    const result: ExplorationResult = {
        outcome: outcomeType,
        fleetAfter: { ...fleet },
        details: {}
    };

    const fleetPower = Object.entries(fleet).reduce((power, [shipId, count]) => {
        const shipData = SHIPYARD_DATA[shipId as ShipType];
        return power + ((shipData.attack + shipData.shield + shipData.structuralIntegrity / 10) * (count || 0));
    }, 0);

    switch(outcomeType) {
        case ExplorationOutcomeType.FIND_RESOURCES:
            result.details.resourcesGained = {
                metal: Math.floor(Math.random() * fleetPower * 0.2),
                crystal: Math.floor(Math.random() * fleetPower * 0.1),
            };
            break;
        case ExplorationOutcomeType.FIND_BOOST:
            const randomBoost = selectRandom(boostProbabilities);
            result.details.foundBoost = {
                id: uuidv4(),
                ...randomBoost
            };
            break;
        case ExplorationOutcomeType.FIND_SHIP_WRECK:
            result.details.fleetGained = {};
            const shipToFind = Math.random() < 0.7 ? ShipType.LIGHT_FIGHTER : ShipType.CARGO_SHIP;
            const amount = Math.max(1, Math.floor(fleetPower / (SHIPYARD_DATA[shipToFind].structuralIntegrity / 100)));
            result.details.fleetGained[shipToFind] = amount;
            // Add found ships to the returning fleet
            result.fleetAfter[shipToFind] = (result.fleetAfter[shipToFind] || 0) + amount;
            break;
        case ExplorationOutcomeType.HOSTILES:
            const lossPercentage = 0.15; // 15% loss
            result.details.fleetLost = {};
            result.fleetAfter = {};
            for (const ship in fleet) {
                const sType = ship as ShipType;
                const initialCount = fleet[sType] || 0;
                const lostCount = Math.floor(initialCount * lossPercentage * Math.random());
                if(lostCount > 0) {
                    result.details.fleetLost[sType] = lostCount;
                }
                const remaining = initialCount - lostCount;
                if (remaining > 0) {
                    result.fleetAfter[sType] = remaining;
                }
            }
            break;
        case ExplorationOutcomeType.NOTHING:
        default:
            // No changes
            break;
    }
    
    return result;
};
