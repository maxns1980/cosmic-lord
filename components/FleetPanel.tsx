import React, { useState, useEffect } from 'react';
import { Fleet, FleetMission, ShipType, MissionType, ResearchType, ResearchLevels, SpacePlagueState, Colony, NPCStates } from '../types.ts';
import { SHIPYARD_DATA, RESEARCH_DATA, PLAYER_HOME_COORDS } from '../constants.ts';

interface FleetPanelProps {
    fleet: Fleet;
    fleetMissions: FleetMission[];
    research: ResearchLevels;
    onSendFleet: (missionFleet: Fleet, targetCoords: string, missionType: MissionType) => void;
    initialTarget: {coords: string, mission: MissionType} | null;
    onClearInitialTarget: () => void;
    spacePlague: SpacePlagueState;
    colonies: Colony[];
    npcStates: NPCStates;
}

const formatNumber = (num: number) => Math.floor(num).toLocaleString('pl-PL');
const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const MissionRow: React.FC<{mission: FleetMission}> = ({ mission }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fleetDetails = Object.entries(mission.fleet)
        .map(([shipId, count]) => `${count}x ${SHIPYARD_DATA[shipId as ShipType].name}`)
        .join(', ');

    let statusText: string;
    let timeToEvent: number;
    let targetTime: number;

    const isReturning = mission.processedArrival && mission.missionType !== 'COLONIZE';
    
    if (mission.missionType === 'EXPLORE' && Date.now() > mission.arrivalTime && mission.explorationEndTime && !mission.processedExploration) {
        statusText = "Koniec eksploracji";
        targetTime = mission.explorationEndTime;
    } else if (isReturning) {
        statusText = "Powrót";
        targetTime = mission.returnTime;
    } else {
        statusText = "Dotarcie";
        targetTime = mission.arrivalTime;
    }
    
    timeToEvent = targetTime - currentTime;

    const missionTypeDisplay = {
        [MissionType.ATTACK]: <span className="text-red-400">Atak</span>,
        [MissionType.SPY]: <span className="text-yellow-400">Szpiegostwo</span>,
        [MissionType.HARVEST]: <span className="text-green-400">Zbieraj</span>,
        [MissionType.EXPEDITION]: <span className="text-purple-400">Wyprawa</span>,
        [MissionType.COLONIZE]: <span className="text-blue-400">Kolonizacja</span>,
        [MissionType.EXPLORE]: <span className="text-teal-400">Eksploracja</span>,
    };

    return (
        <div className="bg-gray-900 bg-opacity-60 p-3 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
                <p className="font-bold text-white">
                    {missionTypeDisplay[mission.missionType]} na <span className="text-yellow-400">[{mission.targetCoords}]</span>
                </p>
                <p className="text-sm text-gray-400">{fleetDetails}</p>
            </div>
            <div className="font-mono text-lg text-green-300">
                {statusText} za: {formatTime(timeToEvent / 1000)}
            </div>
        </div>
    );
};

const FleetPanel: React.FC<FleetPanelProps> = ({ fleet, fleetMissions, research, onSendFleet, initialTarget, onClearInitialTarget, spacePlague, colonies, npcStates }) => {
    const [missionFleet, setMissionFleet] = useState<Fleet>({});
    const [targetCoords, setTargetCoords] = useState('');
    const [missionType, setMissionType] = useState<MissionType>(MissionType.ATTACK);

    useEffect(() => {
        if (initialTarget) {
            setTargetCoords(initialTarget.coords);
            setMissionType(initialTarget.mission);
            onClearInitialTarget();
        }
    }, [initialTarget, onClearInitialTarget]);

    const handleAmountChange = (shipType: ShipType, amount: number) => {
        const available = fleet[shipType] || 0;
        const newAmount = Math.max(0, Math.min(available, amount));
        setMissionFleet(prev => ({...prev, [shipType]: newAmount}));
    };

    const handleMaxClick = (shipType: ShipType) => {
        setMissionFleet(prev => ({...prev, [shipType]: fleet[shipType] || 0}));
    };

    const handleSendClick = () => {
        const fleetToSend = Object.entries(missionFleet).reduce((acc, [type, count]) => {
            if (count && count > 0) {
                acc[type as ShipType] = count;
            }
            return acc;
        }, {} as Fleet);

        if (Object.keys(fleetToSend).length > 0 && targetCoords) {
            onSendFleet(fleetToSend, targetCoords, missionType);
            setMissionFleet({});
        }
    };
    
    const availableShips = (Object.keys(SHIPYARD_DATA) as ShipType[]).filter(type => (fleet[type] || 0) > 0);

    return (
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6 space-y-8">
            {/* Missions Section */}
            <div>
                <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3">Aktywne Misje ({fleetMissions.length})</h2>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {fleetMissions.length > 0 
                        ? fleetMissions.map(m => <MissionRow key={m.id} mission={m} />)
                        : <p className="text-gray-400">Brak aktywnych misji.</p>
                    }
                </div>
            </div>

            {/* Fleet Composition Section */}
            <div>
                <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3">Skomponuj Flotę</h2>
                {availableShips.length === 0 ? (
                    <p className="text-gray-400">Brak dostępnych statków.</p>
                ) : (
                    <div className="space-y-3">
                        {availableShips.map(type => {
                            const shipData = SHIPYARD_DATA[type];
                            const isPlagued = spacePlague.active && spacePlague.infectedShip === type;
                            return (
                                <div key={type} className="flex flex-col md:flex-row items-center gap-4 bg-gray-900 p-2 rounded-lg">
                                    <div className="flex-1 font-semibold text-white">
                                        {shipData.icon} {shipData.name} ({formatNumber(fleet[type] || 0)})
                                        {isPlagued && <span className="ml-2 text-red-400" title="Zainfekowany! Atak -20%">🦠</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={missionFleet[type] || ''}
                                            onChange={(e) => handleAmountChange(type, parseInt(e.target.value, 10) || 0)}
                                            placeholder="Ilość"
                                            className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center"
                                        />
                                        <button onClick={() => handleMaxClick(type)} className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 rounded text-xs">MAX</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

             {/* Send Fleet Section */}
            {availableShips.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3">Wyślij Flotę</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                            type="text"
                            value={targetCoords}
                            onChange={(e) => setTargetCoords(e.target.value)}
                            placeholder="Koordynaty (np. 1:42:9)"
                            className="bg-gray-900 border border-gray-600 rounded p-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                         <select 
                            value={missionType} 
                            onChange={(e) => setMissionType(e.target.value as MissionType)}
                            className="bg-gray-900 border border-gray-600 rounded p-2 focus:ring-cyan-500 focus:border-cyan-500"
                         >
                            <option value={MissionType.ATTACK}>Atakuj</option>
                            <option value={MissionType.SPY}>Szpieguj</option>
                            <option value={MissionType.HARVEST}>Zbieraj</option>
                            <option value={MissionType.EXPEDITION}>Wyprawa</option>
                            <option value={MissionType.COLONIZE}>Kolonizuj</option>
                            <option value={MissionType.EXPLORE}>Eksploruj</option>
                         </select>
                        <button 
                            onClick={handleSendClick}
                            disabled={Object.keys(missionFleet).filter(k => missionFleet[k as ShipType]! > 0).length === 0 || !targetCoords}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded"
                        >
                            Wyślij
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export { FleetPanel };
