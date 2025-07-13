

import React, { useState, useEffect } from 'react';
import { Message, SpyReport, BattleReport, MerchantStatus, MerchantInfoMessage, EspionageEventMessage, Loot, PirateMessage, PirateMercenaryStatus, ShipType, AsteroidImpactMessage, AsteroidImpactType, BuildingType, ResourceVeinMessage, AncientArtifactMessage, AncientArtifactChoice, ResearchType, SpacePlagueMessage, OfflineSummaryMessage, ExpeditionMessage, ExpeditionOutcomeType, ColonizationMessage, BattleMessage, SpyMessage, ExplorationMessage, ExplorationOutcomeType, BoostType, Boost } from '../types';
import { ALL_GAME_OBJECTS, SHIPYARD_DATA, BUILDING_DATA, RESEARCH_DATA } from '../constants';

interface MessagesPanelProps {
    messages: Message[];
    onRead: (messageId: string) => void;
    onDelete: (messageId: string) => void;
    onDeleteAll: () => void;
}

const formatNumber = (num: number) => Math.floor(num).toLocaleString('pl-PL');
const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const ReportSection: React.FC<{ title: string, data: object | undefined, emptyText: string }> = ({ title, data, emptyText }) => {
    if (!data || Object.keys(data).length === 0 || Object.values(data).every(v => v === 0)) {
        return (
            <div>
                <h4 className="font-bold text-cyan-400 border-b border-gray-600 pb-1 mb-2">{title}</h4>
                <p className="text-gray-400">{emptyText}</p>
            </div>
        );
    }

    return (
        <div>
            <h4 className="font-bold text-cyan-400 border-b border-gray-600 pb-1 mb-2">{title}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                {Object.entries(data).map(([id, value]) => {
                    const info = ALL_GAME_OBJECTS[id as keyof typeof ALL_GAME_OBJECTS];
                    if (!info || !value) return null;
                    return <span key={id}>{info.name}: {formatNumber(value)}</span>
                })}
            </div>
        </div>
    )
}

const LootDisplay: React.FC<{ loot: Loot }> = ({ loot }) => {
    const hasLoot = (loot.metal || 0) > 0 || (loot.crystal || 0) > 0 || (loot.deuterium || 0) > 0 || (loot.credits || 0) > 0;
    if (!hasLoot) {
        return <p className="text-gray-400">Nie zgrabiono żadnych surowców.</p>
    }
    return (
        <div className="grid grid-cols-2 gap-2">
            {loot.metal && loot.metal > 0 ? <span>🔩 Metal: {formatNumber(loot.metal)}</span> : null}
            {loot.crystal && loot.crystal > 0 ? <span>💎 Kryształ: {formatNumber(loot.crystal)}</span> : null}
            {loot.deuterium && loot.deuterium > 0 ? <span>💧 Deuter: {formatNumber(loot.deuterium)}</span> : null}
            {loot.credits && loot.credits > 0 ? <span>💰 Kredyty: {formatNumber(loot.credits)}</span> : null}
        </div>
    );
};

const SpyReportDisplay: React.FC<{ report: SpyReport }> = ({ report }) => {
    return (
        <div className="space-y-4 text-sm">
            <div>
                <h4 className="font-bold text-cyan-400 border-b border-gray-600 pb-1 mb-2">Surowce</h4>
                <div className="grid grid-cols-3 gap-2">
                    <span>🔩 Metal: {formatNumber(report.resources.metal || 0)}</span>
                    <span>💎 Kryształ: {formatNumber(report.resources.crystal || 0)}</span>
                    <span>💧 Deuter: {formatNumber(report.resources.deuterium || 0)}</span>
                </div>
            </div>
             <ReportSection title="Flota" data={report.fleet} emptyText="Brak floty." />
             <ReportSection title="Obrona" data={report.defenses} emptyText="Brak obrony." />
             <ReportSection title="Budynki" data={report.buildings} emptyText="Nie wykryto budynków." />
             <ReportSection title="Badania" data={report.research} emptyText="Nie wykryto badań." />
        </div>
    );
};

