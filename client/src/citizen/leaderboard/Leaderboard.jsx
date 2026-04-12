import { useEffect, useState } from 'react';
import { HiRefresh } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';

const BADGE_META = {
  'Green Champion':  { icon: '🏆', color: 'bg-yellow-100 text-yellow-700' },
  'Eco Warrior':     { icon: '🌿', color: 'bg-emerald-100 text-emerald-700' },
  'Green Supporter': { icon: '♻️', color: 'bg-blue-100 text-blue-700' },
  'Eco Beginner':    { icon: '🌱', color: 'bg-green-100 text-green-700' },
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const BadgePill = ({ badge }) => {
  if (!badge) return null;
  const meta = BADGE_META[badge] || { icon: '⭐', color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
      {meta.icon} {badge}
    </span>
  );
};

const Leaderboard = () => {
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const token    = localStorage.getItem('token');
  const [data,    setData]    = useState({ leaderboard: [], me: null });
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('overall');

  const fetchData = async (f = filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?filter=${f}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const top3 = data.leaderboard.slice(0, 3);
  const rest  = data.leaderboard.slice(3);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-extrabold ${dk('text-slate-200','text-slate-800')}`}>🏅 Community Leaderboard</h1>
          <p className={`text-sm mt-0.5 ${dk('text-slate-400','text-slate-500')}`}>Top citizens making a difference</p>
        </div>
        <button onClick={() => fetchData()} className={`transition ${dk('text-slate-400 hover:text-green-400','text-slate-400 hover:text-green-600')}`}>
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

        <div className={`flex items-center gap-1 rounded-xl border shadow-sm p-1 w-fit mx-auto ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
          {[['overall', 'Overall'], ['monthly', 'This Month']].map(([val, label]) => (
            <button key={val} onClick={() => { setFilter(val); fetchData(val); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${filter === val ? 'bg-green-600 text-white' : dk('text-slate-400 hover:text-slate-200','text-slate-500 hover:text-slate-700')}`}>
              {label}
            </button>
          ))}
        </div>

        {data.me && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-4 sm:p-5 text-white shadow-md">
            <p className="text-xs opacity-75 font-medium mb-1">Your Ranking</p>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {(data.me.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{data.me.name}</p>
                  <p className="text-xs opacity-75">{data.me.reportsCount} reports submitted</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-center">
                <div>
                  <p className="text-2xl font-extrabold">#{data.me.rank}</p>
                  <p className="text-xs opacity-75">Rank</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold">{data.me.ecoPoints}</p>
                  <p className="text-xs opacity-75">Points</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : data.leaderboard.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No data yet. Be the first to earn Eco Points!</div>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((u, displayIdx) => {
                  const actualRank = u.rank;
                  const isFirst    = actualRank === 1;
                  return (
                    <div key={u._id} className={`relative flex flex-col items-center rounded-2xl border p-5 text-center shadow-sm transition hover:shadow-md ${
                      isFirst ? 'bg-gradient-to-b from-yellow-50 to-amber-50 border-yellow-200 order-first sm:order-none' : 'bg-white border-slate-100'
                    }`}>
                      {isFirst && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>}
                      <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md mb-3 mt-2 ${
                        actualRank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-400' :
                        actualRank === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                        'bg-gradient-to-br from-orange-400 to-amber-500'
                      }`}>
                        {(u.name || 'C')[0].toUpperCase()}
                      </div>
                      <span className="text-xl mb-1">{RANK_MEDALS[actualRank - 1]}</span>
                      <p className="text-sm font-bold text-slate-800 truncate w-full">{u.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.reportsCount} reports</p>
                      <p className={`text-lg font-extrabold mt-1 ${actualRank === 1 ? 'text-yellow-600' : 'text-green-600'}`}>{u.ecoPoints} pts</p>
                      {u.topBadge && <div className="mt-2"><BadgePill badge={u.topBadge} /></div>}
                    </div>
                  );
                })}
              </div>
            )}

            {rest.length > 0 && (
              <div className={`rounded-2xl border overflow-hidden ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
                <div className={`hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 border-b text-xs font-semibold uppercase tracking-wide ${dk('bg-white/5 border-gray-700 text-slate-500','bg-slate-50 border-slate-100 text-slate-500')}`}>
                  <span className="col-span-1">Rank</span>
                  <span className="col-span-4">Citizen</span>
                  <span className="col-span-2 text-right">Points</span>
                  <span className="col-span-2 text-right">Reports</span>
                  <span className="col-span-3 text-right">Badge</span>
                </div>
                {rest.map((u) => (
                  <div key={u._id} className={`flex sm:grid sm:grid-cols-12 items-center gap-3 sm:gap-2 px-4 py-3 border-b last:border-0 transition ${dk('border-gray-700 hover:bg-white/5','border-slate-50 hover:bg-slate-50')}`}>
                    <span className={`col-span-1 text-sm font-bold w-6 shrink-0 ${dk('text-slate-500','text-slate-400')}`}>#{u.rank}</span>
                    <div className="col-span-4 flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(u.name || 'C')[0].toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium truncate ${dk('text-slate-200','text-slate-800')}`}>{u.name}</span>
                    </div>
                    <span className="col-span-2 text-sm font-bold text-green-600 text-right">{u.ecoPoints}</span>
                    <span className="col-span-2 text-sm text-slate-500 text-right hidden sm:block">{u.reportsCount}</span>
                    <div className="col-span-3 flex justify-end">
                      <BadgePill badge={u.topBadge} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default Leaderboard;
