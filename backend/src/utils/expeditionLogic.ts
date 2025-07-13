

import { Fleet, ExpeditionOutcomeType, Loot, ShipType } from '../types';
import { SHIPYARD_DATA } from '../constants';

interface ExpeditionResult {
    outcome: ExpeditionOutcomeType;
    fleetAfter: Fleet;
    details: {
        fleetSent: Fleet;
        resourcesGained?: Partial<Loot>;
        creditsGained?: number;
        fleetGained?: Partial<Fleet>;
        fleetLost?: Partial<Fleet>;
        delaySeconds?: number;
    }
}

const outcomeProbabilities: { outcome: ExpeditionOutcomeType, weight: number }[] = [
    { outcome: ExpeditionOutcomeType.NOTHING, weight: 30 },
    { outcome: ExpeditionOutcomeType.FIND_RESOURCES, weight: 25 },
    { outcome: ExpeditionOutcomeType.FIND_FLEET, weight: 15 },
    { outcome: ExpeditionOutcomeType.PIRATES, weight: 10 },
    { outcome: ExpeditionOutcomeType.DELAY, weight: 10 },
    { outcome: ExpeditionOutcomeType.ALIENS, weight: 5 },
    { outcome: ExpeditionOutcomeType.FIND_MONEY, weight: 4 },
    { outcome: ExpeditionOutcomeType.LOST, weight: 1 },
];

const selectOutcome = (): ExpeditionOutcomeType => {
    const totalWeight = outcomeProbabilities.reduce((sum, current) => sum + current.weight, 0);
    let random = Math.random() * totalWeight;

    for (const prob of outcomeProbabilities) {
        if (random < prob.weight) {
            return prob.outcome;
        }
        random -= prob.weight;
    }
    return ExpeditionOutcomeType.NOTHING; // Fallback
};

export const handleExpedition = (fleet: Fleet): ExpeditionResult => {
    const outcome = selectOutcome();
    const result: ExpeditionResult = {
        outcome,
        fleetAfter: { ...fleet },
        details: {
            fleetSent: { ...fleet }
        }
    };
    
    const fleetPower = Object.entries(fleet).reduce((power, [shipId, count]) => {
        const shipData = SHIPYARD_DATA[shipId as ShipType];
        return power + ((shipData.attack + shipData.shield + shipData.structuralIntegrity / 10) * (count || 0));
    }, 0);

    switch(outcome) {
        case ExpeditionOutcomeType.FIND_RESOURCES:
            result.details.resourcesGained = {
                metal: Math.floor(Math.random() * fleetPower * 0.5),
                crystal: Math.floor(Math.random() * fleetPower * 0.3),
                deuterium: Math.floor(Math.random() * fleetPower * 0.1)
            };
            break;
        case ExpeditionOutcomeType.FIND_MONEY:
            result.details.creditsGained = Math.floor(Math.random() * fleetPower * 2);
            break;
        case ExpeditionOutcomeType.FIND_FLEET:
            result.details.fleetGained = {};
            if (Math.random() < 0.5) {
                const amount = Math.max(1, Math.floor(fleetPower / SHIPYARD_DATA[ShipType.LIGHT_FIGHTER].attack / 10));
                result.details.fleetGained[ShipType.LIGHT_FIGHTER] = amount;
            } else {
                const amount = Math.max(1, Math.floor(fleetPower / SHIPYARD_DATA[ShipType.CARGO_SHIP].cargoCapacity / 5));
                result.details.fleetGained[ShipType.CARGO_SHIP] = amount;
            }
            break;
        case ExpeditionOutcomeType.PIRATES:
        case ExpeditionOutcomeType.ALIENS:
            const lossPercentage = outcome === ExpeditionOutcomeType.PIRATES ? 0.2 : 0.5; // Pirates are less deadly
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
        case ExpeditionOutcomeType.DELAY:
            result.details.delaySeconds = Math.floor(Math.random() * 3600) + 600; // 10-70 min delay
            break;
        case ExpeditionOutcomeType.LOST:
            result.details.fleetLost = { ...fleet };
            result.fleetAfter = {};
            break;
        case ExpeditionOutcomeType.NOTHING:
        default:
            // No changes
            break;
    }

    return result;
};