const BattleReportDisplay: React.FC<{ report: BattleReport }> = ({ report }) => {
    const { 
        attackerName, defenderName, attackerFleet, defenderFleet, defenderDefenses, 
        attackerLosses, defenderLosses, defenderDefensesLosses, loot, debrisCreated
    } = report;

    const hasDebris = (debrisCreated?.metal || 0) > 0 || (debrisCreated?.crystal || 0) > 0;

    return (
        <div className="space-y-6 text-sm">
            <div>
                <p className="text-gray-300">
                    Flota gracza <span className="font-bold text-red-400">{attackerName}</span> zaatakowała planetę gracza <span className="font-bold text-green-400">{defenderName}</span>.
                </p>
            </div>
            
            {/* Attacker */}
            <div className="p-3 bg-red-900 bg-opacity-20 rounded-lg">
                <h3 className="text-lg font-bold text-red-300 mb-2">Atakujący: {attackerName}</h3>
                <ReportSection title="Flota przed bitwą" data={attackerFleet} emptyText="Brak floty."/>
                <ReportSection title="Poniesione straty" data={attackerLosses} emptyText="Brak strat."/>
            </div>

            {/* Defender */}
            <div className="p-3 bg-green-900 bg-opacity-20 rounded-lg">
                <h3 className="text-lg font-bold text-green-300 mb-2">Obrońca: {defenderName}</h3>
                <ReportSection title="Flota przed bitwą" data={defenderFleet} emptyText="Brak floty na orbicie."/>
                <ReportSection title="Obrona przed bitwą" data={defenderDefenses} emptyText="Brak struktur obronnych."/>
                <ReportSection title="Straty floty" data={defenderLosses} emptyText="Brak strat."/>
                <ReportSection title="Straty obrony" data={defenderDefensesLosses} emptyText="Brak strat."/>
            </div>

            {/* Loot */}
            <div>
                 <h4 className="font-bold text-cyan-400 border-b border-gray-600 pb-1 mb-2">Zgrabione surowce</h4>
                 <LootDisplay loot={loot} />
            </div>
            
            {/* Debris */}
            {hasDebris && (
                 <div>
                    <h4 className="font-bold text-yellow-300 border-b border-gray-600 pb-1 mb-2">Pole Zniszczeń ♻️</h4>
                    <p className="text-gray-400">
                        Pole zniszczeń zawiera: 
                        <span className="mx-2">🔩 Metal: {formatNumber(debrisCreated.metal || 0)}</span>
                        <span className="mx-2">💎 Kryształ: {formatNumber(debrisCreated.crystal || 0)}</span>.
                        Możesz je zebrać za pomocą Recyklerów.
                    </p>
                 </div>
            )}
        </div>
    );
};

const MerchantInfoDisplay: React.FC<{ message: MerchantInfoMessage }> = ({ message }) => {
    let text = '';
    switch (message.merchantStatus) {
        case MerchantStatus.INCOMING:
            text = `Wykryto sygnaturę kupca. Przybędzie za jakiś czas.`;
            break;
        case MerchantStatus.ACTIVE:
            text = `Wędrowny kupiec przybył na Twoją orbitę. Pozostanie tu przez jakiś czas, oferując swoje towary.`;
            break;
        case MerchantStatus.INACTIVE: // This means it just departed
            text = `Kupiec opuścił Twoją orbitę.`;
            break;
    }
    return <p>{text}</p>;
};

const EspionageEventDisplay: React.FC<{ message: EspionageEventMessage }> = ({ message }) => {
    return <p>Twoja planeta została wyszpiegowana przez flotę z koordynatów <span className="font-bold text-yellow-400">[{message.spyCoords}]</span>. Napastnik jest znany jako <span className="font-bold text-red-400">{message.spyName || 'Nieznany'}</span>.</p>
};

const PirateMessageDisplay: React.FC<{ message: PirateMessage }> = ({ message }) => {
    const { pirateState } = message;
    let text = '';
    switch (pirateState.status) {
        case PirateMercenaryStatus.INCOMING:
            text = `Wykryto sygnaturę floty piratów-najemników. Zbliżają się do Twojego systemu.`;
            break;
        case PirateMercenaryStatus.AVAILABLE:
            text = `Piraci-najemnicy przybyli i oferują swoje usługi. Ich oferta jest ograniczona czasowo.`;
            break;
        case PirateMercenaryStatus.DEPARTED:
             text = `Oferta najemników wygasła i odlecieli w poszukiwaniu innych klientów.`;
            break;
    }
    return <p>{text}</p>;
};

