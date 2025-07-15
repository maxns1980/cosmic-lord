
import React, { useState } from 'react';
import { BuildingType, Resources, BuildingLevels, QueueItem, ResearchLevels, ResearchType, BuildingCategory } from '../types.ts';
import { BUILDING_DATA } from '../constants.ts';
import BuildingRow from './BuildingRow.tsx';

interface BuildingsPanelProps {
  buildings: BuildingLevels;
  research: ResearchLevels;
  resources: Resources;
  onUpgrade: (type: BuildingType) => void;
  buildQueue: QueueItem[];
  energyEfficiency: number;
}

const checkRequirements = (requirements: any, buildings: BuildingLevels, research: ResearchLevels) => {
    if (!requirements) return true;
    return Object.entries(requirements).every(([reqId, reqLevel]) => {
        if (reqId in buildings) {
            return buildings[reqId as BuildingType] >= (reqLevel as number);
        }
        if (reqId in research) {
            return research[reqId as ResearchType] >= (reqLevel as number);
        }
        return false;
    });
}

const BuildingsPanel: React.FC<BuildingsPanelProps> = ({ buildings, research, resources, onUpgrade, buildQueue, energyEfficiency }) => {
  const [activeCategory, setActiveCategory] = useState<BuildingCategory>(BuildingCategory.RESOURCE);

  const categories = [
      { id: BuildingCategory.RESOURCE, label: "Surowcowe" },
      { id: BuildingCategory.INDUSTRIAL, label: "Przemysłowe" },
      { id: BuildingCategory.STORAGE, label: "Magazyny" }
  ];

  return (
    <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3">Budynki</h2>
      
      <div className="flex mb-6 border-b border-gray-600">
          {categories.map(category => (
              <button 
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 text-base font-semibold transition-colors duration-200 -mb-px border-b-2
                    ${activeCategory === category.id
                        ? 'text-cyan-300 border-cyan-400'
                        : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'
                    }`}
              >
                  {category.label}
              </button>
          ))}
      </div>

      <div className="space-y-6">
        {(Object.keys(BUILDING_DATA) as BuildingType[])
        .filter(type => BUILDING_DATA[type].category === activeCategory)
        .map((type) => {
          const level = buildings[type];
          const data = BUILDING_DATA[type];
          const cost = data.cost(level + 1);
          const canAfford = resources.metal >= cost.metal && resources.crystal >= cost.crystal && resources.deuterium >= cost.deuterium;
          const isQueued = buildQueue.some(item => item.id === type);
          const requirementsMet = checkRequirements(data.requirements, buildings, research);

          return (
            <BuildingRow
              key={type}
              type={type}
              level={level}
              onUpgrade={onUpgrade}
              canAfford={canAfford}
              isQueued={isQueued}
              requirementsMet={requirementsMet}
              allBuildings={buildings}
              allResearch={research}
              energyEfficiency={energyEfficiency}
            />
          );
        })}
      </div>
    </div>
  );
};

export default BuildingsPanel;