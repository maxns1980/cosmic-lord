

import React, { useState, useEffect, useCallback } from 'react';
import { MissionType, DebrisField, Planet, GalaxyPlanet, Alliance } from '../types';

interface GalaxyPanelProps {
    onAction: (targetCoords: string, missionType: MissionType) => void;
    colonies: Planet[];
    token: string | null;
    playerAlliance: Alliance | undefined;
}

const formatNumber = (num: number) => Math.floor(num).toLocaleString('pl-PL');

const getPlayerRelationClass = (planetData: GalaxyPlanet, playerAllianceId: string | undefined): string => {
    if (!planetData.username || !playerAllianceId) return 'text-red-400'; // Neutral/Enemy
    if (planetData.allianceId === playerAllianceId) return 'text-green-400'; // Ally
    // Future: Add logic for allied alliances
    return 'text-red-400'; // Neutral/Enemy
}

const getPlanetImage = (username?: string) => {
    if (!username) return '⚫'; // Empty space
    const seed = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const planetTypeSeed = (Math.sin(seed) * 10000) % 1;
    if (planetTypeSeed > 0.8) return '🌋'; // Volcanic
    if (planetTypeSeed > 0.6) return '🧊'; // Ice
    if (planetTypeSeed > 0.4) return '🏜️'; // Desert
    return '🪐'; // Temperate
}

const GalaxyPanel: React.FC<GalaxyPanelProps> = ({ onAction, colonies, token, playerAlliance }) => {
    const [galaxy, setGalaxy] = useState(1);
    const [system, setSystem] = useState(42);
    const [systemData, setSystemData] = useState<GalaxyPlanet[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchSystemData = useCallback(async (g: number, s: number) => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/galaxy/${g}/${s}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch galaxy data');
            }
            const data: GalaxyPlanet[] = await response.json();
            setSystemData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSystemData(galaxy, system);
    }, [galaxy, system, fetchSystemData]);

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
        const planetData = systemData.find(p => p.coordinates === coords);
        return { 
            coords, 
            data: planetData,
            position
        };
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

            {isLoading ? <div className="text-center p-8">Ładowanie danych układu...</div> : (
            <div className="space-y-3">
                {planets.map(({ coords, data, position }) => {
                    const isMyPlanet = colonies.some(c => c.coordinates === coords);
                    const hasDebris = data?.type === 'debris' || (data?.type === 'player' && data.debris && (data.debris.metal || 0) > 1);

                    return (
                        <div key={coords} className={`p-3 rounded-lg flex flex-col md:flex-row items-center justify-between ${isMyPlanet ? 'bg-blue-900 bg-opacity-50 border-l-4 border-cyan-400' : 'bg-gray-900 bg-opacity-60'}`}>
                            <div className="flex items-center font-semibold w-full md:w-2/5">
                                <span className="text-4xl mr-4 w-10 text-center">{getPlanetImage(data?.username)}</span>
                                <div className="flex-1">
                                    <p className="text-lg text-white">Pozycja {position} [{coords}]</p>
                                    {data?.type === 'player' && data.username ? (
                                        <p className="text-sm text-gray-400">
                                            Gracz: <span className={isMyPlanet ? 'text-cyan-300' : getPlayerRelationClass(data, playerAlliance?.id)}>{data.username}</span>
                                            {data.allianceTag && <span className={`ml-2 ${getPlayerRelationClass(data, playerAlliance?.id)}`}>[{data.allianceTag}]</span>}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500">[Pusta Przestrzeń]</p>
                                    )}
                                </div>
                            </div>
                            {hasDebris && (
                                <div className="flex items-center text-sm text-yellow-300 mx-4">
                                <span className="text-xl mr-2">♻️</span>
                                <div>
                                    <p>Metal: {formatNumber(data?.debris?.metal || 0)}</p>
                                    <p>Kryształ: {formatNumber(data?.debris?.crystal || 0)}</p>
                                </div>
                                </div>
                            )}
                            <div className="flex items-center space-x-2 mt-3 md:mt-0">
                                {hasDebris && (
                                    <button onClick={() => onAction(coords, MissionType.HARVEST)} className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Zbieraj</button>
                                )}
                                {data?.type === 'player' && !isMyPlanet && (
                                    <>
                                        <button onClick={() => onAction(coords, MissionType.SPY)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Szpieguj</button>
                                        <button onClick={() => onAction(coords, MissionType.ATTACK)} className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Atakuj</button>
                                    </>
                                )}
                                {isMyPlanet && (
                                    <span className="px-4 py-2 text-cyan-400 font-bold">Twoja Planeta</span>
                                )}
                                {data?.type === 'empty' && (
                                    <>
                                        <button onClick={() => onAction(coords, MissionType.EXPLORE)} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Eksploruj</button>
                                        <button onClick={() => onAction(coords, MissionType.COLONIZE)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-bold transition-transform transform hover:scale-105">Kolonizuj</button>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
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
            )}
        </div>
    );
};

export default GalaxyPanel;
