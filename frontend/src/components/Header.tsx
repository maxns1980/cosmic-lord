
import React, { useState, useEffect } from 'react';
import { Resources, ResourceVeinBonus, Inventory, ActiveBoosts, BoostType, NPCFleetMission } from '../types';

interface HeaderProps {
    resources: Resources;
    maxResources: Resources;
    productions: {
        metal: number;
        crystal: number;
        deuterium: number;
        energy: {
            produced: number;
            consumed: number;
            efficiency: number;
        }
    };
    credits: number;
    blackMarketHourlyIncome: number;
    resourceVeinBonus: ResourceVeinBonus;
    inventory: Inventory;
    activeBoosts: ActiveBoosts;
    npcFleetMissions: NPCFleetMission[];
    onInfoClick: () => void;
    onEncyclopediaClick: () => void;
    onInventoryClick: () => void;
}

const formatNumber = (num: number): string => {
    return Math.floor(num).toLocaleString('pl-PL');
};

const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const Countdown: React.FC<{ targetTime: number, onEnd?: () => void }> = ({ targetTime, onEnd }) => {
    const [remaining, setRemaining] = useState(targetTime - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const newRemaining = targetTime - Date.now();
            if (newRemaining < 0) {
                clearInterval(timer);
                if (onEnd) onEnd();
            }
            setRemaining(newRemaining);
        }, 1000);
        return () => clearInterval(timer);
    }, [targetTime, onEnd]);

    return <span className="font-mono">{formatTime(remaining / 1000)}</span>;
}

