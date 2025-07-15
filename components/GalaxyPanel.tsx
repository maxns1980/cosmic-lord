import React, { useState, useEffect, useCallback } from 'react';
import { MissionType, NPCStates, NPCPersonality, NPCState, NPCFleetMission, DebrisField, Colony } from '../types.ts';
import { INITIAL_NPC_STATE, PLAYER_HOME_COORDS } from '../constants.ts';
import { evolveNpc } from '../utils/npcLogic.ts';

interface GalaxyPanelProps {
    onAction: (targetCoords: string, missionType: MissionType) => void;
    npcStates: NPCStates;
    onNpcUpdate: (updates: Partial<NPCStates>) => void;
    onNpcMissionLaunch: (mission: NPCFleetMission) => void;
    debrisFields: Record<string, DebrisField>;
    colonies: Colony[];
}

// Simple seeded random function for consistent galaxy generation
const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const formatNumber = (num: number) => Math.floor(num).toLocaleString('pl-PL');

const FAKE_PLAYER_NAMES = ['Zenith', 'Nova', 'Orion', 'Cygnus', 'Draco', 'Lyra', 'Aquila', 'Centurion', 'Void', 'Stalker', 'Pulsar', 'Goliath'];

const getPlanetImage = (seed: number) => {
    const planetTypeSeed = seededRandom(seed);
    if (planetTypeSeed > 0.8) return '🌋'; // Volcanic
    if (planetTypeSeed > 0.6) return '🧊'; // Ice
    if (planetTypeSeed > 0.4) return '🏜️'; // Desert
    return '🪐'; // Temperate
}

const GalaxyPanel: React.FC<GalaxyPanelProps> = ({ onAction, npcStates, onNpcUpdate, onNpcMissionLaunch, debrisFields, colonies }) => {
    const [galaxy, setGalaxy] = useState(1);
    const [system, setSystem] = useState(42);

    useEffect(() => {
        const now = Date.now();
        const updates: Partial<NPCStates> = {};
        let hasChanges = false;
        
        for (let i = 1; i <= 15; i++) {
            const position = i;
            const coords = `${galaxy}:${system}:${position}`;
            const planetSeed = galaxy * 1000000 + system * 1000 + position;
            const isPlayerPlanet = coords === PLAYER_HOME_COORDS;
            
            if (isPlayerPlanet) continue;
            
            const isOccupiedByNpc = seededRandom(planetSeed) > 0.6;
            if (!isOccupiedByNpc) continue;

            const existingNpc = npcStates[coords];
            if (!existingNpc) {
                const nameIndex = Math.floor(seededRandom(planetSeed * 2) * FAKE_PLAYER_NAMES.length);
                const personalitySeed = seededRandom(planetSeed * 3);
                let personality = NPCPersonality.BALANCED;
                if (personalitySeed > 0.66) personality = NPCPersonality.AGGRESSIVE;
                else if (personalitySeed < 0.33) personality = NPCPersonality.ECONOMIC;

                updates[coords] = {
                    ...INITIAL_NPC_STATE,
                    lastUpdateTime: now,
                    name: FAKE_PLAYER_NAMES[nameIndex],
                    image: getPlanetImage(planetSeed * 4),
                    personality: personality
                };
                hasChanges = true;
            } else {
                const offlineTimeMs = now - existingNpc.lastUpdateTime;
                // Evolve if more than 5 minutes passed
                if (offlineTimeMs > 5 * 60 * 1000) {
                    const evolutionResult = evolveNpc(existingNpc, offlineTimeMs / 1000, coords);
                    updates[coords] = evolutionResult.updatedNpc;
                    hasChanges = true;

                    if (evolutionResult.mission) {
                        onNpcMissionLaunch(evolutionResult.mission);
                    }
                }
            }
        }

        if (hasChanges) {
            onNpcUpdate(updates);
        }

    }, [galaxy, system, npcStates, onNpcUpdate, onNpcMissionLaunch]);

    const handleSystemChange = (delta: number) => {
        let newSystem = system + delta;
        let newGalaxy = galaxy;
        if (newSystem > 499) {
            newSystem = 1;
            newGalaxy++;
        }
        if (newSystem < 1) {
            newSystem = 499;
            newGalaxy = Math.max(1, newGalaxy - 1);
        }
        setSystem(newSystem);
        setGalaxy(newGalaxy);
    };

    const planets = Array.from({ length: 15 }, (_, i) => {
        const position = i + 1;
        const coords = `${galaxy}:${system}:${position}`;
        const isPlayerPlanet = coords === PLAYER_HOME_COORDS;
        const playerColony = colonies.find(c => c.id === coords);
        const npc = npcStates[coords];
        const debris = debrisFields[coords];
        
        let planetData = null;
        if (isPlayerPlanet) {
            planetData = { name: 'Planeta Matka', player: 'Ty', image: '🌍' };
        } else if (playerColony) {
            planetData = { name: playerColony.name, player: 'Ty (Kolonia)', image: '🌍' };
        } else if (npc) {
            planetData = { name: `Planeta ${npc.name}`, player: `${npc.name} (NPC)`, image: npc.image };
        }

        return { coords, isPlayerPlanet, isPlayerColony: !!playerColony, planetData, position, debris };
    });

    const expeditionCoords = `${galaxy}:${system}:16`;

    return (
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6">
            <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3">Galaktyka</h2>
            
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-3 rounded-lg mb-6">
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleSystemChange(-1)} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-md font-bold">Poprzedni</button>
                    <input type="number" value={galaxy} onChange={e => setGalaxy(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-center"/>
                    <span className="font-bold">:</span>
                    <input type="number" value={system} onChange={e => setSystem(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-center"/>
                    <button onClick={() => handleSystemChange(1)} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-md font-bold">Następny</button>
                </div>
                <h3 className="text-xl font-bold text-white mt-4 md:mt-0">Układ: [{galaxy}:{system}]</h3>
            </div>

            <div className="space-y-3">
                {planets.map((planet) => (
                    <div key={planet.coords} className={`p-3 rounded-lg flex flex-col md:flex-row items-center justify-between ${planet.isPlayerPlanet || planet.isPlayerColony ? 'bg-blue-900 bg-opacity-50 border-l-4 border-cyan-400' : 'bg-gray-900 bg-opacity-60'}`}>
                        <div className="flex items-center font-semibold w-full md:w-2/5">
                            <span className="text-4xl mr-4 w-10 text-center">{planet.planetData?.image || '⚫'}</span>
                            <div className="flex-1">
                                <p className="text-lg text-white">Pozycja {planet.position} [{planet.coords}]</p>
                                {planet.planetData ? (
                                    <p className="text-sm text-gray-400">Gracz: {planet.planetData.player}</p>
                                ) : (
                                    <p className="text-sm text-gray-500">[Pusta Przestrzeń]</p>
                                )}
                            </div>
                        </div>
                        {planet.debris && ((planet.debris.metal || 0) > 1 || (planet.debris.crystal || 0) > 1) && (
                            <div className="flex items-center text-sm text-yellow-300 mx-4">
                               <span className="text-xl mr-2">♻️</span>
                               <div>
                                 <p>Metal: {formatNumber(planet.debris.metal || 0)}</p>
                                 <p>Kryształ: {formatNumber(planet.debris.crystal || 0)}</p>
                               </div>
                            </div>
                        )}
                        <div className="flex items-center space-x-2 mt-3 md:mt-0">
                            {planet.debris && ((planet.debris.metal || 0) > 1 || (planet.debris.crystal || 0) > 1) && (
                                <button onClick={() => onAction(planet.coords, MissionType.HARVEST)} className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Zbieraj</button>
                            )}
                            {planet.planetData && !planet.isPlayerPlanet && !planet.isPlayerColony && (
                                <>
                                    <button onClick={() => onAction(planet.coords, MissionType.SPY)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Szpieguj</button>
                                    <button onClick={() => onAction(planet.coords, MissionType.ATTACK)} className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Atakuj</button>
                                </>
                            )}
                             {(planet.isPlayerPlanet || planet.isPlayerColony) && (
                                <span className="px-4 py-2 text-cyan-400 font-bold">{planet.isPlayerPlanet ? 'Twoja Planeta' : 'Twoja Kolonia'}</span>
                            )}
                             {!planet.planetData && (
                                <>
                                    <button onClick={() => onAction(planet.coords, MissionType.EXPLORE)} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Eksploruj</button>
                                    <button onClick={() => onAction(planet.coords, MissionType.COLONIZE)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Kolonizuj</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                 <div key={expeditionCoords} className="p-3 rounded-lg flex flex-col md:flex-row items-center justify-between bg-purple-900 bg-opacity-40 border-l-4 border-purple-500">
                    <div className="flex items-center font-semibold w-full md:w-2/5">
                        <span className="text-4xl mr-4 w-10 text-center">🌌</span>
                        <div className="flex-1">
                            <p className="text-lg text-white">Pozycja 16 [{expeditionCoords}]</p>
                            <p className="text-sm text-purple-300">[Nieznana Przestrzeń]</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 md:mt-0">
                        <button onClick={() => onAction(expeditionCoords, MissionType.EXPEDITION)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Wyprawa</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GalaxyPanel;