
import React from 'react';
import { Planet } from '../types';

interface PlanetSelectorProps {
    planets: Planet[];
    currentPlanetId: string;
    onSelectPlanet: (planetId: string) => void;
}

const PlanetSelector: React.FC<PlanetSelectorProps> = ({ planets, currentPlanetId, onSelectPlanet }) => {
    
    const currentPlanet = planets.find(p => p.id === currentPlanetId);

    return (
        <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-lg pr-3">
             <span className="text-3xl mx-2" title={currentPlanet?.isHomeworld ? 'Planeta Matka' : 'Kolonia'}>
                {currentPlanet?.isHomeworld ? '🌍' : '🪐'}
            </span>
            <select
                value={currentPlanetId}
                onChange={(e) => onSelectPlanet(e.target.value)}
                className="bg-transparent text-white font-bold text-xl appearance-none focus:outline-none cursor-pointer"
            >
                {planets.map(planet => (
                    <option key={planet.id} value={planet.id} className="bg-gray-800 text-white">
                        {planet.name} [{planet.coordinates}]
                    </option>
                ))}
            </select>
        </div>
    );
};

export default PlanetSelector;
