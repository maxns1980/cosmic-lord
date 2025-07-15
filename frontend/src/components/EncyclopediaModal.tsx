
import React, { useState } from 'react';
import {
    BUILDING_DATA,
    RESEARCH_DATA,
    SHIPYARD_DATA,
    DEFENSE_DATA,
    ALL_GAME_OBJECTS,
} from '../constants';
import { BuildingType, ResearchType, ShipType, DefenseType, Resources, BuildingLevels, ResearchLevels } from '../types';

interface EncyclopediaModalProps {
    onClose: () => void;
}

type EncyclopediaTab = 'buildings' | 'research' | 'ships' | 'defense';

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

const CostDisplay: React.FC<{ cost: Resources }> = ({ cost }) => {
    const costs = [];
    if (cost.metal > 0) costs.push(<span key="m" className="flex items-center text-sm">🔩<span className="ml-1.5 text-gray-400">Metal:</span><span className="ml-2 font-mono text-white">{formatNumber(cost.metal)}</span></span>);
    if (cost.crystal > 0) costs.push(<span key="c" className="flex items-center text-sm">💎<span className="ml-1.5 text-gray-400">Kryształ:</span><span className="ml-2 font-mono text-white">{formatNumber(cost.crystal)}</span></span>);
    if (cost.deuterium > 0) costs.push(<span key="d" className="flex items-center text-sm">💧<span className="ml-1.5 text-gray-400">Deuter:</span><span className="ml-2 font-mono text-white">{formatNumber(cost.deuterium)}</span></span>);
    return <>{costs}</>;
};

const RequirementsDisplay: React.FC<{ requirements?: Partial<BuildingLevels & ResearchLevels> }> = ({ requirements }) => {
    if (!requirements || Object.keys(requirements).length === 0) return null;
    
    return (
        <div className="mt-2">
            <h4 className="font-semibold text-gray-300">Wymagania</h4>
            <div className="text-sm text-amber-400">
                {Object.entries(requirements).map(([reqId, reqLevel]) => {
                    const reqInfo = ALL_GAME_OBJECTS[reqId as keyof typeof ALL_GAME_OBJECTS];
                    return <div key={reqId}>- {reqInfo.name} (poz. {reqLevel})</div>;
                })}
            </div>
        </div>
    );
}

const ItemCard: React.FC<{ itemData: any }> = ({ itemData }) => {
    const cost = itemData.cost(1);
    const buildTime = itemData.buildTime(1);
    
    return (
        <div className="bg-gray-900 bg-opacity-70 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row gap-4">
            <div className="flex-shrink-0 w-full md:w-24 text-center">
                {itemData.image && <img src={itemData.image} alt={itemData.name} className="w-24 h-24 object-cover rounded-md mx-auto" />}
                {!itemData.image && itemData.icon && <span className="text-6xl">{itemData.icon}</span>}
            </div>
            <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{itemData.name}</h3>
                <p className="text-gray-400 mt-1 text-sm">{itemData.description}</p>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 className="font-semibold text-gray-300">Koszt (poz. 1 / 1 szt.)</h4>
                        <div className="space-y-1 mt-1">
                            <CostDisplay cost={cost} />
                        </div>
                        <p className="mt-1"><span className="text-gray-400">Czas budowy:</span> <span className="font-mono text-white">{formatTime(buildTime)}</span></p>
                    </div>
                     <div>
                        <RequirementsDisplay requirements={itemData.requirements} />
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700">
                    <h4 className="font-semibold text-gray-300 mb-1">Statystyki</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                        {itemData.production && <span>Produkcja: <span className="text-green-400 font-mono">+{formatNumber(itemData.production(1))}/h</span></span>}
                        {itemData.energyConsumption && <span>Pobór energii: <span className="text-red-400 font-mono">{formatNumber(itemData.energyConsumption(1))}</span></span>}
                        {itemData.capacity && <span>Pojemność: <span className="text-cyan-400 font-mono">{formatNumber(itemData.capacity(1))}</span></span>}
                        {itemData.attack && <span>Atak: <span className="text-red-400 font-mono">{formatNumber(itemData.attack)}</span></span>}
                        {itemData.shield && <span>Tarcza: <span className="text-blue-400 font-mono">{formatNumber(itemData.shield)}</span></span>}
                        {itemData.structuralIntegrity && <span>Struktura: <span className="text-gray-400 font-mono">{formatNumber(itemData.structuralIntegrity)}</span></span>}
                        {itemData.cargoCapacity && <span>Ładowność: <span className="text-yellow-400 font-mono">{formatNumber(itemData.cargoCapacity)}</span></span>}
                        {itemData.speed && <span>Prędkość: <span className="text-white font-mono">{formatNumber(itemData.speed)}</span></span>}
                        {itemData.drive && <span>Napęd: <span className="text-white font-mono">{RESEARCH_DATA[itemData.drive as ResearchType].name}</span></span>}
                        {itemData.requiredEnergy && <span>Wymagana energia: <span className="text-yellow-400 font-mono">{formatNumber(itemData.requiredEnergy)}</span></span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<EncyclopediaTab>('buildings');

    const TABS: { id: EncyclopediaTab, label: string, icon: string, data: any }[] = [
        { id: 'buildings', label: 'Budynki', icon: '🏢', data: BUILDING_DATA },
        { id: 'research', label: 'Badania', icon: '🔬', data: RESEARCH_DATA },
        { id: 'ships', label: 'Statki', icon: '🚀', data: SHIPYARD_DATA },
        { id: 'defense', label: 'Obrona', icon: '🛡️', data: DEFENSE_DATA },
    ];
    
    const activeTabData = TABS.find(t => t.id === activeTab)?.data || {};

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 border-2 border-cyan-500 rounded-2xl shadow-2xl max-w-5xl w-full text-left transform transition-all relative flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-cyan-700">
                     <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl font-bold"
                        aria-label="Zamknij"
                    >
                        &times;
                    </button>
                    <h2 className="text-3xl font-bold text-cyan-300">Encyklopedia</h2>
                </div>

                <div className="flex border-b border-gray-600 px-4">
                    {TABS.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-3 text-base font-semibold transition-colors duration-200 -mb-px border-b-2
                                ${activeTab === tab.id
                                    ? 'text-cyan-300 border-cyan-400'
                                    : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'
                                }`}
                        >
                            <span className="text-xl mr-2">{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
                    {Object.keys(activeTabData).map(itemId => (
                        <ItemCard key={itemId} itemData={activeTabData[itemId]} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EncyclopediaModal;
