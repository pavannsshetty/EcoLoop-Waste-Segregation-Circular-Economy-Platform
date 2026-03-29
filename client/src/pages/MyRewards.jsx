import { useEffect, useState } from 'react';
import { HiRefresh } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const BADGE_META = {
  'Eco Beginner':    { icon: '🌱', color: 'bg-green-50 border-green-200 text-green-700',   threshold: 50  },
  'Green Supporter': { icon: '♻️', color: 'bg-blue-50 border-blue-200 text-blue-700',      threshold: 100 },
  'Eco Warrior':     { icon: '🌿', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', threshold: 200 },
  'Green Champion':  { icon: '🏆', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', threshold: 500 },
};

const ALL_BADGES = Object.entries(BADGE_META).map(([name, meta]) => ({ name, ...meta }));

const POINT_ICONS = { 'Report Submitted': '📋', 'Report Resolved': '✅', 'Supported a Report': '👍', 'Report Verified': '🔍', default: '⭐' };

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const MyRewards = () => {
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const token    = localStorage.getItem('token');
  const [data,    setData]    = useState({ ecoPoints: 0, badges: [], history: [] });
  const [loading, setLoading] = useState(true);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rewards', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRewards(); }, []);

  const nextBadge = ALL_BADGES.find(b => data.ecoPoints < b.threshold);
  const progress  = nextBadge ? Math.min((data.ecoPoints / nextBadge.threshold) * 100, 100) : 100;
  const currentBadge = [...ALL_BADGES].reverse().find(b => data.ecoPoints >= b.threshold);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-xl font-extrabold ${dk('text-slate-200','text-slate-800')}`}>My Rewards</h1>
        <button onClick={fetchRewards} className={`transition ${dk('text-slate-400 hover:text-green-400','text-slate-400 hover:text-green-600')}`}>
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-400 p-6 sm:p-8 shadow-lg text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-sm opacity-80 font-medium">Total Eco Points</p>
              <p className="text-5xl font-extrabold mt-1">{loading ? '—' : data.ecoPoints}</p>
              {currentBadge && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xl">{currentBadge.icon}</span>
                  <span className="text-sm font-semibold opacity-90">{currentBadge.name}</span>
                </div>
              )}
            </div>
            <div className="text-6xl opacity-80">🌱</div>
          </div>
          {nextBadge && (
            <div className="relative mt-4 space-y-1">
              <div className="flex justify-between text-xs opacity-75">
                <span>Progress to {nextBadge.name}</span>
                <span>{data.ecoPoints}/{nextBadge.threshold} pts</span>
              </div>
              <div className="h-2 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className={`rounded-2xl border shadow-sm p-5 space-y-4 ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200','text-slate-800')}`}>Badges & Achievements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_BADGES.map(b => {
              const earned = data.badges.includes(b.name);
              return (
                <div key={b.name} className={`rounded-xl border p-3 text-center space-y-1.5 transition ${earned ? b.color : 'bg-slate-50 border-slate-200 opacity-40'}`}>
                  <span className="text-2xl block">{b.icon}</span>
                  <p className={`text-xs font-semibold ${earned ? '' : 'text-slate-500'}`}>{b.name}</p>
                  <p className="text-xs text-slate-400">{b.threshold} pts</p>
                  {earned && <span className="inline-block text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Earned</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-5 space-y-1 ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
          <h2 className={`text-sm font-semibold mb-3 ${dk('text-slate-200','text-slate-800')}`}>How to Earn Points</h2>
          {[
            { action: 'Submit a waste report',  pts: '+5 pts',  icon: '📋' },
            { action: 'Report gets verified',   pts: '+10 pts', icon: '🔍' },
            { action: 'Report gets resolved',   pts: '+15 pts', icon: '✅' },
            { action: 'Support another report', pts: '+2 pts',  icon: '👍' },
          ].map(({ action, pts, icon }) => (
            <div key={action} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="flex items-center gap-2 text-sm text-slate-600"><span>{icon}</span>{action}</span>
              <span className="text-sm font-bold text-green-600">{pts}</span>
            </div>
          ))}
        </div>

        <div className={`rounded-2xl border shadow-sm p-5 space-y-3 ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200','text-slate-800')}`}>Points History</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            </div>
          ) : data.history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No points earned yet. Submit your first report!</p>
          ) : (
            data.history.map(h => (
              <div key={h._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{POINT_ICONS[h.reason] || POINT_ICONS.default}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{h.reason}</p>
                    <p className="text-xs text-slate-400">{timeAgo(h.createdAt)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600">+{h.points} pts</span>
              </div>
            ))
          )}
        </div>

    </div>
  );
};

export default MyRewards;
