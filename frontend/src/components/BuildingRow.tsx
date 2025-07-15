
import React from 'react';
import { BuildingType, Resources, QueueItem, BuildingLevels, ResearchLevels, ResearchType, BuildingCategory } from '../types';
import { BUILDING_DATA, ALL_GAME_OBJECTS, PROTECTED_RESOURCES_FACTOR } from '../constants';

interface BuildingRowProps {
  type: BuildingType;
  level: number;
  onUpgrade: (type: BuildingType) => void;
  canAfford: boolean;
  isQueued: boolean;
  requirementsMet: boolean;
  allBuildings: BuildingLevels;
  allResearch: ResearchLevels;
  energyEfficiency: number;
}

const formatNumber = (num: number): string => {
    return Math.floor(num).toLocaleString('pl-PL');
};

const CostDisplay: React.FC<{ cost: Resources }> = ({ cost }) => {
    const costs = [];
    if (cost.metal > 0) costs.push(<span key="m" className="flex items-center">🔩<span className="ml-1">Metal:</span><span className="ml-2 font-mono">{formatNumber(cost.metal)}</span></span>);
    if (cost.crystal > 0) costs.push(<span key="c" className="flex items-center">💎<span className="ml-1">Kryształ:</span><span className="ml-2 font-mono">{formatNumber(cost.crystal)}</span></span>);
    if (cost.deuterium > 0) costs.push(<span key="d" className="flex items-center">💧<span className="ml-1">Deuter:</span><span className="ml-2 font-mono">{formatNumber(cost.deuterium)}</span></span>);
    
    if (costs.length === 0) return <span>-</span>;
    
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

const BuildingRow: React.FC<BuildingRowProps> = ({ type, level, onUpgrade, canAfford, isQueued, requirementsMet, allBuildings, allResearch, energyEfficiency }) => {
  const data = BUILDING_DATA[type];
  const cost = data.cost(level + 1);
  const isDisabled = isQueued || !canAfford || !requirementsMet;
  
  let buttonText = 'Rozbuduj';
  if (isQueued) buttonText = 'W kolejce...';
  else if (!requirementsMet) buttonText = 'Brak wymagań';
  
  const isBlackMarket = type === BuildingType.BLACK_MARKET;

  const currentCapacity = data.capacity ? data.capacity(level) : 0;
  const nextCapacity = data.capacity ? data.capacity(level + 1) : 0;

  const currentEnergyConsumption = data.energyConsumption ? data.energyConsumption(level) : 0;
  const nextEnergyConsumption = data.energyConsumption ? data.energyConsumption(level + 1) : 0;
  const energyConsumptionIncrease = nextEnergyConsumption - currentEnergyConsumption;
  
  const currentEnergyProduction = data.production && type === BuildingType.SOLAR_PLANT ? data.production(level) : 0;
  const nextEnergyProduction = data.production && type === BuildingType.SOLAR_PLANT ? data.production(level+1) : 0;
  const energyProductionIncrease = nextEnergyProduction - currentEnergyProduction;

  const isResourceMine = data.category === BuildingCategory.RESOURCE && data.production && type !== BuildingType.SOLAR_PLANT;
  const currentProduction = isResourceMine && data.production ? data.production(level) * energyEfficiency : 0;
  const nextLevelProduction = isResourceMine && data.production ? data.production(level + 1) * energyEfficiency : 0;
  const productionIncrease = nextLevelProduction - currentProduction;


  return (
    <div className={`flex flex-col md:flex-row items-center justify-between bg-gray-900 bg-opacity-50 p-4 rounded-lg border border-gray-700 transition-all duration-300 ${!isDisabled && 'hover:border-cyan-600'}`}>
      <div className="flex-1 mb-4 md:mb-0 flex items-start w-full">
         {data.image && (
            <img src={data.image} alt={data.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg shadow-md mr-4 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white flex items-center">
              {!data.image && <span className="text-2xl mr-3">{data.icon}</span>}
              {data.name} <span className="ml-3 text-lg font-normal text-cyan-400">(Poziom {level})</span>
            </h3>
            <p className="text-gray-400 mt-1 text-sm">{data.description}</p>
             {isResourceMine && level > 0 && (
                <p className="text-sm text-gray-300 mt-1">
                    Produkcja: 
                    <span className="font-semibold text-green-400 ml-1">{formatNumber(currentProduction)}/h</span>
                    <span className="text-green-300 ml-1" title="Zwiększenie produkcji po rozbudowie">
                        (+{formatNumber(productionIncrease)} na nast. poz.)
                    </span>
                </p>
            )}
            {data.production && type === BuildingType.SOLAR_PLANT && (
                <p className="text-sm text-gray-300 mt-1">
                    Produkcja energii: 
                    <span className="font-semibold text-yellow-400 ml-1">{formatNumber(currentEnergyProduction)}</span>
                    <span className="text-green-400 ml-1"> (+
                    {formatNumber(energyProductionIncrease)} na nast. poz.)</span>
                </p>
            )}
             {isBlackMarket && (
              <>
                {level > 0 && (
                  <p className="text-sm text-gray-300 mt-1">
                      Zakres dochodu (poz. {level}): 
                      <span className="font-semibold text-green-400 ml-1">
                          {formatNumber(50 * Math.pow(1.1, level - 1))} - {formatNumber(200 * Math.pow(1.1, level - 1))} 💰/h
                      </span>
                  </p>
                )}
                <p className="text-sm text-gray-300 mt-1">
                    Zakres dochodu (poz. {level + 1}): 
                    <span className="font-semibold text-green-400 ml-1">
                        {formatNumber(50 * Math.pow(1.1, level))} - {formatNumber(200 * Math.pow(1.1, level))} 💰/h
                    </span>
                </p>
              </>
            )}
            {data.capacity && (
                <p className="text-sm text-gray-300 mt-1">
                    Pojemność: <span className="font-semibold text-cyan-400">{formatNumber(currentCapacity)}</span> 
                    <span className="text-green-400"> (+{formatNumber(nextCapacity - currentCapacity)} na nast. poz.)</span>
                </p>
            )}
            {data.category === 'STORAGE' && data.capacity && (
                <p className="text-sm text-gray-300 mt-1">
                    Chronione surowce: <span className="font-semibold text-teal-400">{formatNumber(currentCapacity * PROTECTED_RESOURCES_FACTOR)}</span> 
                    <span className="text-green-400"> (+
                    {formatNumber((nextCapacity - currentCapacity) * PROTECTED_RESOURCES_FACTOR)} na nast. poz.)</span>
                </p>
            )}
            {data.energyConsumption && (
              <p className="text-sm text-gray-300 mt-1">
                Pobór energii: 
                {level > 0 && <span className="font-semibold text-yellow-400 ml-1">{formatNumber(currentEnergyConsumption)}</span>}
                <span className="text-red-400 ml-1"> (+{formatNumber(energyConsumptionIncrease)} na nast. poz.)</span>
              </p>
            )}
            <RequirementsDisplay requirements={data.requirements} currentBuildings={allBuildings} currentResearch={allResearch} />
        </div>
      </div>
      <div className="flex flex-col items-start md:items-end w-full md:w-auto md:ml-4">
        <div className="mb-2">
            <p className="text-sm font-semibold text-gray-400">Koszt rozbudowy do poz. {level + 1}:</p>
            <CostDisplay cost={cost} />
        </div>
        <button
          onClick={() => onUpgrade(type)}
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

export default BuildingRow;
