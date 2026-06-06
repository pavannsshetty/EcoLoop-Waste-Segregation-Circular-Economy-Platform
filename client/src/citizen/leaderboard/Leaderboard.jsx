import { useEffect, useState } from 'react';
import { HiStar, HiSparkles, HiAcademicCap as HiCrown } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { MdEmojiEvents, MdRecycling, MdEmojiNature, MdLocationOn } from 'react-icons/md';
import { FaMedal, FaTrophy } from 'react-icons/fa';
import { useTheme } from '../../shared/context/ThemeContext';
import socket from '../../socket';

const BADGE_META = {
  'Green Champion':  { Icon: MdEmojiEvents,  color: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse' },
  'Eco Warrior':     { Icon: HiSparkles,     color: 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' },
  'Green Supporter': { Icon: MdRecycling,    color: 'bg-blue-500/20 text-blue-500 border border-blue-500/30' },
  'Eco Beginner':    { Icon: MdEmojiNature,  color: 'bg-green-500/20 text-green-500 border border-green-500/30' },
};

const BadgePill = ({ badge }) => {
  if (!badge) return null;
  const meta = BADGE_META[badge] || { Icon: HiStar, color: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.color}`}>
      <meta.Icon className="h-3.5 w-3.5 shrink-0" /> {badge}
    </span>
  );
};

const LeaderboardSkeleton = ({ dark }) => {
  const dk = (d, l) => dark ? d : l;
  return (
    <div className="space-y-6">
      {/* Spotlight Cards Skeleton */}
      <div className="flex flex-col gap-4 max-w-3xl mx-auto pt-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`w-full rounded-xl border p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse ${dk('bg-white/5 border-gray-800','bg-white border-slate-200')}`}>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="h-10 w-10 rounded-lg bg-slate-300 dark:bg-slate-750 shrink-0" />
              <div className="h-12 w-12 rounded-full bg-slate-300 dark:bg-slate-750 shrink-0" />
              <div className="space-y-2 flex-1 sm:flex-initial">
                <div className="h-3.5 w-28 bg-slate-300 dark:bg-slate-750 rounded" />
                <div className="h-2.5 w-16 bg-slate-300 dark:bg-slate-750 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-6 justify-between sm:justify-end w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-gray-800">
              <div className="h-6 w-16 bg-slate-300 dark:bg-slate-750 rounded" />
              <div className="h-6 w-16 bg-slate-300 dark:bg-slate-750 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Table Skeleton */}
      <div className={`rounded-xl border p-4 space-y-3 animate-pulse ${dk('bg-white/5 border-gray-800','bg-white border-slate-200')}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex justify-between items-center h-10">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-4 w-4 bg-slate-300 dark:bg-slate-750 rounded" />
              <div className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-750" />
              <div className="h-4 w-32 bg-slate-300 dark:bg-slate-750 rounded" />
            </div>
            <div className="h-4 w-12 bg-slate-300 dark:bg-slate-750 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

const Leaderboard = () => {
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const token = localStorage.getItem('token');
  const [data, setData] = useState({ leaderboard: [], me: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('overall');

  const fetchData = async (f = filter) => {
    setLoading(true);
    setError(null);
    try {
      const paramFilter = 'points';
      const period = f === 'monthly' ? 'monthly' : 'all-time';
      const res = await fetch(`${API}/api/leaderboard?filter=${paramFilter}&period=${period}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      } else {
        throw new Error('Failed to fetch leaderboard.');
      }
    } catch (err) {
      console.error('Fetch Leaderboard Error:', err);
      setError('Failed to load leaderboard. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Secure, scalable real-time update sync
    socket.on('leaderboard_updated', () => {
      fetchData();
    });

    return () => {
      socket.off('leaderboard_updated');
    };
  }, [filter]);

  const top3 = data.leaderboard.slice(0, 3);
  const rest = data.leaderboard.slice(3);

  // Layout order for Spotlight: natural 1st, 2nd, 3rd


  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 max-w-7xl mx-auto min-h-screen">
      {/* Header section with live indicator */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-100','text-slate-800')}`}>
              Community Leaderboard
            </h1>
          </div>
          <p className={`text-xs sm:text-sm font-medium mt-0.5 ${dk('text-slate-400','text-slate-500')}`}>
            Real-time rankings across all villages under Kundapura Taluk
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className={`flex items-center gap-1 rounded-xl border p-1 w-full max-w-sm transition-colors duration-200 ${dk('bg-white/5 border-gray-800','bg-white border-slate-200 shadow-sm')}`}>
          {[['overall', 'Overall'], ['monthly', 'This Month']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`flex-1 text-center py-2 min-h-[44px] rounded-lg text-xs font-extrabold transition duration-200 ${
                filter === val
                  ? 'bg-green-600 text-white shadow-md'
                  : dk('text-slate-400 hover:text-slate-200','text-slate-500 hover:text-slate-700')
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Personal Rank Ribbon */}
      {data.me && !loading && !error && (
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 rounded-2xl p-5 text-white shadow-lg border border-green-500/20 group hover:shadow-xl transition-all duration-300">
          <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/5 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white font-extrabold text-base border border-white/30 shadow-inner">
                {(data.me.name || 'C')[0].toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-green-200">Your Current Rank</span>
                <p className="font-extrabold text-base sm:text-lg">{data.me.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-green-100">
                  <span className="flex items-center gap-0.5">📍 {data.me.village || 'Global'}</span>
                  <span>•</span>
                  <span>{data.me.reportsCount || 0} reports submitted</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-6 text-center bg-white/10 rounded-xl px-3 sm:px-6 py-2.5 border border-white/10 backdrop-blur-sm w-full md:w-auto justify-around">
              <div>
                <p className="text-xl sm:text-2xl font-extrabold">#{data.me.rank}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-200">Rank</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-xl sm:text-2xl font-extrabold">{data.me.ecoPoints || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-200">Points</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
                  {data.me.level}
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-200 mt-1">Level</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <LeaderboardSkeleton dark={dark} />}

      {/* Error State */}
      {error && !loading && (
        <div className={`rounded-xl border p-6 text-center space-y-4 max-w-md mx-auto ${dk('bg-red-950/20 border-red-900 text-red-400', 'bg-red-50 border-red-200 text-red-700')}`}>
          <p className="text-sm font-semibold">{error}</p>
          <button
            onClick={() => fetchData()}
            className="rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 transition"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* Empty State */}
      {data.leaderboard.length === 0 && !loading && !error && (
        <div className={`rounded-2xl border p-12 text-center max-w-lg mx-auto space-y-3 ${dk('bg-white/5 border-gray-800 text-slate-400','bg-white border-slate-200 text-slate-500 shadow-sm')}`}>
          <FaTrophy className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto animate-bounce" />
          <h3 className={`text-base font-bold ${dk('text-slate-200','text-slate-800')}`}>The Leaderboard is Empty!</h3>
          <p className="text-xs leading-relaxed max-w-xs mx-auto">
            No citizens have earned Eco Points yet. Be the first to submit a waste report and take the leading rank!
          </p>
        </div>
      )}

      {/* Leaderboard content */}
      {!loading && !error && data.leaderboard.length > 0 && (
        <div className="space-y-8 sm:space-y-12">
          {/* Spotlight Podium (Top 3) */}
          <div className="flex flex-col gap-4 max-w-3xl mx-auto pt-4">
            {top3.map((u) => {
              const actualRank = u.rank;
              const isFirst = actualRank === 1;
              const isSecond = actualRank === 2;

              // Rank-specific styles
              const cardStyles = isFirst
                ? dk('bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20 border-l-yellow-500 shadow-[0_2px_15px_rgba(234,179,8,0.06)]',
                     'bg-gradient-to-r from-yellow-50 to-white border-yellow-200 border-l-yellow-500 shadow-[0_2px_15px_rgba(234,179,8,0.06)]')
                : isSecond
                  ? dk('bg-gradient-to-r from-slate-500/10 via-slate-500/5 to-transparent border-slate-500/20 border-l-slate-400 shadow-[0_2px_12px_rgba(148,163,184,0.04)]',
                       'bg-gradient-to-r from-slate-50 to-white border-slate-200 border-l-slate-400 shadow-[0_2px_12px_rgba(148,163,184,0.04)]')
                  : dk('bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20 border-l-orange-500 shadow-[0_2px_12px_rgba(249,115,22,0.04)]',
                       'bg-gradient-to-r from-orange-50/50 to-white border-orange-200 border-l-orange-500 shadow-[0_2px_12px_rgba(249,115,22,0.04)]');

              const avatarRing = isFirst
                ? 'ring-yellow-400/50 shadow-yellow-500/20'
                : isSecond
                  ? 'ring-slate-300/50 shadow-slate-400/25'
                  : 'ring-orange-400/50 shadow-orange-500/25';

              return (
                <div
                  key={u._id}
                  className={`w-full rounded-xl border-y border-r border-l-4 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-all duration-300 hover:scale-[1.01] ${cardStyles}`}
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Rank Badge / Icon */}
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${
                      isFirst ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' :
                      isSecond ? 'bg-slate-500/20 text-slate-500 border-slate-500/30' :
                      'bg-orange-500/20 text-orange-600 border-orange-500/30'
                    }`}>
                      {isFirst ? (
                        <HiCrown className="text-xl text-yellow-500 animate-bounce" />
                      ) : (
                        <span className="text-sm font-black">{actualRank}</span>
                      )}
                    </div>

                    {/* Profile Initial */}
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-extrabold text-base shadow-md ring-2 ${avatarRing} shrink-0 ${
                      isFirst ? 'bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400' :
                      isSecond ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                      'bg-gradient-to-br from-orange-400 to-amber-500'
                    }`}>
                      {(u.name || 'C')[0].toUpperCase()}
                    </div>

                    {/* Name & Village */}
                    <div className="flex flex-col min-w-0">
                      <p className={`text-sm sm:text-base font-bold truncate ${dk('text-slate-100','text-slate-800')}`}>{u.name}</p>
                      <p className={`text-xs font-semibold flex items-center gap-0.5 mt-0.5 ${dk('text-slate-400','text-slate-500')}`}>
                        <MdLocationOn className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {u.village || 'Global'}
                      </p>
                    </div>
                  </div>

                  {/* Right side stats and badges */}
                  <div className="flex items-center gap-3 sm:gap-6 justify-between sm:justify-end w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-gray-800">
                    <div className="flex items-center gap-6">
                      <div className="text-center sm:text-right">
                        <p className={`text-base font-black ${isFirst ? 'text-yellow-500' : 'text-green-500'}`}>{u.ecoPoints || 0}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${dk('text-slate-500','text-slate-400')}`}>Points</p>
                      </div>
                      <div className="h-6 w-px bg-slate-200 dark:bg-gray-800" />
                      <div className="text-center sm:text-right">
                        <p className={`text-base font-bold ${dk('text-slate-300','text-slate-700')}`}>{u.reportsCount || 0}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${dk('text-slate-500','text-slate-400')}`}>Reports</p>
                      </div>
                    </div>

                    {u.topBadge && (
                      <div className="shrink-0">
                        <BadgePill badge={u.topBadge} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leaderboard Table (Ranks 4+) */}
          {rest.length > 0 && (
            <div className="space-y-3">
              <h3 className={`text-sm font-extrabold uppercase tracking-widest ${dk('text-slate-400','text-slate-500')}`}>
                Runner-up Standings
              </h3>
              <div className={`rounded-2xl border overflow-hidden shadow-sm transition-colors duration-200 ${dk('bg-white/5 border-gray-800','bg-white border-slate-200')}`}>
                
                {/* Scrollable Container for Large Datasets */}
                <div className="max-h-[500px] overflow-y-auto scrollbar-thin dark:scrollbar-thumb-gray-800 scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {/* Table Headers */}
                  <div className={`hidden sm:grid grid-cols-12 gap-2 px-6 py-3 border-b text-[10px] font-bold uppercase tracking-widest sticky top-0 z-10 ${
                    dk('bg-[#0f172a] border-gray-800 text-slate-500','bg-slate-50 border-slate-200 text-slate-500')
                  }`}>
                    <span className="col-span-1">Rank</span>
                    <span className="col-span-4">Citizen & Village</span>
                    <span className="col-span-2 text-right">Points</span>
                    <span className="col-span-2 text-right">Reports</span>
                    <span className="col-span-3 text-right">Badge</span>
                  </div>

                  {/* Ranks list */}
                  <div className="divide-y divide-slate-100 dark:divide-gray-800">
                    {rest.map((u) => (
                      <div
                        key={u._id}
                        className={`flex sm:grid sm:grid-cols-12 items-center gap-2 sm:gap-2 px-4 sm:px-6 py-3.5 transition duration-150 hover:bg-slate-50/50 dark:hover:bg-white/2 ${
                          dk('border-gray-800','border-slate-100')
                        }`}
                      >
                        <span className={`col-span-1 text-sm font-black w-8 shrink-0 ${dk('text-slate-500','text-slate-400')}`}>
                          #{u.rank}
                        </span>
                        <div className="col-span-4 flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-sm font-extrabold shrink-0 shadow-inner">
                            {(u.name || 'C')[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-sm font-bold truncate ${dk('text-slate-200','text-slate-800')}`}>
                              {u.name}
                            </span>
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${dk('text-slate-400','text-slate-500')} mt-0.5 truncate`}>
                              <MdLocationOn className="h-3 w-3 text-green-500 shrink-0" />
                              {u.village || 'Global'}
                            </span>
                          </div>
                        </div>
                        <span className="col-span-2 text-sm font-black text-green-600 text-right">
                          {u.ecoPoints || 0} <span className="text-[10px] font-normal text-slate-400 sm:hidden">pts</span>
                        </span>
                        <span className="col-span-2 text-sm font-semibold text-slate-500 text-right hidden sm:block">
                          {u.reportsCount || 0}
                        </span>
                        <div className="col-span-3 flex justify-end">
                          <BadgePill badge={u.topBadge} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
