import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiClipboardList, HiClock, HiCheckCircle, HiExclamation, HiRefresh, HiChevronRight, HiCollection, HiMap, HiInbox } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';

const AVAIL_OPTIONS = ['Available', 'Busy', 'Offline'];
const AVAIL_DOT = { Available: 'bg-green-500', Busy: 'bg-yellow-500', Offline: 'bg-slate-500' };

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);

  const [stats, setStats] = useState({
    pendingSubmitted: 0,
    assigned: 0,
    inProgress: 0,
    completedToday: 0,
    total: 0,
    collector: null,
  });
  const [avail, setAvail] = useState('Available');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collector/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setStats(d);
        if (d.collector?.availability) setAvail(d.collector.availability);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const updateAvailability = async (val) => {
    setAvail(val);
    try {
      await fetch('/api/collector/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: val }),
      });
    } catch {
      /* ignore */
    }
  };

  const statCards = [
    {
      label: 'New reports',
      value: stats.pendingSubmitted ?? 0,
      Icon: HiInbox,
      color: 'text-orange-600',
      path: '/collector/assigned',
    },
    { label: 'Assigned', value: stats.assigned, Icon: HiClipboardList, color: 'text-blue-600', path: '/collector/assigned' },
    { label: 'In Progress', value: stats.inProgress, Icon: HiClock, color: 'text-yellow-600', path: '/collector/tasks' },
    { label: 'Completed Today', value: stats.completedToday, Icon: HiCheckCircle, color: 'text-green-600', path: '/collector/completed' },
    { label: 'Total Tasks', value: stats.total, Icon: HiExclamation, color: 'text-purple-600', path: '/collector/assigned' },
  ];

  const quickActions = [
    {
      title: 'Assigned Reports',
      sub: 'Citizen submissions and tasks assigned to you',
      path: '/collector/assigned',
      Icon: HiClipboardList,
      bg: dk('from-blue-900/30 to-slate-900/40', 'from-blue-50 to-sky-50'),
      border: dk('border-blue-800/60', 'border-blue-100'),
      hover: dk('hover:border-blue-500/50', 'hover:border-blue-300 hover:shadow-blue-100'),
      iconBg: dk('bg-blue-900/50 text-blue-300', 'bg-blue-100 text-blue-600'),
    },
    {
      title: 'My Active Tasks',
      sub: 'Work in progress and updates',
      path: '/collector/tasks',
      Icon: HiCollection,
      bg: dk('from-amber-900/25 to-slate-900/40', 'from-amber-50 to-yellow-50'),
      border: dk('border-amber-800/50', 'border-amber-100'),
      hover: dk('hover:border-amber-500/50', 'hover:border-amber-300 hover:shadow-amber-100'),
      iconBg: dk('bg-amber-900/50 text-amber-300', 'bg-amber-100 text-amber-600'),
    },
    {
      title: 'Nearby Issues',
      sub: 'See reported waste around you',
      path: '/collector/nearby',
      Icon: HiMap,
      bg: dk('from-emerald-900/30 to-slate-900/40', 'from-emerald-50 to-green-50'),
      border: dk('border-emerald-800/50', 'border-emerald-100'),
      hover: dk('hover:border-emerald-500/50', 'hover:border-emerald-300 hover:shadow-emerald-100'),
      iconBg: dk('bg-emerald-900/50 text-emerald-300', 'bg-emerald-100 text-emerald-600'),
    },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 min-h-[160px] sm:min-h-[200px]">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-8">
          <div className="flex-1 min-w-0">
            <p className="text-green-100 text-sm font-medium">{greeting},</p>
            <h2 className="text-white text-2xl sm:text-3xl font-extrabold mt-0.5 leading-tight">{user.name || 'Collector'}</h2>
            <p className="text-green-100 text-sm mt-2 max-w-md leading-relaxed">
              {stats.collector
                ? `${stats.collector.area}, ${stats.collector.city} — stay on top of your assignments.`
                : 'Loading your service area…'}
              {(stats.pendingSubmitted ?? 0) > 0 && (
                <span className="block mt-2 space-y-1">
                  {stats.wasteDetails?.pendingSubmitted > 0 && (
                    <span className="block text-xs font-semibold bg-white/10 w-fit px-2 py-0.5 rounded-lg border border-white/20">
                      {stats.wasteDetails.pendingSubmitted} waste report{(stats.wasteDetails.pendingSubmitted === 1) ? '' : 's'} in queue
                    </span>
                  )}
                  {stats.scrapDetails?.pendingScrap > 0 && (
                    <span className="block text-xs font-semibold bg-white/10 w-fit px-2 py-0.5 rounded-lg border border-white/20">
                      {stats.scrapDetails.pendingScrap} scrap pickup{(stats.scrapDetails.pendingScrap === 1) ? '' : 's'} requested
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${AVAIL_DOT[avail]}`} />
              <select
                value={avail}
                onChange={(e) => updateAvailability(e.target.value)}
                className="rounded-xl border border-white/30 bg-white/15 backdrop-blur text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                {AVAIL_OPTIONS.map((o) => (
                  <option key={o} value={o} className="text-slate-900">
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={fetchStats}
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
            >
              <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh stats
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {statCards.map((card) => {
          const StatIcon = card.Icon;
          return (
          <button
            type="button"
            key={card.label}
            onClick={() => navigate(card.path)}
            className={`rounded-2xl border shadow-sm p-4 text-center hover:shadow-md transition ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}
          >
            <StatIcon className={`h-5 w-5 mx-auto mb-1 ${card.color}`} />
            <p className={`text-2xl font-extrabold ${card.color}`}>{loading ? '—' : card.value}</p>
            <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{card.label}</p>
          </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const ActionIcon = action.Icon;
          return (
          <button
            type="button"
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`group relative flex items-center gap-4 rounded-2xl border bg-gradient-to-br ${action.bg} ${action.border} p-4 sm:p-5 text-left shadow-sm hover:shadow-lg ${action.hover} transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]`}
          >
            <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${action.iconBg}`}>
              <ActionIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{action.title}</p>
              <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{action.sub}</p>
            </div>
            <HiChevronRight
              className={`h-4 w-4 shrink-0 transition-all duration-200 group-hover:text-green-500 group-hover:translate-x-0.5 ${dk('text-slate-500', 'text-slate-300')}`}
            />
          </button>
          );
        })}
      </div>

      <div className={`rounded-2xl border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <h3 className={`text-sm font-semibold mb-3 ${dk('text-slate-200', 'text-slate-800')}`}>Shortcuts</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/collector/performance')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md transition active:scale-[0.98]"
          >
            View performance
            <HiChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/collector/profile')}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              dk('border-gray-600 text-slate-200 hover:bg-white/10', 'border-slate-200 text-slate-700 hover:bg-slate-50')
            }`}
          >
            Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectorDashboard;
