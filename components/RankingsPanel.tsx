
import React, { useState, useEffect } from 'react';
import { PlayerRank, Alliance } from '../types';

interface RankingsPanelProps {
    currentPlayerUsername: string;
    playerAlliance: Alliance | undefined;
}

const formatNumber = (num: number) => Math.floor(num).toLocaleString('pl-PL');

const RankingsPanel: React.FC<RankingsPanelProps> = ({ currentPlayerUsername, playerAlliance }) => {
    const [rankings, setRankings] = useState<PlayerRank[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRankings = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError("Brak autoryzacji. Zaloguj się ponownie.");
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const response = await fetch('http://localhost:5000/api/rankings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Nie udało się załadować rankingu.');
                }
                const data: PlayerRank[] = await response.json();
                setRankings(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRankings();
    }, []);
    
    const getPlayerRowClass = (player: PlayerRank) => {
        if (player.username === currentPlayerUsername) {
            return 'bg-cyan-900 bg-opacity-50 font-bold text-white';
        }
        if (playerAlliance && player.allianceTag === playerAlliance.tag) {
            return 'bg-green-900 bg-opacity-40 text-green-300';
        }
        // Future: Add logic for allied/enemy alliances
        return '';
    };

    return (
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6">
            <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-800 pb-3 flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                Globalny Ranking Graczy
            </h2>

            {isLoading && <div className="text-center text-gray-400 p-8">Ładowanie rankingu...</div>}
            {error && <div className="text-center text-red-400 p-8">{error}</div>}

            {!isLoading && !error && (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-300">
                        <thead className="text-xs uppercase bg-gray-700 bg-opacity-50 text-gray-400">
                            <tr>
                                <th className="p-3 text-center">Pozycja</th>
                                <th className="p-3">Gracz</th>
                                <th className="p-3">Sojusz</th>
                                <th className="p-3 text-right">Punkty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map((player) => (
                                <tr 
                                    key={player.rank} 
                                    className={`border-b border-gray-700 hover:bg-gray-700 bg-opacity-40 transition-colors duration-200 ${getPlayerRowClass(player)}`}
                                >
                                    <td className="p-3 text-center font-bold text-lg">{player.rank}</td>
                                    <td className="p-3">{player.username}</td>
                                    <td className="p-3 font-semibold">{player.allianceTag ? `[${player.allianceTag}]` : '-'}</td>
                                    <td className="p-3 text-right font-mono">{formatNumber(player.points)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RankingsPanel;
