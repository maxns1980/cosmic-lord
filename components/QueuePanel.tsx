

import React, { useState, useEffect } from 'react';
import { QueueItem, ShipType } from '../types';
import { ALL_GAME_OBJECTS, SHIPYARD_DATA } from '../constants';

interface QueuePanelProps {
    queue: QueueItem[];
    queueCapacity: number;
}

const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const QueuePanel: React.FC<QueuePanelProps> = ({ queue, queueCapacity }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (queue.length === 0) {
        return null;
    }
    
    const buildingQueue = queue.filter(q => ['building', 'research', 'ship_upgrade'].includes(q.type));
    const shipyardQueue = queue.filter(q => ['ship', 'defense'].includes(q.type));

    const renderQueue = (title: string, currentQueue: QueueItem[], capacity: number) => {
        if (currentQueue.length === 0) return null;

        const currentItem = currentQueue[0];
        const itemInfo = ALL_GAME_OBJECTS[currentItem.id as keyof typeof ALL_GAME_OBJECTS];
        const remainingTime = (currentItem.endTime - currentTime) / 1000;
        const progress = Math.min(100, ((currentItem.buildTime - remainingTime) / currentItem.buildTime) * 100);

        const getIcon = () => {
            if (currentItem.type === 'ship_upgrade') {
                return SHIPYARD_DATA[currentItem.id as ShipType].icon;
            }
            return (itemInfo as { icon?: string }).icon || '❓';
        };

        const label = currentItem.type === 'ship' || currentItem.type === 'defense' ? 'Ilość' : 'Poziom';

        return (
             <div className="bg-gray-900 bg-opacity-80 border border-cyan-800 rounded-lg p-4 my-4 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">{title} ({currentQueue.length}/{capacity})</h3>
                <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{getIcon()} {itemInfo.name} ({label} {currentItem.levelOrAmount})</span>
                    <span className="font-mono text-xl text-green-400">{formatTime(remainingTime)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                    <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        )
    }

    return (
       <>
        {renderQueue("Kolejka Budowy/Badań", buildingQueue, queueCapacity)}
        {renderQueue("Kolejka Stoczni", shipyardQueue, queueCapacity)}
       </>
    )
}

export default QueuePanel;