const ActiveBoostDisplay: React.FC<{activeBoosts: ActiveBoosts, npcFleetMissions: NPCFleetMission[]}> = ({ activeBoosts, npcFleetMissions }) => {
    const boostEntries = Object.entries(activeBoosts)
        .filter(([, boost]) => boost && boost.endTime > Date.now())
        .filter(([type]) => [
            BoostType.COMBAT_TECH_BOOST,
            BoostType.ARMOR_TECH_BOOST,
            BoostType.DRIVE_TECH_BOOST,
            BoostType.STORAGE_PROTECTION_BOOST,
            BoostType.SECTOR_ACTIVITY_SCAN,
        ].includes(type as BoostType));

    if (boostEntries.length === 0) return null;

    const getBoostInfo = (type: BoostType, level: number) => {
        switch (type) {
            case BoostType.COMBAT_TECH_BOOST: return { icon: '💥', title: `Bonus do Ataku (+${level})` };
            case BoostType.ARMOR_TECH_BOOST: return { icon: '🧱', title: `Bonus do Pancerza (+${level})` };
            case BoostType.DRIVE_TECH_BOOST: return { icon: '🚀', title: `Bonus do Prędkości (+${level}%)` };
            case BoostType.STORAGE_PROTECTION_BOOST: return { icon: '🔒', title: `Ochrona Magazynów (${level}%)` };
            case BoostType.SECTOR_ACTIVITY_SCAN: return { icon: '📡', title: 'Skan Aktywności Sektora' };
            default: return null;
        }
    }

    return (
        <>
            {boostEntries.map(([type, boost]) => {
                if (!boost) return null;
                const boostInfo = getBoostInfo(type as BoostType, (boost as any).level || 1);
                if (!boostInfo) return null;
                
                return (
                    <div key={type} className="flex items-center gap-1 text-white p-1.5 bg-gray-900 bg-opacity-70 rounded-lg" title={boostInfo.title}>
                        <span className="text-xl">{boostInfo.icon}</span>
                        <Countdown targetTime={boost.endTime} />
                        {type === BoostType.SECTOR_ACTIVITY_SCAN && (
                             <>
                                {npcFleetMissions.length > 0 ? (
                                    <div className="flex items-center gap-1 ml-2 text-red-400 font-bold">
                                        <span title="Nadchodzące wrogie floty">🚨 {npcFleetMissions.length}</span>
                                        <span title="Czas do najbliższego ataku">
                                            <Countdown targetTime={Math.min(...npcFleetMissions.map(m => m.arrivalTime))} />
                                        </span>
                                    </div>
                                ) : (
                                    <span className="ml-2 text-green-400 font-semibold">Czysto</span>
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </>
    );
};


const ResourceDisplay: React.FC<{ label: string; resKey: keyof Resources; value: number; production: number; capacity: number; icon: string; colorClass: string; bonus: ResourceVeinBonus; isBoosted: boolean; }> = ({ label, resKey, value, production, capacity, icon, colorClass, bonus, isBoosted }) => {
    const usage = capacity > 0 ? value / capacity : 0;
    let valueColor = 'text-white';
    if (usage >= 1) {
        valueColor = 'text-red-400 animate-pulse';
    } else if (usage > 0.9) {
        valueColor = 'text-yellow-400';
    }

    const isBonusActive = bonus.active && bonus.resourceType === resKey;

    return (
        <div className={`p-2 rounded-lg flex flex-col items-center shadow-md bg-gray-800 bg-opacity-70 border ${colorClass}`}>
            <div className="text-sm font-semibold text-gray-300 flex items-center">
                {isBonusActive && <span className="text-yellow-300 mr-1" title="Odkryto bogatą żyłę!">✨</span>}
                {isBoosted && <span className="text-purple-400 mr-1" title="Aktywny bonus do produkcji!">📈</span>}
                {icon} {label}
            </div>
            <div className={`text-lg font-bold ${valueColor} tracking-wider`}>{formatNumber(value)}</div>
            <div className="text-xs text-gray-400 -mt-1">/ {formatNumber(capacity)}</div>
            <div className={`text-xs mt-1 ${isBonusActive || isBoosted ? 'text-purple-400 font-bold' : 'text-green-400'}`}>
                +{formatNumber(production)}/h
            </div>
            {isBonusActive ? (
                <div className="text-xs font-mono text-yellow-300">(<Countdown targetTime={bonus.endTime} />)</div>
            ) : (
                <div className="h-[16px]"></div>
            )}
        </div>
    );
};

const EnergyDisplay: React.FC<{ energy: HeaderProps['productions']['energy'] }> = ({ energy }) => {
    const energyColor = energy.efficiency < 1 ? 'text-red-400' : 'text-cyan-400';
    return (
         <div className="p-2 rounded-lg flex flex-col items-center shadow-md bg-gray-800 bg-opacity-70 border border-cyan-700">
            <div className="text-sm font-semibold text-gray-300 flex items-center">☀️ Energia</div>
            <div className={`text-lg font-bold ${energyColor} tracking-wider`}>{formatNumber(energy.produced - energy.consumed)}</div>
            <div className="text-xs text-gray-400">{formatNumber(energy.produced)} / {formatNumber(energy.consumed)}</div>
            <div className="h-[32px]"></div> {/* Placeholder to match height */}
        </div>
    )
}

const CreditsDisplay: React.FC<{ value: number; hourlyIncome: number }> = ({ value, hourlyIncome }) => {
    return (
         <div className="p-2 rounded-lg flex flex-col items-center shadow-md bg-gray-800 bg-opacity-70 border border-yellow-600">
            <div className="text-sm font-semibold text-gray-300 flex items-center">💰 Kredyty</div>
            <div className={`text-lg font-bold text-yellow-300 tracking-wider`}>{formatNumber(value)}</div>
             {hourlyIncome > 0 ? (
                <div className="text-xs mt-1 text-green-400" title="Aktualna stawka z Czarnego Rynku">
                    +{formatNumber(hourlyIncome)}/h
                </div>
            ) : (
                 <div className="h-[16px] mt-1"></div>
            )}
            <div className="h-[16px]"></div> {/* Placeholder to match height */}
        </div>
    )
}

const Header: React.FC<HeaderProps> = ({ resources, productions, maxResources, credits, blackMarketHourlyIncome, resourceVeinBonus, inventory, activeBoosts, npcFleetMissions, onInfoClick, onEncyclopediaClick, onInventoryClick }) => {
    const isProdBoosted = !!activeBoosts[BoostType.RESOURCE_PRODUCTION_BOOST];

    return (
        <header className="bg-gray-900 bg-opacity-50 backdrop-blur-md sticky top-0 z-40 border-b border-gray-700 shadow-lg">
            <div className="container mx-auto px-4 py-2">
                <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 self-start xl:self-center">
                        <h1 className="text-2xl md:text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                            Kosmiczny Władca
                        </h1>
                        <button onClick={onInfoClick} className="text-2xl text-gray-400 hover:text-cyan-300 transition-colors duration-200" aria-label="Informacje o grze">
                            ℹ️
                        </button>
                         <button onClick={onEncyclopediaClick} className="text-2xl text-gray-400 hover:text-cyan-300 transition-colors duration-200" aria-label="Encyklopedia gry">
                            📖
                        </button>
                    </div>

                    <div className="flex w-full xl:w-auto flex-wrap justify-center xl:justify-end items-center gap-2">
                        <div className="flex items-center gap-2">
                             <div 
                                onClick={onInventoryClick} 
                                className="p-2 rounded-lg flex flex-col items-center justify-center shadow-md bg-gray-800 bg-opacity-70 border border-purple-600 cursor-pointer hover:border-purple-400 transition-colors duration-200 w-24"
                                aria-label="Otwórz inwentarz bonusów"
                                title="Inwentarz Bonusów"
                            >
                                <div className="text-3xl">🎁</div>
                                <div className="text-xl font-bold text-white tracking-wider mt-1">{inventory.boosts.length}</div>
                            </div>
                            <ActiveBoostDisplay activeBoosts={activeBoosts} npcFleetMissions={npcFleetMissions} />
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                           <ResourceDisplay label="Metal" resKey="metal" value={resources.metal} production={productions.metal} capacity={maxResources.metal} icon="🔩" colorClass="border-orange-700" bonus={resourceVeinBonus} isBoosted={isProdBoosted} />
                           <ResourceDisplay label="Kryształ" resKey="crystal" value={resources.crystal} production={productions.crystal} capacity={maxResources.crystal} icon="💎" colorClass="border-blue-600" bonus={resourceVeinBonus} isBoosted={isProdBoosted} />
                           <ResourceDisplay label="Deuter" resKey="deuterium" value={resources.deuterium} production={productions.deuterium} capacity={maxResources.deuterium} icon="💧" colorClass="border-purple-600" bonus={resourceVeinBonus} isBoosted={isProdBoosted} />
                           <EnergyDisplay energy={productions.energy} />
                           <CreditsDisplay value={credits} hourlyIncome={blackMarketHourlyIncome} />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