const AsteroidImpactDisplay: React.FC<{ message: AsteroidImpactMessage }> = ({ message }) => {
    if (message.impactType === AsteroidImpactType.DAMAGE && message.details.buildingId) {
        const buildingName = BUILDING_DATA[message.details.buildingId].name;
        return <p>Uderzenie asteroidy uszkodziło Twój budynek: <span className="font-bold text-red-400">{buildingName}</span>. Został on zdegradowany do poziomu {message.details.newLevel}.</p>;
    }
    if (message.impactType === AsteroidImpactType.BONUS && message.details.resourceType) {
        const resourceName = message.details.resourceType === 'metal' ? 'Metalu' : 'Kryształu';
        return <p>Deszcz meteorytów wzbogacił Twoją planetę! Otrzymano bonus: <span className="font-bold text-green-400">+{formatNumber(message.details.amount || 0)} {resourceName}</span>.</p>;
    }
    return <p>Wykryto zjawisko astronomiczne w pobliżu planety.</p>;
};

const ResourceVeinDisplay: React.FC<{ message: ResourceVeinMessage }> = ({ message }) => {
    const resourceNameMap = { metal: 'Metalu', crystal: 'Kryształu', deuterium: 'Deuteru' };
    const resourceName = resourceNameMap[message.resourceType];
    if (message.status === 'activated') {
        return <p>Odkryto bogatą żyłę <span className="font-bold text-yellow-400">{resourceName}</span>! Produkcja wzrosła o 25% na 24 godziny.</p>;
    } else {
        return <p>Premia do wydobycia <span className="font-bold text-yellow-400">{resourceName}</span> wygasła. Produkcja wróciła do normy.</p>;
    }
};

const AncientArtifactDisplay: React.FC<{ message: AncientArtifactMessage }> = ({ message }) => {
    const { choice, outcome } = message;
    switch (choice) {
        case AncientArtifactChoice.STUDY:
            if (outcome.success && outcome.technology) {
                const techName = RESEARCH_DATA[outcome.technology].name;
                return <p>Twoi naukowcy z sukcesem zbadali artefakt! <span className="font-bold text-green-400">Technologia {techName} została ulepszona do poziomu {outcome.newLevel}!</span></p>;
            }
            return <p>Niestety, artefakt okazał się zbyt skomplikowany. Twoi naukowcy nie zdołali niczego odkryć, a surowce przepadły.</p>;
        case AncientArtifactChoice.SELL:
            return <p>Sprzedano artefakt na czarnym rynku za <span className="font-bold text-yellow-400">{formatNumber(outcome.creditsGained || 0)}💰</span>. Dobry interes!</p>;
        case AncientArtifactChoice.IGNORE:
            return <p>Postanowiono zignorować artefakt, zakopując go głęboko. Kto wie, jakie tajemnice skrywał...</p>;
    }
    return null;
};

const SpacePlagueDisplay: React.FC<{ message: SpacePlagueMessage }> = ({ message }) => {
    const shipName = SHIPYARD_DATA[message.infectedShip].name;
    if (message.status === 'activated') {
        return <p>Wykryto kosmiczną zarazę! Twoje statki typu <span className="font-bold text-red-400">{shipName}</span> zostały zainfekowane. Ich siła ataku jest tymczasowo zmniejszona.</p>;
    } else {
        return <p>Dobra wiadomość! Zaraza na statkach typu <span className="font-bold text-green-400">{shipName}</span> została zwalczona. Ich siła wróciła do normy.</p>;
    }
};

const OfflineSummaryDisplay: React.FC<{ message: OfflineSummaryMessage }> = ({ message }) => {
    return (
        <div>
            <p className="mb-2">Podczas Twojej nieobecności (<span className="font-bold">{formatTime(message.duration)}</span>) miały miejsce następujące wydarzenia:</p>
            {message.events.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                    {message.events.map((event, index) => <li key={index}>{event}</li>)}
                </ul>
            ) : (
                <p className="text-gray-400">Wszystko przebiegało spokojnie.</p>
            )}
        </div>
    );
};

