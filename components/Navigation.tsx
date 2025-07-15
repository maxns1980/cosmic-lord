

import React, { useState, useEffect } from 'react';
import { View, MerchantState, MerchantStatus } from '../types.ts';

interface NavigationProps {
    activeView: View;
    setActiveView: (view: View) => void;
    unreadMessagesCount: number;
    merchantState: MerchantState;
}

const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const Countdown: React.FC<{ targetTime: number }> = ({ targetTime }) => {
    const [remaining, setRemaining] = useState(targetTime - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setRemaining(targetTime - Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, [targetTime]);

    return <span className="ml-2 text-xs font-mono">({formatTime(remaining / 1000)})</span>;
}

const NavButton: React.FC<{ label: string, view: View, activeView: View, onClick: (view: View) => void, icon: string, badgeCount?: number, countdownTime?: number }> = 
({ label, view, activeView, onClick, icon, badgeCount, countdownTime }) => (
    <button
        onClick={() => onClick(view)}
        className={`relative flex-1 flex items-center justify-center px-4 py-3 text-sm md:text-base font-bold transition-all duration-300 rounded-t-lg
        ${activeView === view 
            ? 'bg-gray-800 bg-opacity-70 border-b-2 border-cyan-400 text-white' 
            : 'bg-gray-900 bg-opacity-50 text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
    >
       <span className="text-xl mr-2">{icon}</span> {label}
       {badgeCount !== undefined && badgeCount > 0 && (
           <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white ring-2 ring-gray-900">{badgeCount > 9 ? '9+' : badgeCount}</span>
       )}
       {countdownTime !== undefined && countdownTime > Date.now() && <Countdown targetTime={countdownTime} />}
    </button>
);

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView, unreadMessagesCount, merchantState }) => {
    let merchantCountdown: number | undefined;
    let merchantLabel = 'Kupiec';

    if (merchantState.status === MerchantStatus.INCOMING) {
        merchantCountdown = merchantState.arrivalTime;
        merchantLabel = 'Kupiec w drodze';
    } else if (merchantState.status === MerchantStatus.ACTIVE) {
        merchantCountdown = merchantState.departureTime;
        merchantLabel = 'Kupiec';
    }

    return (
        <nav className="flex flex-wrap md:flex-nowrap space-x-1 md:space-x-2 border-b border-gray-700">
            <NavButton label="Budynki" view="buildings" activeView={activeView} onClick={setActiveView} icon="🏢" />
            <NavButton label="Badania" view="research" activeView={activeView} onClick={setActiveView} icon="🔬" />
            <NavButton label="Ulepszenia" view="fleet_upgrades" activeView={activeView} onClick={setActiveView} icon="⬆️" />
            <NavButton label="Stocznia" view="shipyard" activeView={activeView} onClick={setActiveView} icon="🛠️" />
            <NavButton label="Obrona" view="defense" activeView={activeView} onClick={setActiveView} icon="🛡️" />
            <NavButton label="Flota" view="fleet" activeView={activeView} onClick={setActiveView} icon="🚀" />
            <NavButton label="Galaktyka" view="galaxy" activeView={activeView} onClick={setActiveView} icon="🪐" />
            <NavButton label="Wiadomości" view="messages" activeView={activeView} onClick={setActiveView} icon="✉️" badgeCount={unreadMessagesCount} />
            {merchantState.status !== MerchantStatus.INACTIVE && (
                 <NavButton label={merchantLabel} view="merchant" activeView={activeView} onClick={setActiveView} icon="💰" countdownTime={merchantCountdown} />
            )}
        </nav>
    );
}

export default Navigation;