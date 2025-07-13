
import { SpyReport, Fleet, Resources, Defenses, BuildingLevels, ResearchLevels } from '../types';

interface SpyReportLevels {
    resources: boolean;
    fleet: boolean;
    defenses: boolean;
    buildings: boolean;
    research: boolean;
}

interface SpyReportResult {
    report: Partial<SpyReportLevels>;
    probesLost: number;
}

export const handleSpyMission = (attackerSpyLevel: number, defenderSpyLevel: number, defenderFleetSize: number): SpyReportResult => {
    const levelDifference = attackerSpyLevel - defenderSpyLevel;
    const result: SpyReportResult = {
        report: {},
        probesLost: 0
    };

    // Chance of being detected and losing probes
    const detectionChance = Math.max(0.1, 0.5 - levelDifference * 0.1);
    if (defenderFleetSize > 0 && Math.random() < detectionChance) {
        // Simple loss calculation: lose 1 probe if detected
        result.probesLost = 1; 
        // If detected, the mission might fail completely
        if (Math.random() > 0.5 + levelDifference * 0.05) {
            result.report.resources = false; // Mission failed, no data
            return result;
        }
    }

    // Determine level of detail based on tech difference
    result.report.resources = true;

    if (levelDifference >= 0) {
        result.report.fleet = true;
    }
    if (levelDifference >= 2) {
        result.report.defenses = true;
    }
    if (levelDifference >= 4) {
        result.report.buildings = true;
    }
    if (levelDifference >= 6) {
        result.report.research = true;
    }

    return result;
};
