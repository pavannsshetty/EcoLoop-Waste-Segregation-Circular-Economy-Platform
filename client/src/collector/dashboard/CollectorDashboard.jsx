import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiClipboardList, HiClock, HiCheckCircle, HiExclamation, HiRefresh, HiChevronRight, HiCollection, HiMap, HiInbox, HiLocationMarker } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';

const AVAIL_OPTIONS = ['Available', 'Busy', 'Offline'];
const AVAIL_DOT = { Available: 'bg-green-500', Busy: 'bg-yellow-500', Offline: 'bg-slate-500' };

const SEV_COLOR = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-green-100 text-green-700 border-green-200',
};

const VillageTaskCard = ({ report, dk, onNavigate, nearby = false }) => (
  <button type="button" onClick={onNavigate}
    className={`w-full text-left rounded-sm border p-3 transition hover:shadow-md active:scale-[0.99] ${dk('bg-white/5 border-gray-700 hover:border-green-700', 'bg-slate-50 border-slate-200 hover:border-green-300')}`}>
    <div className="flex items-start justify-between gap-2 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${SEV_COLOR[report.severity] || SEV_COLOR.Low}`}>
            {report.severity}
          </span>
          <span className={`text-xs font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{report.wasteType}</span>
          {nearby && <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-600')}`}>Nearby</span>}
        </div>
        <p className={`text-xs truncate ${dk('text-slate-400', 'text-slate-500')}`}>
          <HiLocationMarker className="inline h-3 w-3 mr-0.5" />
          {report.location?.area || report.location?.displayAddress || report.location?.address || 'Unknown location'}
        </p>
        {report.location?.city && (
          <p className={`text-[10px] mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>{report.location.city}</p>
        )}
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm shrink-0 ${
        report.status === 'Submitted' ? dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-700') :
        report.status === 'Assigned'  ? dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700') :
        dk('bg-amber-900/40 text-amber-400', 'bg-amber-100 text-amber-700')
      }`}>{report.status}</span>
    </div>
  </button>
);

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const { user: ctxUser, loading: userLoading } = useUser();

  const [stats, setStats] = useState({
    pendingSubmitted: 0, assigned: 0, inProgress: 0,
    completedToday: 0, total: 0, collector: null,
  });
  const [avail, setAvail] = useState('Available');
  const [loading, setLoading] = useState(true);
  const [villageData, setVillageData] = useState({ villageReports: [], nearbyReports: [], villages: [], village: '' });
  const [villageLoading, setVillageLoading] = useState(true);

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
    } catch {  }
    finally { setLoading(false); }
  };

  const fetchVillageReports = async () => {
    setVillageLoading(true);
    try {
      const res = await fetch('/api/collector/village-reports', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setVillageData(await res.json());
    } catch {  }
    finally { setVillageLoading(false); }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!ctxUser || ctxUser.role !== 'Collector') return;
    fetchStats();
    fetchVillageReports();
  }, [userLoading, ctxUser]);

  const updateAvailability = async (val) => {
    setAvail(val);
    try {
      await fetch('/api/collector/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: val }),
      });
    } catch {  }
  };

  const statCards = [
    { label: 'New Reports',     value: stats.pendingSubmitted ?? 0, Icon: HiInbox,       gradient: 'from-orange-500 to-amber-500',   border: 'border-orange-500/30', trend: '🔔', path: '/collector/assigned' },
    { label: 'Assigned',        value: stats.assigned,              Icon: HiClipboardList, gradient: 'from-sky-500 to-blue-600',      border: 'border-sky-500/30',    trend: null, path: '/collector/assigned' },
    { label: 'In Progress',     value: stats.inProgress,            Icon: HiClock,        gradient: 'from-yellow-400 to-orange-500',  border: 'border-yellow-500/30', trend: null, path: '/collector/tasks'    },
    { label: 'Completed Today', value: stats.completedToday,        Icon: HiCheckCircle,  gradient: 'from-green-500 to-emerald-600',  border: 'border-green-600/30',  trend: '✓',  path: '/collector/completed'},
    { label: 'Total Tasks',     value: stats.total,                 Icon: HiExclamation,  gradient: 'from-violet-500 to-purple-600',  border: 'border-violet-500/30', trend: null, path: '/collector/assigned' },
  ];

  const quickActions = [
    {
      title: 'Assigned Reports', sub: 'Citizen submissions and tasks assigned to you',
      path: '/collector/assigned', Icon: HiClipboardList,
      bg: dk('from-blue-900/30 to-slate-900/40', 'from-blue-50 to-sky-50'),
      border: dk('border-blue-800/60', 'border-blue-100'),
      hover: dk('hover:border-blue-500/50', 'hover:border-blue-300 hover:shadow-blue-100'),
      iconBg: dk('bg-blue-900/50 text-blue-300', 'bg-blue-100 text-blue-600'),
    },
    {
      title: 'My Active Tasks', sub: 'Work in progress and updates',
      path: '/collector/tasks', Icon: HiCollection,
      bg: dk('from-amber-900/25 to-slate-900/40', 'from-amber-50 to-yellow-50'),
      border: dk('border-amber-800/50', 'border-amber-100'),
      hover: dk('hover:border-amber-500/50', 'hover:border-amber-300 hover:shadow-amber-100'),
      iconBg: dk('bg-amber-900/50 text-amber-300', 'bg-amber-100 text-amber-600'),
    },
    {
      title: 'Nearby Issues', sub: 'See reported waste around you',
      path: '/collector/nearby', Icon: HiMap,
      bg: dk('from-emerald-900/30 to-slate-900/40', 'from-emerald-50 to-green-50'),
      border: dk('border-emerald-800/50', 'border-emerald-100'),
      hover: dk('hover:border-emerald-500/50', 'hover:border-emerald-300 hover:shadow-emerald-100'),
      iconBg: dk('bg-emerald-900/50 text-emerald-300', 'bg-emerald-100 text-emerald-600'),
    },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const user = ctxUser || JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="p-4 sm:p-6 space-y-6">

      <div className="relative rounded-sm overflow-hidden shadow-2xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 min-h-[160px] sm:min-h-[200px]">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-8">
          <div className="flex-1 min-w-0">
            <p className="text-green-100 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">{greeting},</p>
            <h2 className="text-white text-2xl sm:text-3xl font-extrabold leading-tight">{user.name || 'Collector'}</h2>
            <p className="text-green-100 text-sm mt-2 max-w-md leading-relaxed">
              {stats.collector
                ? `${stats.collector.area}, ${stats.collector.city} — stay on top of your assignments.`
                : 'Loading your service area…'}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className={`h-2.5 w-2.5 rounded-full ${AVAIL_DOT[avail]}`} />
              <select value={avail} onChange={e => updateAvailability(e.target.value)}
                className="rounded-sm border border-white/30 bg-white/15 backdrop-blur text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/60">
                {AVAIL_OPTIONS.map(o => <option key={o} value={o} className="text-slate-900">{o}</option>)}
              </select>
            </div>
            {(stats.pendingSubmitted ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {stats.wasteDetails?.pendingSubmitted > 0 && (
                  <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-sm border border-white/20">
                    {stats.wasteDetails.pendingSubmitted} waste report{stats.wasteDetails.pendingSubmitted === 1 ? '' : 's'} in queue
                  </span>
                )}
                {stats.scrapDetails?.pendingScrap > 0 && (
                  <span className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-sm border border-white/20">
                    {stats.scrapDetails.pendingScrap} scrap pickup{stats.scrapDetails.pendingScrap === 1 ? '' : 's'} requested
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {statCards.map(({ label, value, Icon, gradient, border, trend, path }) => (
          <button type="button" key={label} onClick={() => navigate(path)}
            className={`group relative rounded-xl border p-4 bg-gradient-to-br ${gradient} ${border} text-white overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]`}>
            <div className="absolute inset-0 rounded-xl opacity-[0.07] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
            {trend && (
              <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white">{trend}</span>
            )}
            <div className="relative z-10 h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
              <Icon className="h-[18px] w-[18px] text-white" />
            </div>
            <p className="relative z-10 text-2xl font-bold tracking-tight leading-none text-white">{loading ? '—' : value}</p>
            <p className="relative z-10 text-xs mt-1.5 text-white/75">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickActions.map(({ title, sub, path, Icon, bg, border, hover, iconBg }) => (
          <button type="button" key={path} onClick={() => navigate(path)}
            className={`group relative flex items-center gap-4 rounded-sm border bg-gradient-to-br ${bg} ${border} p-4 sm:p-5 text-left shadow-sm hover:shadow-lg ${hover} transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]`}>
            <div className={`shrink-0 h-10 w-10 rounded-sm flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{title}</p>
              <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{sub}</p>
            </div>
            <HiChevronRight className={`h-4 w-4 shrink-0 transition-all duration-200 group-hover:text-green-500 group-hover:translate-x-0.5 ${dk('text-slate-500', 'text-slate-300')}`} />
          </button>
        ))}
      </div>

      <div className={`rounded-sm border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-1 w-4 rounded-full bg-green-500" />
              <h3 className={`text-xs uppercase tracking-widest ${dk('text-slate-400', 'text-slate-500')}`}>My Village Tasks</h3>
              {villageData.villages && villageData.villages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {villageData.villages.map(v => (
                    <span key={v} className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700')}`}>
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>Reports from your assigned villages</p>
          </div>
          <button type="button" onClick={fetchVillageReports}
            className={`text-xs flex items-center gap-1 rounded-sm px-2.5 py-1 border transition ${dk('border-gray-700 text-slate-400 hover:text-green-400 hover:border-green-700', 'border-slate-200 text-slate-400 hover:text-green-600 hover:border-green-300')}`}>
            <HiRefresh className={`h-3.5 w-3.5 ${villageLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {villageLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : villageData.villageReports.length === 0 && villageData.nearbyReports.length === 0 ? (
          <div className={`text-center py-8 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            No open reports in your village right now.
          </div>
        ) : (
          <div className="space-y-4">
            {villageData.villageReports.length > 0 && (
              <div className="space-y-2">
                {villageData.villageReports.slice(0, 5).map(r => (
                  <VillageTaskCard key={r._id} report={r} dk={dk} onNavigate={() => navigate('/collector/assigned')} />
                ))}
                {villageData.villageReports.length > 5 && (
                  <button type="button" onClick={() => navigate('/collector/assigned')}
                    className="text-xs font-medium text-green-500 hover:underline">
                    +{villageData.villageReports.length - 5} more village reports →
                  </button>
                )}
              </div>
            )}
            {villageData.nearbyReports.length > 0 && villageData.villageReports.length === 0 && (
              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${dk('text-slate-500', 'text-slate-400')}`}>Nearby Tasks (within 5km)</p>
                {villageData.nearbyReports.slice(0, 3).map(r => (
                  <VillageTaskCard key={r._id} report={r} dk={dk} onNavigate={() => navigate('/collector/assigned')} nearby />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`rounded-sm border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1 w-4 rounded-full bg-green-500" />
          <h3 className={`text-xs uppercase tracking-widest ${dk('text-slate-400', 'text-slate-500')}`}>Shortcuts</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate('/collector/performance')}
            className="inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md transition active:scale-[0.98]">
            View Performance <HiChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default CollectorDashboard;
