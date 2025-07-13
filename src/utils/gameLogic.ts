

import { BuildingLevels, Resources, BuildingType, BoostType, ActiveBoosts, ResourceVeinBonus } from '../../types';
import { BUILDING_DATA, BASE_STORAGE_CAPACITY, COLONY_INCOME_BONUS_PER_HOUR } from '../../constants';

export const calculateMaxResources = (buildings: BuildingLevels): Resources => {
    const metalCapacity = BUILDING_DATA[BuildingType.METAL_STORAGE].capacity?.(buildings[BuildingType.METAL_STORAGE]) ?? BASE_STORAGE_CAPACITY;
    const crystalCapacity = BUILDING_DATA[BuildingType.CRYSTAL_STORAGE].capacity?.(buildings[BuildingType.CRYSTAL_STORAGE]) ?? BASE_STORAGE_CAPACITY;
    const deuteriumCapacity = BUILDING_DATA[BuildingType.DEUTERIUM_TANK].capacity?.(buildings[BuildingType.DEUTERIUM_TANK]) ?? BASE_STORAGE_CAPACITY;

    return {
      metal: metalCapacity,
      crystal: crystalCapacity,
      deuterium: deuteriumCapacity,
    };
};

export const calculateProductions = (buildings: BuildingLevels, resourceVeinBonus: ResourceVeinBonus, activeBoosts: ActiveBoosts, colonyCount: number, isHomeworld: boolean) => {
    const energyProduction = BUILDING_DATA[BuildingType.SOLAR_PLANT].production?.(buildings[BuildingType.SOLAR_PLANT]) ?? 0;
    
    const energyConsumption = (Object.keys(buildings) as BuildingType[]).reduce((total, type) => {
        const buildingInfo = BUILDING_DATA[type as BuildingType];
        if (buildings[type as BuildingType] > 0) {
           return total + (buildingInfo.energyConsumption?.(buildings[type as BuildingType]) ?? 0);
        }
        return total;
    }, 0);
    
    const efficiency = energyConsumption > 0 ? Math.min(1, energyProduction / energyConsumption) : 1;
    
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
    
    // Add colony bonus only to homeworld
    if(isHomeworld) {
        metalProd += colonyCount * COLONY_INCOME_BONUS_PER_HOUR.metal;
        crystalProd += colonyCount * COLONY_INCOME_BONUS_PER_HOUR.crystal;
        deuteriumProd += colonyCount * COLONY_INCOME_BONUS_PER_HOUR.deuterium;
    }

    return {
        metal: metalProd,
        crystal: crystalProd,
        deuterium: deuteriumProd,
        energy: {
            produced: energyProduction,
            consumed: energyConsumption,
            efficiency: efficiency
        }
    };
};