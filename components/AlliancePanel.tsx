

import React, { useState, useEffect, useRef } from 'react';
import { Alliance, AllianceChatMessageFE } from '../types';
import { API_URL } from '../constants';

interface AlliancePanelProps {
    alliance: Alliance | undefined;
    onUpdateAlliance: (alliance: Alliance | undefined) => void;
}

const formatNumber = (num: number) => Math.floor(num).toLocaleString('pl-PL');

const AlliancePanel: React.FC<AlliancePanelProps> = ({ alliance, onUpdateAlliance }) => {
    const [allianceName, setAllianceName] = useState('');
    const [allianceTag, setAllianceTag] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [alliance?.chat]);

    useEffect(() => {
        if (!alliance || !alliance.id) return;

        const fetchChat = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const response = await fetch(`${API_URL}/api/alliances/chat`, {
                     headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const chatMessages: AllianceChatMessageFE[] = await response.json();
                    onUpdateAlliance({ ...alliance, chat: chatMessages });
                }
            } catch (err) {
                console.error("Failed to fetch alliance chat", err);
            }
        };

        const intervalId = setInterval(fetchChat, 5000); // Poll every 5 seconds

        return () => clearInterval(intervalId);
    }, [alliance?.id, onUpdateAlliance]);


    const handleCreateAlliance = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
            setError("Brak autoryzacji.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/alliances/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: allianceName, tag: allianceTag }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Błąd podczas tworzenia sojuszu.");
            }
            onUpdateAlliance(data.alliance);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLeaveAlliance = async () => {
        if (!window.confirm("Czy na pewno chcesz opuścić sojusz?")) return;
        
        setError('');
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
            setError("Brak autoryzacji.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/alliances/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
             const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Błąd podczas opuszczania sojuszu.");
            }
            onUpdateAlliance(undefined);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !alliance) return;

        const token = localStorage.getItem('token');
        if (!token) {
            setError("Brak autoryzacji.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/alliances/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: newMessage }),
            });
            const newMessages = await response.json();
            if (!response.ok) {
                throw new Error(newMessages.message || "Błąd podczas wysyłania wiadomości.");
            }
            onUpdateAlliance({ ...alliance, chat: newMessages });
            setNewMessage('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd.');
        }
    };


    if (!alliance) {
        return (
             <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3 flex items-center gap-3">
                    <span className="text-3xl">🤝</span> Stwórz Sojusz
                </h2>
                <form onSubmit={handleCreateAlliance} className="space-y-4 max-w-md mx-auto">
                     <div>
                        <label htmlFor="allianceName" className="block text-sm font-medium text-gray-300 mb-1">Nazwa Sojuszu</label>
                        <input
                            type="text"
                            id="allianceName"
                            value={allianceName}
                            onChange={(e) => setAllianceName(e.target.value)}
                            required
                            minLength={3}
                            maxLength={30}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                     <div>
                        <label htmlFor="allianceTag" className="block text-sm font-medium text-gray-300 mb-1">Tag Sojuszu (3-5 znaków)</label>
                        <input
                            type="text"
                            id="allianceTag"
                            value={allianceTag}
                            onChange={(e) => setAllianceTag(e.target.value)}
                            required
                            minLength={3}
                            maxLength={5}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full px-6 py-2 text-base font-bold text-white rounded-md shadow-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500">
                        {isLoading ? 'Tworzenie...' : 'Załóż Sojusz'}
                    </button>
                </form>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 border-b-2 border-cyan-800 pb-3">
                 <h2 className="text-2xl font-bold text-cyan-300 flex items-center gap-3">
                    <span className="text-3xl">🤝</span>
                    {alliance.name} [{alliance.tag}]
                </h2>
                <button onClick={handleLeaveAlliance} disabled={isLoading} className="mt-2 md:mt-0 px-4 py-2 bg-red-800 text-xs font-bold rounded hover:bg-red-700 disabled:bg-gray-600">
                    Opuść Sojusz
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-3">Lista Członków ({alliance.members.length})</h3>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-gray-300">
                            <thead className="text-xs uppercase bg-gray-700 bg-opacity-50 text-gray-400 sticky top-0">
                                <tr>
                                    <th className="p-3">Gracz</th>
                                    <th className="p-3 text-right">Punkty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alliance.members.sort((a,b) => b.points - a.points).map((member) => (
                                    <tr key={member.userId} className="border-b border-gray-700 hover:bg-gray-700 bg-opacity-40">
                                        <td className={`p-3 font-semibold ${member.userId === alliance.leaderId ? 'text-yellow-400' : ''}`}>
                                            {member.username} {member.userId === alliance.leaderId && '(Lider)'}
                                        </td>
                                        <td className="p-3 text-right font-mono">{formatNumber(member.points)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white mb-3">Czat Sojuszu</h3>
                     <div className="bg-gray-900 bg-opacity-70 border border-gray-700 rounded-lg p-3 h-80 flex flex-col">
                        <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                           {(alliance.chat || []).map(msg => (
                               <div key={msg.id} className="flex flex-col">
                                   <div className="flex justify-between items-baseline">
                                       <span className={`font-bold text-sm ${msg.username === alliance.members.find(m => m.userId === msg.userId)?.username ? 'text-cyan-400' : 'text-gray-400'}`}>{msg.username}</span>
                                       <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString('pl-PL')}</span>
                                   </div>
                                   <p className="text-gray-200 bg-gray-800 px-3 py-2 rounded-lg break-words">{msg.message}</p>
                               </div>
                           ))}
                           <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                             <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Napisz wiadomość..."
                                className="flex-grow bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                            />
                            <button type="submit" disabled={!newMessage.trim()} className="px-6 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                                Wyślij
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlliancePanel;
