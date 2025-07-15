
import React, { useState } from 'react';
import { ShipType, Resources, BuildingLevels, ResearchLevels, BuildingType, ResearchType } from '../types';
import { SHIPYARD_DATA, ALL_GAME_OBJECTS } from '../constants';

interface ShipRowProps {
  type: ShipType;
  onBuild: (type: ShipType, amount: number) => void;
  resources: Resources;
  isQueued: boolean;
  requirementsMet: boolean;
  amountOwned: number;
  buildings: BuildingLevels;
  research: ResearchLevels;
}

const formatNumber = (num: number): string => {
    return Math.floor(num).toLocaleString('pl-PL');
};

const CostDisplay: React.FC<{ cost: Resources }> = ({ cost }) => {
    const costs = [];
    if (cost.metal > 0) costs.push(<span key="m" className="flex items-center">🔩<span className="ml-1">Metal:</span><span className="ml-2 font-mono">{formatNumber(cost.metal)}</span></span>);
    if (cost.crystal > 0) costs.push(<span key="c" className="flex items-center">💎<span className="ml-1">Kryształ:</span><span className="ml-2 font-mono">{formatNumber(cost.crystal)}</span></span>);
    if (cost.deuterium > 0) costs.push(<span key="d" className="flex items-center">💧<span className="ml-1">Deuter:</span><span className="ml-2 font-mono">{formatNumber(cost.deuterium)}</span></span>);
    
    return (
        <div className="flex flex-col md:flex-row md:space-x-4 text-sm text-gray-300">
            {costs.map((c, i) => <React.Fragment key={i}>{c}</React.Fragment>)}
        </div>
    );
};

const RequirementsDisplay: React.FC<{ 
    requirements?: Partial<BuildingLevels & ResearchLevels>,
    currentBuildings: BuildingLevels,
    currentResearch: ResearchLevels
}> = ({ requirements, currentBuildings, currentResearch }) => {
    if (!requirements || Object.keys(requirements).length === 0) return null;
    
    const requirementItems = Object.entries(requirements).map(([reqId, reqLevel]) => {
        const reqInfo = ALL_GAME_OBJECTS[reqId as keyof typeof ALL_GAME_OBJECTS];
        const isBuilding = Object.values(BuildingType).includes(reqId as BuildingType);
        
        const isMet = isBuilding 
            ? currentBuildings[reqId as BuildingType] >= (reqLevel as number)
            : currentResearch[reqId as ResearchType] >= (reqLevel as number);

        return (
            <span key={reqId} className={isMet ? 'line-through text-gray-500' : 'text-amber-400'}>
                {reqInfo.name} (poz. {reqLevel})
            </span>
        );
    });

    return (
        <div className="text-xs mt-1">
            <strong className="text-gray-400 mr-1">Wymagania:</strong>
            {requirementItems.map((item, index) => (
                <React.Fragment key={index}>
                    {item}
                    {index < requirementItems.length - 1 && ', '}
                </React.Fragment>
            ))}
        </div>
    );
};

const ShipRow: React.FC<ShipRowProps> = ({ type, onBuild, resources, isQueued, requirementsMet, amountOwned, buildings, research }) => {
  const [amount, setAmount] = useState(1);
  const data = SHIPYARD_DATA[type];
  const cost = data.cost(1);
  
  const totalCost: Resources = {
      metal: cost.metal * amount,
      crystal: cost.crystal * amount,
      deuterium: cost.deuterium * amount,
  }

  const canAfford = resources.metal >= totalCost.metal && resources.crystal >= totalCost.crystal && resources.deuterium >= totalCost.deuterium;
  const isDisabled = isQueued || !canAfford || !requirementsMet || amount <= 0;
  
  let buttonText = 'Buduj';
  if (isQueued) buttonText = 'W kolejce...';
  else if (!requirementsMet) buttonText = 'Brak wymagań';

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      setAmount(isNaN(value) || value < 1 ? 1 : value);
  }

  return (
    <div className={`flex flex-col md:flex-row items-stretch justify-between bg-gray-900 bg-opacity-50 p-4 rounded-lg border border-gray-700 transition-all duration-300 ${!isDisabled && 'hover:border-cyan-600'}`}>
      <div className="flex-1 mb-4 md:mb-0">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="text-2xl mr-3">{data.icon}</span>
          {data.name} <span className="ml-3 text-lg font-normal text-cyan-400">(Posiadane: {amountOwned})</span>
        </h3>
        <p className="text-gray-400 mt-1 text-sm">{data.description}</p>
        
        <RequirementsDisplay requirements={data.requirements} currentBuildings={buildings} currentResearch={research} />

        <div className="text-sm text-gray-300 mt-2 grid grid-cols-3 gap-2">
             <p>Atak: <span className="font-semibold text-red-400">{formatNumber(data.attack)}</span></p>
             <p>Tarcza: <span className="font-semibold text-blue-400">{formatNumber(data.shield)}</span></p>
             <p>Struktura: <span className="font-semibold text-gray-400">{formatNumber(data.structuralIntegrity)}</span></p>
        </div>
         <div className="mt-2">
            <p className="text-sm font-semibold text-gray-400">Koszt 1 sztuki:</p>
            <CostDisplay cost={cost} />
        </div>
      </div>
      <div className="flex flex-col items-start justify-end md:items-end w-full md:w-auto mt-4 md:mt-0">
        <div className="flex items-center space-x-2 mb-2">
            <label htmlFor={`amount-${type}`} className="text-sm font-semibold text-gray-300">Ilość:</label>
            <input 
                type="number"
                id={`amount-${type}`}
                value={amount}
                onChange={handleAmountChange}
                min="1"
                className="w-24 bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-center focus:ring-cyan-500 focus:border-cyan-500"
                disabled={isQueued || !requirementsMet}
            />
        </div>
        <button
          onClick={() => onBuild(type, amount)}
          disabled={isDisabled}
          className={`w-full md:w-auto px-6 py-2 text-base font-bold text-white rounded-md shadow-md transition-all duration-300 transform
            ${!isDisabled
              ? 'bg-cyan-600 hover:bg-cyan-500 focus:ring-4 focus:ring-cyan-400 focus:ring-opacity-50 hover:scale-105'
              : 'bg-gray-600 cursor-not-allowed opacity-70'
            }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default ShipRow;
