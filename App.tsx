

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    BuildingType, Resources, BuildingLevels, ResearchLevels, ResearchType, Fleet, QueueItem, QueueItemType, GameObject, 
    Defenses, FleetMission, MissionType, DefenseType, ShipType, Message, 
    MerchantState, MerchantStatus, View, ShipLevels, DebrisField,
    PirateMercenaryState, AncientArtifactStatus, AncientArtifactChoice,
    Inventory, ActiveBoosts, BoostType, Boost, 
    GameState, Planet, Alliance
} from './types';
import { 
    API_URL
} from './constants';
import Header from './components/Header';
import BuildingsPanel from './components/BuildingsPanel';
import ResearchPanel from './components/ResearchPanel';
import ShipyardPanel from './components/ShipyardPanel';
import DefensePanel from './components/DefensePanel';
import FleetPanel from './components/FleetPanel';
import MessagesPanel from './components/MessagesPanel';
import { MerchantPanel } from './components/MerchantPanel';
import Navigation from './components/Navigation';
import QueuePanel from './components/QueuePanel';
import GalaxyPanel from './components/GalaxyPanel';
import FleetUpgradesPanel from './components/FleetUpgradesPanel';
import PirateMercenaryPanel from './components/PirateMercenaryPanel';
import AncientArtifactModal from './components/AncientArtifactModal';
import InfoModal from './components/InfoModal';
import EncyclopediaModal from './components/EncyclopediaModal';
import InventoryModal from './components/InventoryModal';
import { calculateMaxResources } from './src/utils/gameLogic';
import RankingsPanel from './components/RankingsPanel';
import Auth from './components/Auth';
import AlliancePanel from './components/AlliancePanel';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlanetId, setCurrentPlanetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [notification, setNotification] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>('buildings');
  const [fleetTarget, setFleetTarget] = useState<{coords: string, mission: MissionType} | null>(null);
  
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  
  const currentPlanet = useMemo(() => {
    if (!gameState || !Array.isArray(gameState.planets) || !currentPlanetId) return null;
    return gameState.planets.find(p => p.id === currentPlanetId);
  }, [gameState, currentPlanetId]);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchGameState = useCallback(async (isInitial: boolean) => {
    if (!token) {
        if (isInitial) setIsLoading(false);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/state`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) { // Unauthorized
                handleLogout();
            }
            if (isInitial) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Błąd serwera: ${response.status} ${response.statusText}`);
            } else {
                console.error("Background state refresh failed.");
                return;
            }
        }
        const loadedState: GameState = await response.json();
        
        setGameState(loadedState);

        if ((isInitial || !currentPlanetId) && loadedState.planets && loadedState.planets.length > 0) {
            const homePlanet = loadedState.planets.find(p => p.isHomeworld) || loadedState.planets[0];
            setCurrentPlanetId(homePlanet.id);
            if (isInitial) showNotification(`Witaj, ${loadedState.username}! Stan imperium wczytany.`);
        }

    } catch (err) {
        if (isInitial) {
            setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd połączenia.');
            console.error(err);
        }
    } finally {
        if (isInitial) {
            setIsLoading(false);
        }
    }
  }, [token, currentPlanetId, showNotification]);

  const handleLoginSuccess = (newToken: string) => {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setError(null);
      setIsLoading(true); // show loading screen while we fetch state for the new user
  }

  const handleLogout = () => {
      localStorage.removeItem('token');
      setToken(null);
      setGameState(null);
      setCurrentPlanetId(null);
      setActiveView('buildings');
  }
  
  const handleUpdateAlliance = (alliance: Alliance | undefined) => {
      setGameState(prev => prev ? ({ ...prev, alliance }) : null);
  }

  // Effect for fetching state from server on initial load or token change
  useEffect(() => {
    fetchGameState(true);
  }, [token]); 
  
  // Effect for auto-refreshing state after queue or fleet items finish
  useEffect(() => {
    if (isLoading || !gameState) {
        return;
    }

    const nextQueueItem = Array.isArray(gameState.planets)
        ? gameState.planets
            .flatMap(p => p.buildQueue || [])
            .filter((item): item is QueueItem => !!item)
            .sort((a, b) => a.endTime - b.endTime)[0]
        : undefined;

    const nextMissionItem = Array.isArray(gameState.fleetMissions)
        ? gameState.fleetMissions
            .map(m => m.returnTime)
            .sort((a, b) => a - b)[0]
        : undefined;
        
    const nextMerchantEvent = gameState.merchantState.status === MerchantStatus.INCOMING 
        ? gameState.merchantState.arrivalTime 
        : (gameState.merchantState.status === MerchantStatus.ACTIVE ? gameState.merchantState.departureTime : undefined);

    const nextTimestamp = [nextQueueItem?.endTime, nextMissionItem, nextMerchantEvent]
        .filter((ts): ts is number => !!ts && ts > Date.now())
        .sort((a,b) => a - b)[0];

    if (!nextTimestamp) {
        return;
    }

    const timeUntilEnd = nextTimestamp - Date.now();
    
    const timerId = setTimeout(() => {
        fetchGameState(false);
    }, timeUntilEnd > 0 ? timeUntilEnd + 1000 : 1000); // add 1s buffer

    return () => clearTimeout(timerId);
  }, [gameState, fetchGameState, isLoading]);

  const handleArtifactChoice = useCallback((choice: AncientArtifactChoice) => {
    // This logic will be moved to the backend
  }, []);

