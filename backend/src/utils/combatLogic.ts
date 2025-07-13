
import { Fleet, Defenses, ResearchLevels, ShipLevels, Resources, ShipType, DefenseType, ResearchType, BattleReport, Loot, Planet, User } from '../types';
import { SHIPYARD_DATA, DEFENSE_DATA, DEBRIS_FIELD_RECOVERY_RATE, PROTECTED_RESOURCES_FACTOR, ALL_GAME_OBJECTS } from '../constants';
import { calculateMaxResources } from './gameLogic';

type CombatUnit = {
    id: ShipType | DefenseType;
    type: 'ship' | 'defense';
    attack: number;
    shield: number;
    hull: number;
    initialCount: number;
    remainingCount: number;
};

const getUnitStats = (unitId: ShipType | DefenseType, research: ResearchLevels, shipLevels: ShipLevels) => {
    const isShip = Object.values(ShipType).includes(unitId as ShipType);
    const data = isShip ? SHIPYARD_DATA[unitId as ShipType] : DEFENSE_DATA[unitId as DefenseType];
    
    const weaponBonus = 1 + (research[ResearchType.WEAPON_TECHNOLOGY] || 0) * 0.1;
    const shieldBonus = 1 + (research[ResearchType.SHIELDING_TECHNOLOGY] || 0) * 0.1;
    const armorBonus = 1 + (research[ResearchType.ARMOR_TECHNOLOGY] || 0) * 0.1;
    const individualShipBonus = isShip ? 1 + (shipLevels[unitId as ShipType] || 0) * 0.1 : 1;

    return {
        attack: data.attack * weaponBonus * individualShipBonus,
        shield: data.shield * shieldBonus * individualShipBonus,
        hull: data.structuralIntegrity * armorBonus * individualShipBonus
    };
};

const createCombatGroup = (units: Fleet | Defenses, research: ResearchLevels, shipLevels: ShipLevels, type: 'ship' | 'defense'): CombatUnit[] => {
    return Object.entries(units).map(([id, count]) => {
        if (!count || count <= 0) return null;
        const stats = getUnitStats(id as ShipType | DefenseType, research, shipLevels);
        return {
            id: id as ShipType | DefenseType,
            type,
            attack: stats.attack,
            shield: stats.shield,
            hull: stats.hull,
            initialCount: count,
            remainingCount: count
        };
    }).filter((u): u is CombatUnit => u !== null);
};


export const simulateCombat = (
    attackerFleet: Fleet,
    defenderFleet: Fleet,
    defenderDefenses: Defenses,
    attackerResearch: ResearchLevels,
    defenderResearch: ResearchLevels,
    attackerShipLevels: ShipLevels,
    defenderShipLevels: ShipLevels,
    defenderPlanet: Planet
) => {
    let attackerGroup = createCombatGroup(attackerFleet, attackerResearch, attackerShipLevels, 'ship');
    let defenderGroup = [
        ...createCombatGroup(defenderFleet, defenderResearch, defenderShipLevels, 'ship'),
        ...createCombatGroup(defenderDefenses, defenderResearch, defenderShipLevels, 'defense')
    ];

    for (let round = 0; round < 6; round++) {
        if (attackerGroup.length === 0 || defenderGroup.length === 0) break;

        const attackerTotalAttack = attackerGroup.reduce((sum, unit) => sum + unit.attack * unit.remainingCount, 0);
        const defenderTotalAttack = defenderGroup.reduce((sum, unit) => sum + unit.attack * unit.remainingCount, 0);

        // Attacker fires
        let remainingAttackerDamage = attackerTotalAttack;
        for (const target of defenderGroup) {
            if (remainingAttackerDamage <= 0) break;
            const damagePerUnit = remainingAttackerDamage / target.remainingCount;
            let destroyedInThisPass = 0;
            for(let i = 0; i < target.remainingCount; i++) {
                let damageToThisUnit = damagePerUnit;
                const shieldAbsorbed = Math.min(target.shield, damageToThisUnit);
                damageToThisUnit -= shieldAbsorbed;
                
                if (damageToThisUnit > target.hull) {
                    destroyedInThisPass++;
                }
            }
             const totalDamageToGroup = damagePerUnit * target.remainingCount;
             const totalShieldAbsorbed = target.shield * target.remainingCount;
             const damageAfterShields = Math.max(0, totalDamageToGroup - totalShieldAbsorbed);
             const unitsDestroyed = Math.min(target.remainingCount, Math.floor(damageAfterShields / target.hull));

            target.remainingCount -= unitsDestroyed;
            remainingAttackerDamage -= totalDamageToGroup;
        }

        // Defender fires
        let remainingDefenderDamage = defenderTotalAttack;
        for (const target of attackerGroup) {
            if (remainingDefenderDamage <= 0) break;
            const damagePerUnit = remainingDefenderDamage / target.remainingCount;
             const totalDamageToGroup = damagePerUnit * target.remainingCount;
             const totalShieldAbsorbed = target.shield * target.remainingCount;
             const damageAfterShields = Math.max(0, totalDamageToGroup - totalShieldAbsorbed);
             const unitsDestroyed = Math.min(target.remainingCount, Math.floor(damageAfterShields / target.hull));
            target.remainingCount -= unitsDestroyed;
            remainingDefenderDamage -= totalDamageToGroup;
        }
        
        attackerGroup = attackerGroup.filter(u => u.remainingCount > 0);
        defenderGroup = defenderGroup.filter(u => u.remainingCount > 0);
    }
    
    // Calculate losses and remaining fleets
    const attackerLosses: Partial<Fleet> = {};
    const attackerFleetAfter: Fleet = {};
    attackerGroup.forEach(u => {
        const lost = u.initialCount - u.remainingCount;
        if(lost > 0) attackerLosses[u.id as ShipType] = lost;
        if(u.remainingCount > 0) attackerFleetAfter[u.id as ShipType] = u.remainingCount;
    });

    const defenderLosses: Partial<Fleet> = {};
    const defenderDefensesLosses: Partial<Defenses> = {};
    const defenderFleetAfter: Fleet = {};
    const defenderDefensesAfter: Defenses = {};
    defenderGroup.forEach(u => {
        const lost = u.initialCount - u.remainingCount;
        if (lost > 0) {
            if(u.type === 'ship') defenderLosses[u.id as ShipType] = lost;
            else defenderDefensesLosses[u.id as DefenseType] = lost;
        }
        if (u.remainingCount > 0) {
             if(u.type === 'ship') defenderFleetAfter[u.id as ShipType] = u.remainingCount;
             else defenderDefensesAfter[u.id as DefenseType] = u.remainingCount;
        }
    });

    // Calculate Debris
    const debrisCreated: Partial<Resources> = { metal: 0, crystal: 0 };
    [...Object.entries(attackerLosses), ...Object.entries(defenderLosses), ...Object.entries(defenderDefensesLosses)].forEach(([id, count]) => {
        const data = ALL_GAME_OBJECTS[id as keyof typeof ALL_GAME_OBJECTS];
        const cost = data.cost(1);
        debrisCreated.metal = (debrisCreated.metal || 0) + (cost.metal * (count || 0) * DEBRIS_FIELD_RECOVERY_RATE);
        debrisCreated.crystal = (debrisCreated.crystal || 0) + (cost.crystal * (count || 0) * DEBRIS_FIELD_RECOVERY_RATE);
    });

    // Calculate Loot
    const maxStorable = calculateMaxResources(defenderPlanet.buildings);
    const protectedRes = {
        metal: maxStorable.metal * PROTECTED_RESOURCES_FACTOR,
        crystal: maxStorable.crystal * PROTECTED_RESOURCES_FACTOR,
        deuterium: maxStorable.deuterium * PROTECTED_RESOURCES_FACTOR,
    };
    const availableLoot: Resources = {
        metal: Math.max(0, defenderPlanet.resources.metal - protectedRes.metal),
        crystal: Math.max(0, defenderPlanet.resources.crystal - protectedRes.crystal),
        deuterium: Math.max(0, defenderPlanet.resources.deuterium - protectedRes.deuterium),
    };
    
    let cargoCapacity = attackerGroup.reduce((sum, unit) => {
        const data = SHIPYARD_DATA[unit.id as ShipType];
        return sum + (data?.cargoCapacity || 0) * unit.remainingCount;
    }, 0);

    const loot: Loot = { metal: 0, crystal: 0, deuterium: 0 };
    const lootRatio = { metal: 0.5, crystal: 0.5, deuterium: 0.5 };

    loot.metal = Math.min(availableLoot.metal * lootRatio.metal, cargoCapacity);
    cargoCapacity -= loot.metal || 0;
    loot.crystal = Math.min(availableLoot.crystal * lootRatio.crystal, cargoCapacity);
    cargoCapacity -= loot.crystal || 0;
    loot.deuterium = Math.min(availableLoot.deuterium * lootRatio.deuterium, cargoCapacity);

    const defenderResourcesAfter = {
        metal: defenderPlanet.resources.metal - (loot.metal || 0),
        crystal: defenderPlanet.resources.crystal - (loot.crystal || 0),
        deuterium: defenderPlanet.resources.deuterium - (loot.deuterium || 0),
    };
    
    const report: Omit<BattleReport, 'id' | 'attackerName' | 'defenderName' | 'isPlayerAttacker'> = {
        targetCoords: '', // to be filled by caller
        attackerFleet,
        defenderFleet,
        defenderDefenses,
        attackerLosses,
        defenderLosses,
        defenderDefensesLosses,
        loot,
        debrisCreated,
    };

    return {
        attackerFleetAfter,
        defenderFleetAfter,
        defenderDefensesAfter,
        defenderResourcesAfter,
        loot,
        debrisCreated,
        report
    };
};