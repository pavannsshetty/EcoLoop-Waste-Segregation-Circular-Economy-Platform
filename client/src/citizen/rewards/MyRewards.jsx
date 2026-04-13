import { useState, useEffect } from 'react';
import { HiRefresh, HiStar, HiCheckCircle, HiClipboardList, HiThumbUp, HiSearch, HiSparkles, HiTrendingUp } from 'react-icons/hi';
import { MdRecycling, MdEmojiNature, MdEmojiEvents, MdLeaderboard } from 'react-icons/md';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';

const BADGE_META = {
  'Eco Beginner':    { Icon: MdEmojiNature,  color: 'bg-green-50 border-green-200 text-green-700',     threshold: 50  },
  'Green Supporter': { Icon: MdRecycling,    color: 'bg-blue-50 border-blue-200 text-blue-700',        threshold: 100 },
  'Eco Warrior':     { Icon: HiSparkles,     color: 'bg-emerald-50 border-emerald-200 text-emerald-700', threshold: 200 },
  'Green Champion':  { Icon: MdEmojiEvents,  color: 'bg-yellow-50 border-yellow-200 text-yellow-700',  threshold: 500 },
};

const ALL_BADGES = Object.entries(BADGE_META).map(([name, meta]) => ({ name, ...meta }));

const POINT_ICONS = {
  'Report Submitted':  HiClipboardList,
  'Report Resolved':   HiCheckCircle,
  'Supported a Report': HiThumbUp,
  'Report Verified':   HiSearch,
  default:             HiStar,
};

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const HOW_TO_EARN = [
  { action: 'Submit a waste report',  pts: '+5 pts',  Icon: HiClipboardList },
  { action: 'Report gets verified',   pts: '+10 pts', Icon: HiSearch        },
  { action: 'Report gets resolved',   pts: '+15 pts', Icon: HiCheckCircle   },
  { action: 'Support another report', pts: '+2 pts',  Icon: HiThumbUp       },
];

const MyRewards = () => {
  const { dark } = useTheme();
  const { user: ctxUser } = useUser();
  const dk = (d, l) => dark ? d : l;
  const token = localStorage.getItem('token');
  const [data,    setData]    = useState({ ecoPoints: 0, badges: [], history: [], streakCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/citizen/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setData({ ecoPoints: d.ecoPoints || 0, badges: d.badges || [], history: d.pointsHistory || [], streakCount: d.streakCount || 0 });
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRewards(); }, []);

  const ecoPoints    = ctxUser?.ecoPoints ?? data.ecoPoints;
  const badges       = ctxUser?.badges    ?? data.badges;
  const nextBadge    = ALL_BADGES.find(b => ecoPoints < b.threshold);
  const progress     = nextBadge ? Math.min((ecoPoints / nextBadge.threshold) * 100, 100) : 100;
  const currentBadge = [...ALL_BADGES].reverse().find(b => ecoPoints >= b.threshold);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-base font-semibold ${dk('text-slate-200','text-slate-800')}`}>My Rewards</h1>
        <button onClick={fetchRewards} className={`transition ${dk('text-slate-400 hover:text-green-400','text-slate-400 hover:text-green-600')}`}>
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative rounded-sm overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-400 p-6 sm:p-8 shadow-sm text-white border border-yellow-300/40">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-sm opacity-80 font-medium">Total Eco Points</p>
            <p className="text-5xl font-extrabold mt-1">{loading ? '—' : ecoPoints}</p>
            {currentBadge && (
              <div className="flex items-center gap-2 mt-2">
                <currentBadge.Icon className="h-5 w-5 opacity-90" />
                <span className="text-sm font-semibold opacity-90">{currentBadge.name}</span>
              </div>
            )}
          </div>
          <MdLeaderboard className="h-14 w-14 opacity-70" />
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg text-xs font-bold">
              <HiTrendingUp className="h-3.5 w-3.5" />
              {ctxUser?.streakCount ?? data.streakCount} day streak
            </div>
          </div>
        </div>
        {nextBadge && (
          <div className="relative mt-4 space-y-1">
            <div className="flex justify-between text-xs opacity-75">
              <span>Progress to {nextBadge.name}</span>
              <span>{ecoPoints}/{nextBadge.threshold} pts</span>
            </div>
            <div className="h-2 rounded-full bg-white/30 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className={`rounded-sm border p-5 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-medium ${dk('text-slate-200','text-slate-700')}`}>Badges & Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_BADGES.map(b => {
            const earned = badges.includes(b.name);
            return (
              <div key={b.name} className={`rounded-sm border p-3 text-center space-y-1.5 transition-colors duration-200 ${earned ? b.color : dk('bg-white/5 border-gray-700 opacity-50','bg-slate-50 border-slate-200 opacity-50')}`}>
                <b.Icon className={`h-7 w-7 mx-auto ${earned ? '' : 'text-slate-400'}`} />
                <p className={`text-xs font-semibold ${earned ? '' : 'text-slate-500'}`}>{b.name}</p>
                <p className="text-xs text-slate-400">{b.threshold} pts</p>
                {earned && <span className="inline-block text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Earned</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`rounded-sm border p-5 space-y-1 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-medium mb-3 ${dk('text-slate-200','text-slate-700')}`}>How to Earn Points</h2>
        {HOW_TO_EARN.map(({ action, pts, Icon }) => (
          <div key={action} className={`flex items-center justify-between py-2 border-b last:border-0 ${dk('border-slate-700','border-slate-100')}`}>
            <span className={`flex items-center gap-2 text-sm ${dk('text-slate-300','text-slate-600')}`}>
              <Icon className="h-4 w-4 text-green-500 shrink-0" />
              {action}
            </span>
            <span className="text-sm font-bold text-green-600">{pts}</span>
          </div>
        ))}
      </div>

      <div className={`rounded-sm border p-5 space-y-3 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-medium ${dk('text-slate-200','text-slate-700')}`}>Points History</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : data.history.length === 0 ? (
          <p className={`text-sm text-center py-6 ${dk('text-slate-500','text-slate-400')}`}>No points earned yet. Submit your first report!</p>
        ) : (
          data.history.map(h => {
            const PointIcon = POINT_ICONS[h.reason] || POINT_ICONS.default;
            return (
              <div key={h._id} className={`flex items-center justify-between py-2 border-b last:border-0 ${dk('border-slate-700','border-slate-100')}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-sm flex items-center justify-center ${dk('bg-green-900/30','bg-green-50')}`}>
                    <PointIcon className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${dk('text-slate-200','text-slate-700')}`}>{h.reason}</p>
                    <p className={`text-xs ${dk('text-slate-500','text-slate-400')}`}>{timeAgo(h.createdAt)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600">+{h.points} pts</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyRewards;