const handleActivateBoost = useCallback(async (boostId: string) => {
    if (!token) return;
    try {
        const response = await fetch(`${API_URL}/api/inventory/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ boostId }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Błąd aktywacji bonusu.');
        }

        setGameState(prev => prev ? ({ ...prev, inventory: data.inventory, activeBoosts: data.activeBoosts }) : prev);
        showNotification(data.message);

    } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Błąd serwera podczas aktywacji.');
        console.error(err);
    }
}, [token, showNotification]);


  const handleAddToQueue = useCallback(async (id: GameObject, type: QueueItemType, amount = 1) => {
    if (!currentPlanetId || !token) return;
    
    try {
        const response = await fetch(`${API_URL}/api/queue/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ planetId: currentPlanetId, id, type, amount }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Wystąpił nieznany błąd.');
        
        setGameState(prev => {
            if (!prev) return null;
            const newPlanets = prev.planets.map(p => 
                p.id === currentPlanetId ? { ...p, resources: data.resources, buildQueue: data.buildQueue } : p
            );
            return { ...prev, planets: newPlanets };
        });

        showNotification(data.message);

    } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Błąd serwera.');
        console.error(err);
    }
  }, [currentPlanetId, token, showNotification]);
  
  const handleSendFleet = useCallback(async (missionFleet: Fleet, targetCoords: string, missionType: MissionType) => {
      if (!currentPlanetId || !token) return;

      try {
        const response = await fetch(`${API_URL}/api/fleet/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ originPlanetId: currentPlanetId, missionFleet, targetCoords, missionType }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Wystąpił nieznany błąd.');
        
        setGameState(prev => {
            if (!prev) return null;
            const newPlanets = prev.planets.map(p => 
                p.id === currentPlanetId ? { ...p, resources: data.resources, fleet: data.fleet } : p
            );
            return { ...prev, planets: newPlanets, fleetMissions: data.fleetMissions };
        });

        showNotification(data.message);

    } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Błąd serwera.');
        console.error(err);
    }
  }, [currentPlanetId, token, showNotification]);

  const handleMarkAsRead = useCallback((messageId: string) => { 
    setGameState(prev => prev ? ({...prev, messages: prev.messages.map(m => m.id === messageId ? { ...m, isRead: true } : m) }) : prev);
   }, []);
  const handleDeleteMessage = useCallback((messageId: string) => { 
    setGameState(prev => prev ? ({...prev, messages: prev.messages.filter(m => m.id !== messageId)}) : prev);
  }, []);
  const handleDeleteAllMessages = useCallback(() => { 
    setGameState(prev => prev ? ({...prev, messages: []}) : prev);
  }, []);

  const handleTrade = useCallback(async (resource: keyof Resources, amount: number, tradeType: 'buy' | 'sell') => {
      if (!currentPlanetId || !token) return;
      try {
        const response = await fetch(`${API_URL}/api/merchant/trade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ planetId: currentPlanetId, resource, amount, tradeType }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Wystąpił nieznany błąd.');
        
        setGameState(prev => {
            if (!prev) return null;
            const newPlanets = prev.planets.map(p => 
                p.id === currentPlanetId ? { ...p, resources: data.resources } : p
            );
            return { ...prev, planets: newPlanets, credits: data.credits };
        });

        showNotification(data.message);

    } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Błąd serwera.');
        console.error(err);
    }
  }, [currentPlanetId, token, showNotification]);

  const handleHirePirates = useCallback(() => { /* Logic to be moved to backend */ }, []);

  const handleActionFromGalaxy = useCallback((targetCoords: string, missionType: MissionType) => {
    setFleetTarget({ coords: targetCoords, mission: missionType });
    setActiveView('fleet');
  }, []);
  
  if (!token) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-2xl font-bold">
            <div className="text-center">
                <p className="animate-pulse">Wczytywanie danych imperium...</p>
            </div>
        </div>
    );
  }

  if (error || !gameState || !currentPlanet) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-400 text-xl p-8">
            <div className="bg-gray-800 border border-red-500 p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Błąd Krytyczny</h2>
                <p className="text-lg text-red-300">{error || 'Nie można załadować stanu gry.'}</p>
                <button onClick={handleLogout} className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded">Wyloguj i spróbuj ponownie</button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 bg-cover bg-center bg-fixed" style={{backgroundImage: "url('https://picsum.photos/seed/galaxy/1920/1080')"}}>
      {isInfoModalOpen && <InfoModal onClose={() => setIsInfoModalOpen(false)} />}
      {isEncyclopediaOpen && <EncyclopediaModal onClose={() => setIsEncyclopediaOpen(false)} />}
      {isInventoryOpen && <InventoryModal inventory={gameState.inventory} onActivateBoost={handleActivateBoost} onClose={() => setIsInventoryOpen(false)} />}
      {gameState.ancientArtifactState.status === AncientArtifactStatus.AWAITING_CHOICE && (
        <AncientArtifactModal onChoice={handleArtifactChoice} />
      )}
      <div className="min-h-screen bg-black bg-opacity-70 backdrop-blur-sm">
        <Header 
            username={gameState.username}
            onLogout={handleLogout}
            planets={gameState.planets}
            currentPlanet={currentPlanet}
            onSelectPlanet={setCurrentPlanetId}
            credits={gameState.credits}
            inventory={gameState.inventory}
            activeBoosts={gameState.activeBoosts}
            onInfoClick={() => setIsInfoModalOpen(true)}
            onEncyclopediaClick={() => setIsEncyclopediaOpen(true)}
            onInventoryClick={() => setIsInventoryOpen(true)}
            npcFleetMissions={gameState.npcFleetMissions}
            resourceVeinBonus={gameState.resourceVeinBonus}
        />
        <PirateMercenaryPanel pirateState={gameState.pirateMercenaryState} credits={gameState.credits} onHire={handleHirePirates} />
        <main className="container mx-auto p-4 md:p-8">
            <Navigation 
                activeView={activeView} 
                setActiveView={setActiveView} 
                unreadMessagesCount={(gameState.messages || []).filter(m => !m.isRead).length}
                merchantState={gameState.merchantState}
            />
            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-blue-900 border border-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
                    {notification}
                </div>
            )}
            
            <QueuePanel queue={currentPlanet.buildQueue} queueCapacity={gameState.activeBoosts[BoostType.EXTRA_BUILD_QUEUE]?.level || 1} />

            <div className="mt-6">
                {activeView === 'buildings' && <BuildingsPanel buildings={currentPlanet.buildings} research={gameState.research} resources={currentPlanet.resources} onUpgrade={(type) => handleAddToQueue(type, 'building')} buildQueue={currentPlanet.buildQueue} energyEfficiency={1} /* Placeholder, needs calculation */ />}
                {activeView === 'research' && <ResearchPanel buildings={currentPlanet.buildings} research={gameState.research} resources={currentPlanet.resources} onUpgrade={(type) => handleAddToQueue(type, 'research')} buildQueue={currentPlanet.buildQueue} />}
                {activeView === 'fleet_upgrades' && <FleetUpgradesPanel buildings={currentPlanet.buildings} research={gameState.research} shipLevels={gameState.shipLevels} resources={currentPlanet.resources} onUpgrade={(type) => handleAddToQueue(type, 'ship_upgrade')} buildQueue={currentPlanet.buildQueue} />}
                {activeView === 'shipyard' && <ShipyardPanel buildings={currentPlanet.buildings} research={gameState.research} resources={currentPlanet.resources} onBuild={(type, amount) => handleAddToQueue(type, 'ship', amount)} buildQueue={currentPlanet.buildQueue} fleet={currentPlanet.fleet} />}
                {activeView === 'defense' && <DefensePanel buildings={currentPlanet.buildings} research={gameState.research} resources={currentPlanet.resources} onBuild={(type, amount) => handleAddToQueue(type, 'defense', amount)} buildQueue={currentPlanet.buildQueue} defenses={currentPlanet.defenses} />}
                {activeView === 'fleet' && <FleetPanel fleet={currentPlanet.fleet} fleetMissions={gameState.fleetMissions} onSendFleet={handleSendFleet} research={gameState.research} initialTarget={fleetTarget} onClearInitialTarget={() => setFleetTarget(null)} spacePlague={gameState.spacePlague} colonies={gameState.planets} />}
                {activeView === 'galaxy' && <GalaxyPanel onAction={handleActionFromGalaxy} colonies={gameState.planets} token={token} playerAlliance={gameState.alliance} />}
                {activeView === 'messages' && <MessagesPanel messages={gameState.messages} onRead={handleMarkAsRead} onDelete={handleDeleteMessage} onDeleteAll={handleDeleteAllMessages} />}
                {activeView === 'merchant' && gameState.merchantState.status === MerchantStatus.ACTIVE && <MerchantPanel merchantState={gameState.merchantState} resources={currentPlanet.resources} credits={gameState.credits} maxResources={calculateMaxResources(currentPlanet.buildings)} onTrade={handleTrade} />}
                {activeView === 'rankings' && <RankingsPanel currentPlayerUsername={gameState.username} playerAlliance={gameState.alliance} />}
                {activeView === 'alliance' && <AlliancePanel alliance={gameState.alliance} onUpdateAlliance={handleUpdateAlliance} />}
            </div>
           <footer className="text-center text-gray-500 mt-12 pb-4">
              <p>Kosmiczny Władca - Inspirowane OGame</p>
              <p>Stan gry jest automatycznie zapisywany na serwerze.</p>
           </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
