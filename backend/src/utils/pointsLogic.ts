
import { User, Planet, BuildingType, ResearchType, ShipType, DefenseType, Resources } from '../types';
import { ALL_GAME_OBJECTS } from '../constants';

const getResourceValue = (cost: Resources): number => {
    return (cost.metal || 0) + (cost.crystal || 0) + (cost.deuterium || 0);
};

export const calculatePlayerPoints = (user: User, planets: Planet[]): number => {
    let totalResourceValue = 0;

    // 1. Calculate points from research
    for (const res of Object.keys(user.research) as ResearchType[]) {
        const level = user.research[res];
        if (level > 0) {
            const data = ALL_GAME_OBJECTS[res];
            for (let i = 1; i <= level; i++) {
                totalResourceValue += getResourceValue(data.cost(i));
            }
        }
    }

    // 2. Calculate points from ship upgrades
    for (const ship of Object.keys(user.shipLevels) as ShipType[]) {
        const level = user.shipLevels[ship];
        if (level > 0) {
            const data = ALL_GAME_OBJECTS[ship];
             for (let i = 1; i <= level; i++) {
                totalResourceValue += getResourceValue(data.cost(i));
            }
        }
    }
    
    // 3. Calculate points from buildings, fleet, and defenses on all planets
    for (const planet of planets) {
        // Buildings
        for (const building of Object.keys(planet.buildings) as BuildingType[]) {
            const level = planet.buildings[building];
            if (level > 0) {
                const data = ALL_GAME_OBJECTS[building];
                for (let i = 1; i <= level; i++) {
                    totalResourceValue += getResourceValue(data.cost(i));
                }
            }
        }

        // Fleet
        for (const ship of Object.keys(planet.fleet) as ShipType[]) {
            const count = planet.fleet[ship] || 0;
            if (count > 0) {
                const data = ALL_GAME_OBJECTS[ship];
                totalResourceValue += getResourceValue(data.cost(1)) * count;
            }
        }

        // Defenses
        for (const defense of Object.keys(planet.defenses) as DefenseType[]) {
            const count = planet.defenses[defense] || 0;
            if (count > 0) {
                const data = ALL_GAME_OBJECTS[defense];
                totalResourceValue += getResourceValue(data.cost(1)) * count;
            }
        }
    }

    // Convert total resource value to points (1 point per 1000 resources)
    return totalResourceValue / 1000;
};