const ExpeditionDisplay: React.FC<{ message: ExpeditionMessage }> = ({ message }) => {
    const { outcome, details } = message;

    const outcomeText = {
        [ExpeditionOutcomeType.FIND_RESOURCES]: 'Twoja flota natrafiła na opuszczony wrak i odzyskała surowce!',
        [ExpeditionOutcomeType.FIND_MONEY]: 'Twoi zwiadowcy znaleźli starożytny skarbiec z kredytami!',
        [ExpeditionOutcomeType.FIND_FLEET]: 'Odnaleziono porzucone, ale wciąż sprawne statki, które dołączyły do Twojej floty!',
        [ExpeditionOutcomeType.NOTHING]: 'Wyprawa nie przyniosła żadnych rezultatów. Twoja flota wraca z pustymi rękami.',
        [ExpeditionOutcomeType.PIRATES]: 'Twoja flota wpadła w zasadzkę piratów! Po krótkiej walce udało się uciec, ale poniesiono straty.',
        [ExpeditionOutcomeType.ALIENS]: 'Napotkano wrogą cywilizację obcych! Flota ledwo uszła z życiem, ponosząc ciężkie straty.',
        [ExpeditionOutcomeType.DELAY]: 'Niespodziewana burza kosmiczna spowolniła Twoją flotę. Jej powrót opóźni się.',
        [ExpeditionOutcomeType.LOST]: 'Tragiczne wieści. Kontakt z flotą został utracony. Uznaje się ją za zaginioną w akcji.',
    };

    return (
        <div className="space-y-4">
            <p>{outcomeText[outcome]}</p>
            {details.resourcesGained && <div className="p-2 bg-gray-700 rounded"><h5 className="font-bold text-cyan-300">Zyskane surowce:</h5><LootDisplay loot={details.resourcesGained} /></div>}
            {details.creditsGained && <div className="p-2 bg-gray-700 rounded"><h5 className="font-bold text-cyan-300">Zyskane kredyty:</h5><LootDisplay loot={{ credits: details.creditsGained }} /></div>}
            {details.fleetGained && <div className="p-2 bg-gray-700 rounded"><ReportSection title="Odzyskana flota" data={details.fleetGained} emptyText=""/></div>}
            {details.fleetLost && <div className="p-2 bg-red-900 bg-opacity-30 rounded"><ReportSection title="Poniesione straty" data={details.fleetLost} emptyText=""/></div>}
            {details.delaySeconds && <p className="text-yellow-400">Opóźnienie powrotu o około: {formatTime(details.delaySeconds)}.</p>}
        </div>
    );
};

const ColonizationDisplay: React.FC<{ message: ColonizationMessage }> = ({ message }) => {
    if (message.success) {
        return <p>Twoja misja zakończyła się sukcesem! <span className="font-bold text-green-400">Nowa kolonia została założona na [{message.coords}]!</span></p>;
    }
    return <p>Niestety, misja kolonizacyjna na [{message.coords}] nie powiodła się. Statek Kolonizacyjny został stracony.</p>;
};

