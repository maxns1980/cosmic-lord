

import React, { useState, useEffect } from 'react';
import { MerchantState, Resources } from '../types';

interface MerchantPanelProps {
    merchantState: MerchantState;
    resources: Resources;
    credits: number;
    maxResources: Resources;
    onTrade: (resource: keyof Resources, amount: number, tradeType: 'buy' | 'sell') => void;
}

const formatNumber = (num: number) => Math.floor(num).toLocaleString('pl-PL');

const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const TradeRow: React.FC<{
    resKey: keyof Resources,
    icon: string,
    rates: { buy: number; sell: number },
    onTrade: MerchantPanelProps['onTrade'],
    currentAmount: number,
    currentCredits: number,
    maxAmount: number,
}> = ({ resKey, icon, rates, onTrade, currentAmount, currentCredits, maxAmount }) => {
    const [buyAmount, setBuyAmount] = useState('');
    const [sellAmount, setSellAmount] = useState('');

    const buyCost = Math.floor(parseInt(buyAmount, 10) * rates.buy) || 0;
    const sellGain = Math.floor(parseInt(sellAmount, 10) * rates.sell) || 0;

    const canBuy = parseInt(buyAmount, 10) > 0 && currentCredits >= buyCost && currentAmount + parseInt(buyAmount, 10) <= maxAmount;
    const canSell = parseInt(sellAmount, 10) > 0 && currentAmount >= parseInt(sellAmount, 10);
    
    const handleBuy = () => {
        onTrade(resKey, parseInt(buyAmount, 10), 'buy');
        setBuyAmount('');
    }
    
    const handleSell = () => {
        onTrade(resKey, parseInt(sellAmount, 10), 'sell');
        setSellAmount('');
    }
    
    return (
        <tr className="border-b border-gray-700 bg-gray-900 bg-opacity-40 hover:bg-opacity-60">
            <td className="p-4 font-semibold text-lg">{icon} {resKey.charAt(0).toUpperCase() + resKey.slice(1)}</td>
            <td className="p-4 text-center">{formatNumber(currentAmount)} / {formatNumber(maxAmount)}</td>
            <td className="p-4">
                <div className="flex items-center space-x-2">
                    <input type="number" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} min="0" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1" placeholder="Ilość"/>
                    <button onClick={handleBuy} disabled={!canBuy} className="px-4 py-1 bg-green-600 rounded text-white font-bold disabled:bg-gray-600 disabled:cursor-not-allowed whitespace-nowrap">
                        Kup ({formatNumber(buyCost)}$)
                    </button>
                </div>
            </td>
            <td className="p-4">
                <div className="flex items-center space-x-2">
                    <input type="number" value={sellAmount} onChange={e => setSellAmount(e.target.value)} min="0" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1" placeholder="Ilość"/>
                    <button onClick={handleSell} disabled={!canSell} className="px-4 py-1 bg-red-600 rounded text-white font-bold disabled:bg-gray-600 disabled:cursor-not-allowed whitespace-nowrap">
                        Sprzedaj ({formatNumber(sellGain)}$)
                    </button>
                </div>
            </td>
        </tr>
    );
};


export const MerchantPanel: React.FC<MerchantPanelProps> = ({ merchantState, resources, credits, maxResources, onTrade }) => {
    const [timeLeft, setTimeLeft] = useState(merchantState.departureTime - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = merchantState.departureTime - Date.now();
            if (remaining <= 0) {
                clearInterval(timer);
            }
            setTimeLeft(remaining);
        }, 1000);
        return () => clearInterval(timer);
    }, [merchantState.departureTime]);

    return (
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 border-b-2 border-cyan-800 pb-3">
                <h2 className="text-2xl font-bold text-cyan-300">Wędrowny Kupiec</h2>
                <div className="text-center md:text-right mt-2 md:mt-0">
                    <p className="text-gray-400">Kupiec odleci za:</p>
                    <p className="text-xl font-bold font-mono text-yellow-400">{formatTime(timeLeft / 1000)}</p>
                </div>
            </div>
            
            <p className="mb-6 text-gray-300">Witaj, podróżniku! Mam najlepsze towary w tym sektorze. Rzuć okiem, a na pewno znajdziesz coś dla siebie. Pamiętaj, czas to pieniądz... a ja nie mam go za wiele.</p>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="text-xs uppercase bg-gray-700 bg-opacity-50 text-gray-400">
                        <tr>
                            <th className="p-4">Surowiec</th>
                            <th className="p-4 text-center">Posiadane / Magazyn</th>
                            <th className="p-4">Kup</th>
                            <th className="p-4">Sprzedaj</th>
                        </tr>
                    </thead>
                    <tbody>
                        <TradeRow 
                            resKey="metal" 
                            icon="🔩" 
                            rates={merchantState.rates.metal}
                            onTrade={onTrade}
                            currentAmount={resources.metal}
                            currentCredits={credits}
                            maxAmount={maxResources.metal}
                        />
                         <TradeRow 
                            resKey="crystal" 
                            icon="💎" 
                            rates={merchantState.rates.crystal}
                            onTrade={onTrade}
                            currentAmount={resources.crystal}
                            currentCredits={credits}
                            maxAmount={maxResources.crystal}
                        />
                         <TradeRow 
                            resKey="deuterium" 
                            icon="💧" 
                            rates={merchantState.rates.deuterium}
                            onTrade={onTrade}
                            currentAmount={resources.deuterium}
                            currentCredits={credits}
                            maxAmount={maxResources.deuterium}
                        />
                    </tbody>
                </table>
            </div>

        </div>
    );
};