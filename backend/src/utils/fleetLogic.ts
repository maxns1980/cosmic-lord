
import { Fleet, ResearchLevels, ShipType, ResearchType, ActiveBoosts, ShipLevels, BoostType } from '../types';
import { SHIPYARD_DATA, RESEARCH_DATA } from '../constants';

// Simple coordinate parsing
const parseCoords = (coords: string): { galaxy: number, system: number, position: number } => {
    const parts = coords.split(':').map(Number);
    return { galaxy: parts[0], system: parts[1], position: parts[2] };
};

export const calculateDistance = (originCoords: string, targetCoords: string): number => {
    const origin = parseCoords(originCoords);
    const target = parseCoords(targetCoords);

    if (origin.galaxy !== target.galaxy) {
        return Math.abs(origin.galaxy - target.galaxy) * 20000;
    }
    if (origin.system !== target.system) {
        return Math.abs(origin.system - target.system) * 5 * 19 + 2700;
    }
    return Math.abs(origin.position - target.position) * 5 + 1000;
};

export const calculateFleetSpeed = (fleet: Fleet, research: ResearchLevels, shipLevels: ShipLevels, activeBoosts: ActiveBoosts): number => {
    let slowestSpeed = Infinity;
    const driveBoost = activeBoosts[BoostType.DRIVE_TECH_BOOST];

    for (const shipId in fleet) {
        if ((fleet[shipId as ShipType] || 0) > 0) {
            const shipData = SHIPYARD_DATA[shipId as ShipType];
            const driveTechLevel = research[shipData.drive as ResearchType] || 0;
            
            let speedBonusFactor = 0.1; // Default for combustion
            if (shipData.drive === ResearchType.IMPULSE_DRIVE) speedBonusFactor = 0.2;
            if (shipData.drive === ResearchType.HYPERSPACE_DRIVE) speedBonusFactor = 0.3;

            let finalSpeed = shipData.speed * (1 + driveTechLevel * speedBonusFactor);
            
            if (driveBoost && driveBoost.endTime > Date.now()) {
                finalSpeed *= (1 + driveBoost.level / 100);
            }

            if (finalSpeed < slowestSpeed) {
                slowestSpeed = finalSpeed;
            }
        }
    }
    return slowestSpeed === Infinity ? 0 : slowestSpeed;
};

export const calculateTravelTime = (distance: number, fleet: Fleet, research: ResearchLevels, shipLevels: ShipLevels, activeBoosts: ActiveBoosts): number => {
    const fleetSpeed = calculateFleetSpeed(fleet, research, shipLevels, activeBoosts);
    if (fleetSpeed === 0) return Infinity; // Or handle error
    return Math.round((distance * 10) / fleetSpeed);
};

export const calculateFuelConsumption = (distance: number, fleet: Fleet, research: ResearchLevels, travelTime: number): number => {
    let consumption = 0;
    for (const shipId in fleet) {
        const count = fleet[shipId as ShipType] || 0;
        if (count > 0) {
            const shipData = SHIPYARD_DATA[shipId as ShipType];
            const driveTechLevel = research[shipData.drive as ResearchType] || 0;
            const finalSpeed = shipData.speed * (1 + driveTechLevel * 0.1); // Simplified for consumption calc
            const baseConsumption = shipData.requiredEnergy || 10; // Placeholder for now
            
            // This is a simplified OGame-like formula
            const shipConsumption = baseConsumption * count * (distance / 35000) * Math.pow((travelTime * 10 / distance), 2);
            consumption += shipConsumption;
        }
    }
    return Math.round(consumption) + 1; // +1 to ensure at least 1 fuel is used
};