const ExplorationDisplay: React.FC<{ message: ExplorationMessage }> = ({ message }) => {
    const { outcome, details } = message;

    const outcomeTextMap: Record<string, string> = {
        [ExplorationOutcomeType.HOSTILES]: `Twoja flota badawcza na [${details.targetCoords}] napotkała nieznane wrogie siły!`,
        [ExplorationOutcomeType.FIND_BOOST]: `Doskonałe wieści z [${details.targetCoords}]! Twoi badacze dokonali przełomowego odkrycia!`,
        [ExplorationOutcomeType.FIND_RESOURCES]: `Eksploracja na [${details.targetCoords}] ujawniła złoża cennych surowców.`,
        [ExplorationOutcomeType.NOTHING]: `Po długich badaniach na [${details.targetCoords}], Twoja flota nie znalazła niczego godnego uwagi.`,
        [ExplorationOutcomeType.FIND_SHIP_WRECK]: `Twoja flota badawcza natrafiła na małe pole zniszczeń na [${details.targetCoords}] i odzyskała sprawne jednostki!`,
    };

    const getBoostDescription = (boost?: Boost) => {
        if (!boost) return '';
        const durationHours = boost.duration / 3600;
        switch (boost.type) {
            case BoostType.EXTRA_BUILD_QUEUE:
                return `Technologia pozwalająca na zarządzanie ${boost.level} kolejkami budowy przez ${durationHours} godzin.`;
            case BoostType.RESOURCE_PRODUCTION_BOOST:
                return `Moduł zwiększający produkcję wszystkich surowców o ${boost.level}% na ${durationHours} godzin.`;
            case BoostType.COMBAT_TECH_BOOST:
                return `Moduł podnoszący poziom Technologii Bojowej o ${boost.level} na ${durationHours} godzin.`;
            case BoostType.ARMOR_TECH_BOOST:
                return `Moduł wzmacniający pancerz, podnoszący poziom Technologii Pancerza o ${boost.level} na ${durationHours} godzin.`;
            case BoostType.DRIVE_TECH_BOOST:
                return `Ulepszenie zwiększające prędkość wszystkich statków o ${boost.level}% na ${durationHours} godzin.`;
            case BoostType.CONSTRUCTION_COST_REDUCTION:
                return `Odnaleziono schematy obcych, które jednorazowo obniżą koszt następnego budynku lub badania o ${boost.level}%.`;
            case BoostType.CONSTRUCTION_TIME_REDUCTION:
                return `Odkryto zestaw narzędzi nanotechnologicznych, który natychmiast skróci czas trwającej budowy lub badania o ${boost.level}h.`;
            case BoostType.STORAGE_PROTECTION_BOOST:
                return `Moduł ochronny, który zwiększy ochronę surowców w magazynach do ${boost.level}% na ${durationHours} godzin.`;
            case BoostType.SECTOR_ACTIVITY_SCAN:
                return `Jednorazowy skan, który po aktywacji ujawnia ruchy wrogich flot w Twoim sektorze na ${durationHours} godziny.`;
            case BoostType.ABANDONED_COLONY_LOOT:
                return 'Ujawnia lokację opuszczonej placówki. Aktywacja wyśle tam ekspedycję, która natychmiast powróci z cennymi surowcami i kredytami.';
            default:
                return '';
        }
    };

    return (
        <div className="space-y-3">
            <p>{outcomeTextMap[outcome]}</p>
            {details.fleetLost && <div className="p-2 bg-red-900 bg-opacity-30 rounded"><ReportSection title="Poniesione straty" data={details.fleetLost} emptyText=""/></div>}
            {details.fleetGained && <div className="p-2 bg-green-900 bg-opacity-30 rounded"><ReportSection title="Odzyskana flota" data={details.fleetGained} emptyText=""/></div>}
            {details.resourcesGained && <div className="p-2 bg-gray-700 rounded"><h5 className="font-bold text-cyan-300">Znalezione surowce:</h5><LootDisplay loot={details.resourcesGained} /></div>}
            {details.foundBoost && (
                <div className="p-3 bg-purple-900 bg-opacity-40 rounded-lg">
                    <h5 className="font-bold text-purple-300">Znaleziony bonus!</h5>
                    <p className="text-gray-300">{getBoostDescription(details.foundBoost)}</p>
                    <p className="text-sm text-gray-400 mt-2">Bonus został dodany do Twojego Inwentarza. Możesz go aktywować w dowolnym momencie.</p>
                </div>
            )}
        </div>
    );
}

const MessageContent: React.FC<{ message: Message }> = ({ message }) => {
    switch (message.type) {
        case 'spy':
            return <SpyReportDisplay report={(message as SpyMessage).report} />;
        case 'battle':
            return <BattleReportDisplay report={(message as BattleMessage).report} />;
        case 'merchant':
            return <MerchantInfoDisplay message={message as MerchantInfoMessage} />;
        case 'espionage_event':
            return <EspionageEventDisplay message={message as EspionageEventMessage} />;
        case 'pirate':
            return <PirateMessageDisplay message={message as PirateMessage} />;
        case 'asteroid_impact':
            return <AsteroidImpactDisplay message={message as AsteroidImpactMessage} />;
        case 'resource_vein':
            return <ResourceVeinDisplay message={message as ResourceVeinMessage} />;
        case 'ancient_artifact':
            return <AncientArtifactDisplay message={message as AncientArtifactMessage} />;
        case 'space_plague':
            return <SpacePlagueDisplay message={message as SpacePlagueMessage} />;
        case 'offline_summary':
            return <OfflineSummaryDisplay message={message as OfflineSummaryMessage} />;
        case 'expedition':
            return <ExpeditionDisplay message={message as ExpeditionMessage} />;
        case 'colonization':
            return <ColonizationDisplay message={message as ColonizationMessage} />;
        case 'exploration':
            return <ExplorationDisplay message={message as ExplorationMessage} />;
        default:
            return <p className="text-gray-500">Nieznany typ wiadomości.</p>;
    }
};

