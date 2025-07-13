
import React from 'react';
import { Inventory, Boost, BoostType } from '../types';

interface InventoryModalProps {
    inventory: Inventory;
    onActivateBoost: (boostId: string) => void;
    onClose: () => void;
}

const getBoostDescription = (boost: Boost) => {
    const durationHours = boost.duration / 3600;
    switch (boost.type) {
        case BoostType.EXTRA_BUILD_QUEUE:
            return `Zwiększa limit kolejek budowy i badań do ${boost.level} na ${durationHours} godzin.`;
        case BoostType.RESOURCE_PRODUCTION_BOOST:
            return `Zwiększa produkcję wszystkich surowców o ${boost.level}% na ${durationHours} godzin.`;
        case BoostType.COMBAT_TECH_BOOST:
            return `Zwiększa poziom Technologii Bojowej o ${boost.level} na ${durationHours} godzin.`;
        case BoostType.ARMOR_TECH_BOOST:
            return `Zwiększa poziom Technologii Pancerza o ${boost.level} na ${durationHours} godzin.`;
        case BoostType.DRIVE_TECH_BOOST:
            return `Zwiększa prędkość wszystkich statków o ${boost.level}% na ${durationHours} godzin.`;
        case BoostType.CONSTRUCTION_COST_REDUCTION:
            return `Jednorazowy bonus, który obniża koszt surowcowy następnego budynku lub badania o ${boost.level}%.`;
        case BoostType.CONSTRUCTION_TIME_REDUCTION:
            return `Jednorazowy przedmiot, który natychmiast skraca czas trwającej budowy lub badania o ${boost.level}h.`;
        case BoostType.STORAGE_PROTECTION_BOOST:
            return `Zwiększa ochronę surowców w magazynach do ${boost.level}% na ${durationHours} godzin.`;
        case BoostType.SECTOR_ACTIVITY_SCAN:
            return `Jednorazowy skan, który po aktywacji ujawnia ruchy wrogich flot w Twoim sektorze na ${durationHours} godziny.`;
        case BoostType.ABANDONED_COLONY_LOOT:
            return 'Ujawnia lokację opuszczonej placówki. Aktywacja wyśle tam ekspedycję, która natychmiast powróci z cennymi surowcami i kredytami.';
        default:
            return '';
    }
};

const getBoostName = (boost: Boost) => {
    switch (boost.type) {
        case BoostType.EXTRA_BUILD_QUEUE:
            return `Dodatkowa kolejka budowy (${boost.level})`;
        case BoostType.RESOURCE_PRODUCTION_BOOST:
            return `Bonus do produkcji (+${boost.level}%)`;
        case BoostType.COMBAT_TECH_BOOST:
            return `Kalibracja Broni Polowej (+${boost.level})`;
        case BoostType.ARMOR_TECH_BOOST:
            return `Wzmocnienie Pancerza (+${boost.level})`;
        case BoostType.DRIVE_TECH_BOOST:
            return `Przeciążenie Napędu (+${boost.level}%)`;
        case BoostType.CONSTRUCTION_COST_REDUCTION:
            return `Schematy Konstrukcyjne (-${boost.level}%)`;
        case BoostType.CONSTRUCTION_TIME_REDUCTION:
            return `Zestaw Narzędzi Nanotech. (-${boost.level}h)`;
        case BoostType.STORAGE_PROTECTION_BOOST:
            return `Moduł Ochronny Magazynów (${boost.level}%)`;
        case BoostType.SECTOR_ACTIVITY_SCAN:
            return 'Dane o Aktywności w Sektorze';
        case BoostType.ABANDONED_COLONY_LOOT:
            return 'Mapa Porzuconej Kolonii';
        default:
            return 'Nieznany bonus';
    }
};

const InventoryModal: React.FC<InventoryModalProps> = ({ inventory, onActivateBoost, onClose }) => {
    const { boosts } = inventory;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 border-2 border-purple-500 rounded-2xl shadow-2xl max-w-2xl w-full text-left transform transition-all relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl font-bold"
                        aria-label="Zamknij"
                    >
                        &times;
                    </button>
                    <h2 className="text-3xl font-bold text-purple-300 mb-6 border-b border-purple-700 pb-3 flex items-center gap-3">
                        <span className="text-4xl">🎁</span>
                        Inwentarz Bonusów
                    </h2>
                    
                    <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-4">
                        {boosts.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">Twój inwentarz jest pusty.</p>
                        ) : (
                            boosts.map(boost => (
                                <div key={boost.id} className="bg-gray-900 bg-opacity-60 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{getBoostName(boost)}</h3>
                                        <p className="text-gray-400 text-sm mt-1">{getBoostDescription(boost)}</p>
                                    </div>
                                    <button 
                                        onClick={() => onActivateBoost(boost.id)}
                                        className="w-full md:w-auto px-6 py-2 text-base font-bold text-white rounded-md shadow-md transition-all duration-300 transform bg-green-600 hover:bg-green-500 focus:ring-4 focus:ring-green-400 focus:ring-opacity-50 hover:scale-105"
                                    >
                                        Aktywuj
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryModal;