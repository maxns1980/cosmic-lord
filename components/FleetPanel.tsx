import React, { useState, useEffect } from 'react';
import { Fleet, FleetMission, ShipType, MissionType, ResearchType, ResearchLevels, SpacePlagueState, Colony, NPCStates } from '../types';
import { SHIPYARD_DATA, RESEARCH_DATA, PLAYER_HOME_COORDS } from '../constants';

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
    
    const isReturning = currentTime >= mission.arrivalTime;
    const remainingTime = (mission.returnTime - currentTime) / 1000;

    let missionName = '';
    let missionColor = 'border-yellow-500';
    let statusText = isReturning ? '(Powrót)' : '(W drodze)';
    let timeToDisplay = remainingTime;

    switch(mission.missionType) {
        case MissionType.ATTACK: missionName = 'Atak'; break;
        case MissionType.SPY: missionName = 'Szpiegostwo'; break;
        case MissionType.HARVEST: missionName = 'Zbieraj'; break;
        case MissionType.COLONIZE: 
            missionName = 'Kolonizacja';
            missionColor = 'border-blue-500';
            break;
        case MissionType.EXPEDITION:
            missionName = 'Wyprawa';
            missionColor = 'border-purple-500';
            break;
        case MissionType.EXPLORE:
            missionName = 'Eksploracja';
            missionColor = 'border-teal-500';
            if (mission.explorationEndTime && currentTime > mission.arrivalTime && currentTime < mission.explorationEndTime) {
                statusText = '(Badanie)';
                timeToDisplay = (mission.explorationEndTime - currentTime) / 1000;
                missionColor = 'border-cyan-400';
            }
            break;
    }
    
    if (isReturning && mission.missionType !== MissionType.COLONIZE) {
        missionColor = 'border-green-500';
    }


    return (
        <div className={`bg-gray-900 bg-opacity-60 p-3 rounded-lg flex justify-between items-center border-l-4 ${missionColor}`}>
            <div>
                <p className="font-semibold text-cyan-400">
                    Misja: {missionName} na [{mission.targetCoords}] {statusText}
                </p>
                <p className="text-sm text-gray-300">
                    Flota: {Object.entries(mission.fleet).map(([type, count]) => `${SHIPYARD_DATA[type as ShipType].name}: ${count}`).join(', ')}
                </p>
            </div>
            <div className="text-lg font-mono text-green-400">{formatTime(timeToDisplay)}</div>
        </div>
    )
}

const FleetPanel: React.FC<FleetPanelProps> = ({ fleet, fleetMissions, research, onSendFleet, initialTarget, onClearInitialTarget, spacePlague, colonies, npcStates }) => {
    const [missionFleet, setMissionFleet] = useState<Fleet>({});
    const [targetCoords, setTargetCoords] = useState("1:42:8");
    const [missionType, setMissionType] = useState<MissionType>(MissionType.ATTACK);

    useEffect(() => {
        if (initialTarget) {
            setTargetCoords(initialTarget.coords);
            setMissionType(initialTarget.mission);
            onClearInitialTarget();
        }
    }, [initialTarget, onClearInitialTarget]);

    const handleShipAmountChange = (type: ShipType, value: string) => {
        const amount = parseInt(value, 10);
        const owned = fleet[type] || 0;
        const finalAmount = isNaN(amount) || amount < 0 ? 0 : Math.min(amount, owned);
        setMissionFleet(prev => ({...prev, [type]: finalAmount}));
    }

    const handleMaxClick = (type: ShipType) => {
        setMissionFleet(prev => ({...prev, [type]: fleet[type] || 0 }));
    }

    const handleSendFleet = () => {
        const totalShips = Object.values(missionFleet).reduce((sum, count) => sum + (count || 0), 0);
        if (totalShips > 0) {
            onSendFleet(missionFleet, targetCoords, missionType);
            setMissionFleet({});
        } else {
            alert("Wybierz przynajmniej jeden statek!");
        }
    }

    const availableShips = (Object.keys(fleet).filter(s => (fleet[s as ShipType] ?? 0) > 0) as ShipType[]);
    const spyTechLevel = research[ResearchType.SPY_TECHNOLOGY] || 0;
    const hasRecyclers = (fleet[ShipType.RECYCLER] || 0) > 0;
    const hasColonyShip = (fleet[ShipType.COLONY_SHIP] || 0) > 0;
    const hasResearchVessel = (fleet[ShipType.RESEARCH_VESSEL] || 0) > 0;
    const isTargetOccupied = npcStates[targetCoords] || colonies.some(c => c.id === targetCoords) || targetCoords === PLAYER_HOME_COORDS;

    return (
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3">Zarządzanie Flotą</h2>
                {availableShips.length === 0 ? (
                    <p className="text-gray-400">Nie posiadasz żadnych statków.</p>
                ) : (
                    <div className="space-y-4">
                        {availableShips.map(type => {
                            const isPlagued = spacePlague.active && spacePlague.infectedShip === type;
                            return (
                                <div key={type} className="flex items-center justify-between p-2 bg-gray-900 rounded-md">
                                    <span className="font-semibold flex items-center">
                                        {isPlagued && <span className="text-xl mr-2" title="Zainfekowany wirusem! Atak -20%">🦠</span>}
                                        {SHIPYARD_DATA[type].icon} {SHIPYARD_DATA[type].name}: {formatNumber(fleet[type] || 0)}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="number"
                                            value={missionFleet[type] || ''}
                                            onChange={(e) => handleShipAmountChange(type, e.target.value)}
                                            placeholder="0"
                                            className="w-24 bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-center focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                        <button onClick={() => handleMaxClick(type)} className="px-3 py-1 bg-cyan-800 text-xs font-bold rounded hover:bg-cyan-700">MAX</button>
                                    </div>
                                </div>
                            )
                        })}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700 mt-4">
                            <div className="flex items-center space-x-4">
                                <label htmlFor="coords" className="font-semibold text-gray-300">Cel:</label>
                                <input 
                                    type="text"
                                    id="coords"
                                    value={targetCoords}
                                    onChange={e => setTargetCoords(e.target.value)}
                                    className="w-32 bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-center focus:ring-cyan-500 focus:border-cyan-500"
                                />
                            </div>
                             <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="font-semibold text-gray-300">Misja:</span>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="mission" value={MissionType.ATTACK} checked={missionType === MissionType.ATTACK} onChange={() => setMissionType(MissionType.ATTACK)} className="form-radio bg-gray-700 text-cyan-500"/>
                                    <span>Atak</span>
                                </label>
                                {spyTechLevel > 0 && (
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="mission" value={MissionType.SPY} checked={missionType === MissionType.SPY} onChange={() => setMissionType(MissionType.SPY)} className="form-radio bg-gray-700 text-cyan-500" />
                                        <span>Szpieguj</span>
                                    </label>
                                )}
                                {hasRecyclers && (
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="mission" value={MissionType.HARVEST} checked={missionType === MissionType.HARVEST} onChange={() => setMissionType(MissionType.HARVEST)} className="form-radio bg-gray-700 text-cyan-500" />
                                        <span>Zbieraj</span>
                                    </label>
                                )}
                                {hasColonyShip && !isTargetOccupied && (
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="mission" value={MissionType.COLONIZE} checked={missionType === MissionType.COLONIZE} onChange={() => setMissionType(MissionType.COLONIZE)} className="form-radio bg-gray-700 text-blue-500" />
                                        <span>Kolonizuj</span>
                                    </label>
                                )}
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="mission" value={MissionType.EXPEDITION} checked={missionType === MissionType.EXPEDITION} onChange={() => setMissionType(MissionType.EXPEDITION)} className="form-radio bg-gray-700 text-purple-500"/>
                                    <span>Wyprawa</span>
                                </label>
                                {hasResearchVessel && !isTargetOccupied && (
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="mission" value={MissionType.EXPLORE} checked={missionType === MissionType.EXPLORE} onChange={() => setMissionType(MissionType.EXPLORE)} className="form-radio bg-gray-700 text-teal-500" />
                                        <span>Eksploruj</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button onClick={handleSendFleet} className="px-8 py-3 text-base font-bold text-white rounded-md shadow-md bg-green-600 hover:bg-green-500 transition-transform transform hover:scale-105">Wyślij Flotę</button>
                        </div>
                    </div>
                )}
            </div>
            
            <div>
                <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3">Ruch Flot ({fleetMissions.length})</h2>
                {fleetMissions.length === 0 ? (
                    <p className="text-gray-400">Brak aktywnych misji.</p>
                ) : (
                    <div className="space-y-2">
                        {fleetMissions.map(mission => <MissionRow key={mission.id} mission={mission} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FleetPanel;