const getBattleIcon = (report: BattleReport) => report.isPlayerAttacker ? '⚔️' : '🛡️';

const getIconForMessage = (message: Message) => {
    switch (message.type) {
        case 'battle': return getBattleIcon((message as BattleMessage).report);
        case 'spy': return '👁️';
        case 'merchant': return '💰';
        case 'espionage_event': return '🤫';
        case 'pirate': return '🏴‍☠️';
        case 'asteroid_impact': return '💥';
        case 'resource_vein': return '✨';
        case 'ancient_artifact': return '👽';
        case 'space_plague': return '🦠';
        case 'offline_summary': return '📊';
        case 'expedition': return '🌌';
        case 'colonization': return '🌍';
        case 'exploration': return '🧭';
        default: return '✉️';
    }
};

const MessagesPanel: React.FC<MessagesPanelProps> = ({ messages, onRead, onDelete, onDeleteAll }) => {
    const [activeMessageId, setActiveMessageId] = useState<string | null>(messages.length > 0 ? messages[0].id : null);

    const activeMessage = messages.find(m => m.id === activeMessageId);

    useEffect(() => {
        if (activeMessage && !activeMessage.isRead) {
            onRead(activeMessage.id);
        }
    }, [activeMessage, onRead]);

    // Automatically select the newest message if the active one is deleted
    useEffect(() => {
        if (!activeMessage && messages.length > 0) {
            setActiveMessageId(messages[0].id);
        }
    }, [activeMessage, messages]);


    return (
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6">
            <div className="flex justify-between items-center mb-4 border-b-2 border-cyan-800 pb-3">
                <h2 className="text-2xl font-bold text-cyan-300">Skrzynka Odbiorcza</h2>
                {messages.length > 0 && (
                    <button onClick={onDeleteAll} className="px-3 py-1 bg-red-800 text-xs font-bold rounded hover:bg-red-700">Usuń Wszystkie</button>
                )}
            </div>

            {messages.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Brak wiadomości.</p>
            ) : (
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Message List */}
                    <div className="w-full md:w-1/3 flex-shrink-0">
                        <ul className="bg-gray-900 rounded-lg max-h-[60vh] overflow-y-auto">
                            {messages.map(msg => (
                                <li key={msg.id}
                                    onClick={() => setActiveMessageId(msg.id)}
                                    className={`p-3 border-b border-gray-700 cursor-pointer transition-colors duration-200 ${activeMessageId === msg.id ? 'bg-cyan-900 bg-opacity-50' : 'hover:bg-gray-800'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className={`font-bold ${!msg.isRead ? 'text-white' : 'text-gray-400'}`}>
                                            <span className="mr-2">{getIconForMessage(msg)}</span>
                                            {msg.subject}
                                        </div>
                                        {!msg.isRead && <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 ml-2"></div>}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{new Date(msg.timestamp).toLocaleString('pl-PL')}</div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Message Content */}
                    <div className="w-full md:w-2/3">
                        {activeMessage ? (
                            <div className="bg-gray-900 bg-opacity-60 rounded-lg p-6 min-h-[60vh] flex flex-col">
                                <div className="border-b border-gray-700 pb-3 mb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{activeMessage.subject}</h3>
                                            <p className="text-sm text-gray-400">{new Date(activeMessage.timestamp).toLocaleString('pl-PL')}</p>
                                        </div>
                                        <button onClick={() => onDelete(activeMessage.id)} className="px-3 py-1 bg-red-800 text-xs font-bold rounded hover:bg-red-700">Usuń</button>
                                    </div>
                                </div>
                                <div className="flex-grow text-gray-300">
                                    <MessageContent message={activeMessage} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-900 bg-opacity-60 rounded-lg p-6 min-h-[60vh] flex items-center justify-center">
                                <p className="text-gray-500">Wybierz wiadomość, aby ją odczytać.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesPanel;