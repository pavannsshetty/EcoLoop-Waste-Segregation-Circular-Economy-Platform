import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { apiUrl } from '../../shared/utils/api';
import { HiTrendingUp, HiBadgeCheck, HiStar, HiUsers } from 'react-icons/hi';

const Leaderboard = () => {
    const { dark } = useTheme();
    const [champions, setChampions] = useState([]);
    const [loading, setLoading] = useState(true);
    const dk = (d, l) => (dark ? d : l);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(apiUrl('/api/green-champion/leaderboard'), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) setChampions(data);
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-xl font-extrabold ${dk('text-slate-100', 'text-slate-900')}`}>Champion Rankings</h1>
                    <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Rewarding our top community leaders for their impact.</p>
                </div>
                <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${dk('bg-white/5 border-gray-800 text-slate-400', 'bg-white border-slate-200 text-slate-600 shadow-sm')}`}>
                    <HiUsers className="h-5 w-5 text-indigo-500" />
                    <span className="text-sm font-bold">Community Leaderboard</span>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center"><div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                     {/* Top 3 Spotlight */}
                     {champions.slice(0, 3).map((champion, idx) => (
                        <div key={champion._id} className={`p-6 rounded-lg border relative transition hover:scale-105 duration-300 ${
                            idx === 0 ? 'bg-gradient-to-br from-yellow-400/10 to-amber-600/10 border-yellow-500/20' : 
                            idx === 1 ? 'bg-gradient-to-br from-slate-400/10 to-slate-600/10 border-slate-500/20' : 
                            'bg-gradient-to-br from-orange-400/10 to-orange-600/10 border-orange-500/20'
                        }`}>
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                                    idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-500'
                                }`}>
                                    {idx + 1}
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-center space-y-3 pt-2">
                                <div className="h-20 w-20 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-md">
                                    <img src={champion.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${champion.name}`} alt={champion.name} className="h-full w-full object-cover" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${dk('text-slate-100', 'text-slate-900')}`}>{champion.name}</h3>
                                    <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{champion.village}</p>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                                    <HiStar className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm font-extrabold text-green-500">{champion.ecoPoints} pts</span>
                                </div>
                            </div>
                        </div>
                     ))}
                </div>
            )}

            <div className={`rounded-lg border overflow-hidden ${dk('bg-white/5 border-gray-800', 'bg-white border-slate-100 shadow-sm')}`}>
                <div className={`p-4 border-b ${dk('border-gray-800 bg-black/20', 'border-slate-50 bg-slate-50/50')}`}>
                    <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <div className="col-span-1">Rank</div>
                        <div className="col-span-6">Champion</div>
                        <div className="col-span-3">Village</div>
                        <div className="col-span-2 text-right">Points</div>
                    </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-gray-800">
                    {champions.map((c, idx) => (
                        <div key={c._id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                            <div className={`col-span-1 text-sm font-bold ${idx < 3 ? 'text-green-500' : 'text-slate-500'}`}>#{idx + 1}</div>
                            <div className="col-span-6 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                    <img src={c.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`} alt={c.name} className="h-full w-full object-cover" />
                                </div>
                                <span className={`text-sm font-bold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{c.name}</span>
                                {idx < 5 && <HiBadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
                            </div>
                            <div className={`col-span-3 text-xs ${dk('text-slate-400', 'text-slate-600')}`}>{c.village}</div>
                            <div className="col-span-2 text-right">
                                <span className="text-sm font-extrabold text-green-500">{c.ecoPoints}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
