import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../shared/constants';
import { HiClipboardList, HiCheckCircle, HiExclamation, HiRefresh, HiChevronRight, HiCollection, HiMap, HiInbox, HiLocationMarker, HiHome, HiClock } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';
import StatCard, { StatCardSkeleton } from '../../shared/components/StatCard';

const AVAIL_OPTIONS = ['Available', 'Busy', 'Offline'];
const AVAIL_DOT = { Available: 'bg-green-500', Busy: 'bg-yellow-500', Offline: 'bg-slate-500' };

const SEV_COLOR = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-green-100 text-green-700 border-green-200',
};

const VillageTaskCard = ({ report, dk, onNavigate, nearby = false }) => (
  <button type="button" onClick={onNavigate}
    className={`w-full text-left rounded-lg border p-3 transition hover:shadow-md active:scale-[0.99] ${dk('bg-white/5 border-gray-700 hover:border-green-700', 'bg-slate-50 border-slate-200 hover:border-green-300')}`}>
    <div className="flex items-start justify-between gap-2 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
            {report.reportId || 'ECO-HIDDEN'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${SEV_COLOR[report.severity] || SEV_COLOR.Low}`}>
            {report.severity}
          </span>
          <span className={`text-xs font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{report.wasteType}</span>
          {report.quantity && <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border ${dk('border-slate-700 text-slate-400', 'border-slate-200 text-slate-500')}`}>{report.quantity}</span>}
          {nearby && <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-600')}`}>Nearby</span>}
        </div>
        <p className={`text-xs truncate ${dk('text-slate-400', 'text-slate-500')}`}>
          <HiLocationMarker className="inline h-3 w-3 mr-0.5" />
          {report.location?.area || report.location?.displayAddress || report.location?.address || 'Unknown location'}
        </p>
        {report.location?.city && (
          <p className={`text-[10px] mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>{report.location.city}</p>
        )}
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
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
    publicWasteDetails: { pendingSubmitted: 0, assigned: 0, inProgress: 0, completedToday: 0, total: 0 },
    homePickupDetails: { assigned: 0, inProgress: 0, completedToday: 0, total: 0 },
  });
  const [avail, setAvail] = useState('Available');
  const [loading, setLoading] = useState(true);
  const [villageData, setVillageData] = useState({ villageReports: [], nearbyReports: [], villages: [], village: '' });
  const [villageLoading, setVillageLoading] = useState(true);

  const token = localStorage.getItem('token');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/stats`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${API}/api/collector/village-reports`, { headers: { Authorization: `Bearer ${token}` } });
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
      await fetch(`${API}/api/collector/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: val }),
      });
    } catch {  }
  };

  const pw = stats.publicWasteDetails || {};
  const hp = stats.homePickupDetails || {};
  const statCards = [
    { label: 'Assigned Public Tasks', value: pw.assigned ?? 0, Icon: HiClipboardList, path: '/collector/public-waste' },
    { label: "Today's Home Pickups", value: hp.assigned ?? 0, Icon: HiHome, path: '/collector/home-pickup' },
    { label: 'Completed Today', value: stats.completedToday, Icon: HiCheckCircle, path: '/collector/completed' },
    { label: 'Pending Tasks', value: (pw.pendingSubmitted ?? 0) + (stats.pendingSubmitted ?? 0), Icon: HiInbox, path: '/collector/public-waste' },
  ];

  const quickActions = [
    {
      title: 'Public Waste Tasks', sub: 'Community waste reports and issues',
      path: '/collector/public-waste', Icon: HiClipboardList,
      bg: dk('from-orange-900/30 to-slate-900/40', 'from-orange-50 to-amber-50'),
      border: dk('border-orange-800/60', 'border-orange-100'),
      hover: dk('hover:border-orange-500/50', 'hover:border-orange-300 hover:shadow-orange-100'),
      iconBg: dk('bg-orange-900/50 text-orange-300', 'bg-orange-100 text-orange-600'),
    },
    {
      title: 'Home Pickup Tasks', sub: 'Household waste pickup requests',
      path: '/collector/home-pickup', Icon: HiHome,
      bg: dk('from-green-900/25 to-slate-900/40', 'from-green-50 to-teal-50'),
      border: dk('border-green-800/50', 'border-green-100'),
      hover: dk('hover:border-green-500/50', 'hover:border-green-300 hover:shadow-green-100'),
      iconBg: dk('bg-green-900/50 text-green-300', 'bg-green-100 text-green-600'),
    },
    {
      title: 'Completed Tasks', sub: 'View your completed work',
      path: '/collector/completed', Icon: HiCheckCircle,
      bg: dk('from-emerald-900/30 to-slate-900/40', 'from-emerald-50 to-green-50'),
      border: dk('border-emerald-800/50', 'border-emerald-100'),
      hover: dk('hover:border-emerald-500/50', 'hover:border-emerald-300 hover:shadow-emerald-100'),
      iconBg: dk('bg-emerald-900/50 text-emerald-300', 'bg-emerald-100 text-emerald-600'),
    },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const user = ctxUser || parseStoredUser();

  return (
    <div className={`min-h-screen ${dk('bg-[#0A0A0A]', 'bg-[#F9FAFB]')}`}>
      {/* Mobile-Only Design */}
      <div className="md:hidden">
        <div className="pb-24 bg-white dark:bg-[#0A0A0A] max-md:space-y-3">

          {/* ===== MOBILE HERO ===== */}
          <section className="relative overflow-hidden rounded-[22px] mx-5 mt-3 p-4"
            style={{ height: 175, background: 'linear-gradient(135deg, #16C55B 0%, #0E9D3E 100%)' }}>
            <div className="flex items-center justify-between h-full gap-5">
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p className="text-base font-bold text-white">{greeting}, {user.name || 'Collector'} 👋</p>
                <p className="text-xs text-white/80 mt-0.5">You have {(pw.pendingSubmitted ?? 0) + (stats.pendingSubmitted ?? 0)} pending tasks</p>
                <div className="mt-3">
                  <button onClick={() => navigate('/collector/public-waste')}
                    className="h-10 rounded-xl bg-white text-[#0F9C41] text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-white/95 transition-all active:scale-95 px-4">
                    View Assigned Tasks
                  </button>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 100 }}>
                <svg viewBox="0 0 96 96" width="88" height="88" fill="none" style={{ opacity: 0.88 }}>
                  <circle cx="15" cy="15" r="2.5" fill="white" opacity="0.18"/>
                  <circle cx="70" cy="10" r="2" fill="white" opacity="0.14"/>
                  <circle cx="50" cy="18" r="1.8" fill="white" opacity="0.1"/>
                  <circle cx="80" cy="40" r="1.5" fill="white" opacity="0.12"/>
                  <rect x="12" y="38" width="72" height="32" rx="6" fill="white" opacity="0.2"/>
                  <rect x="16" y="42" width="44" height="24" rx="4" fill="white" opacity="0.25"/>
                  <rect x="64" y="44" width="16" height="20" rx="3" fill="white" opacity="0.2"/>
                  <circle cx="28" cy="76" r="7" fill="white" opacity="0.3"/>
                  <circle cx="68" cy="76" r="7" fill="white" opacity="0.3"/>
                  <rect x="56" y="20" width="22" height="20" rx="3" fill="white" opacity="0.2"/>
                  <path d="M58 22h18l-2 4H60l-2-4z" fill="white" opacity="0.25"/>
                  <line x1="62" y1="28" x2="72" y2="28" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="62" y1="32" x2="72" y2="32" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M36 20 C32 14, 26 12, 24 16 C22 20, 30 26, 36 20Z" fill="white" opacity="0.15"/>
                  <path d="M52 14 C56 10, 60 8, 61 10 C62 12, 58 16, 52 14Z" fill="white" opacity="0.12"/>
                </svg>
              </div>
            </div>
          </section>

          {/* ===== STATUS CARD ===== */}
          <section className="mx-5">
            <div className="rounded-2xl px-4 flex items-center justify-between bg-white dark:bg-[#1A1A1A] shadow-sm border border-gray-100 dark:border-gray-800" style={{ height: '76px' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0">
                  <HiClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Availability</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <select value={avail} onChange={e => updateAvailability(e.target.value)}
                      className="text-sm font-bold text-slate-900 dark:text-white bg-transparent border-none focus:outline-none cursor-pointer p-0">
                      {AVAIL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span className={`h-2 w-2 rounded-full ${AVAIL_DOT[avail]}`} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.completedToday}</p>
                <p className="text-[10px] text-slate-400">Completed today</p>
              </div>
            </div>
          </section>

          {/* ===== STATS GRID ===== */}
          <section className="mx-5">
            <div className="grid grid-cols-2 gap-3">
              {loading ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />) : statCards.map(card => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  icon={card.Icon}
                  gradient={dark
                    ? (card.label === 'Assigned Public Tasks' ? 'linear-gradient(135deg, #b85a00 0%, #d9730a 100%)'
                      : card.label === "Today's Home Pickups" ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)'
                      : card.label === 'Completed Today' ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)'
                      : 'linear-gradient(135deg, #b87208 0%, #d4960e 100%)')
                    : (card.label === 'Assigned Public Tasks' ? 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)'
                      : card.label === "Today's Home Pickups" ? 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)'
                      : card.label === 'Completed Today' ? 'linear-gradient(135deg, #22C55E 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)')
                  }
                  onClick={card.path}
                />
              ))}
            </div>
          </section>

          {/* ===== QUICK ACTIONS ===== */}
          <section className="mx-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map(({ title, sub, path, Icon, bg, border, iconBg }) => (
                <button type="button" key={path} onClick={() => navigate(path)}
                  className={`w-full flex items-center gap-3 rounded-xl border bg-gradient-to-br ${bg} ${border} p-3 text-left shadow-sm transition-all active:scale-[0.98]`}>
                  <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ===== VILLAGE TASKS ===== */}
          <section className="mx-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">My Village Tasks</h2>
              <button onClick={fetchVillageReports}
                className="text-[10px] font-medium text-green-600 flex items-center gap-1 uppercase tracking-widest">
                <HiRefresh className={`h-3.5 w-3.5 ${villageLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            {villageLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
              </div>
            ) : villageData.villageReports.length === 0 && villageData.nearbyReports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 dark:text-slate-400">No open reports in your village right now.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {villageData.villageReports.slice(0, 2).map(r => (
                  <VillageTaskCard key={r._id} report={r} dk={dk} onNavigate={() => navigate('/collector/public-waste')} />
                ))}
                {villageData.villageReports.length > 2 && (
                  <button onClick={() => navigate('/collector/public-waste')}
                    className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-green-600 py-2.5">
                    View All ({villageData.villageReports.length}) <HiChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {villageData.villageReports.length === 0 && villageData.nearbyReports.slice(0, 2).map(r => (
                  <VillageTaskCard key={r._id} report={r} dk={dk} onNavigate={() => navigate('/collector/public-waste')} nearby />
                ))}
              </div>
            )}
          </section>

          <div className="h-4" />
        </div>
      </div>

      {/* Desktop-Only Design */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

        {/* Modern Hero Card */}
        <section
          className="relative overflow-hidden p-6 sm:p-8 rounded-lg"
          style={{
            background: dark
              ? 'linear-gradient(135deg, #076b2d 0%, #0e8f5a 100%)'
              : 'linear-gradient(135deg, #0A8F3C 0%, #16C47F 100%)',
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] uppercase font-semibold tracking-widest">Collector Dashboard Active</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
                Hello, <span className="text-white/90">{user.name || 'Collector'}</span>
              </h1>
              <p className="text-sm mt-2 max-w-lg text-white/75">
                Service Area: <span className="font-bold">{user.villages?.join(', ') || user.village || 'Kundapura Taluk'}</span>, Kundapura Taluk — stay on top of your assignments.
              </p>
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="h-11 px-4 rounded-lg bg-white/15 border border-white/20 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${AVAIL_DOT[avail]}`} />
                  <select value={avail} onChange={e => updateAvailability(e.target.value)}
                    className="bg-transparent text-white text-xs font-medium border-none focus:outline-none cursor-pointer appearance-none">
                    {AVAIL_OPTIONS.map(o => <option key={o} value={o} className="text-slate-900">{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Availability & Pending Card */}
            <div
              className="w-full md:w-64 p-6 rounded-lg border border-white/20"
              style={{
                background: dark
                  ? 'linear-gradient(135deg, #4d42b0 0%, #6355c4 100%)'
                  : 'linear-gradient(135deg, #6D5EF5 0%, #8B7CF6 100%)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-semibold text-white/70 tracking-wider">Current Status</span>
                <div className={`h-6 w-6 rounded-full ${dk('bg-white/15', 'bg-white/15')} flex items-center justify-center`}>
                  <HiClock className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-semibold text-white">{stats.pendingSubmitted} <span className="text-base text-white/60 font-normal">Pending</span></p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-semibold text-white/70 uppercase">
                  <span>Completed Today</span>
                  <span>{stats.completedToday}</span>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-lg overflow-hidden">
                  <div className="h-full bg-white rounded-lg" style={{ width: `${Math.min(100, stats.total > 0 ? (stats.completedToday / stats.total) * 100 : 0)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {loading ? [1,2,3,4,5].map(i => (
            <StatCardSkeleton key={i} />
          )) : statCards.map(card => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.Icon}
              gradient={dark
                ? (card.label === 'Assigned Public Tasks' ? 'linear-gradient(135deg, #b85a00 0%, #d9730a 100%)'
                  : card.label === "Today's Home Pickups" ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)'
                  : card.label === 'Completed Today' ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)'
                  : 'linear-gradient(135deg, #b87208 0%, #d4960e 100%)')
                : (card.label === 'Assigned Public Tasks' ? 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)'
                  : card.label === "Today's Home Pickups" ? 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)'
                  : card.label === 'Completed Today' ? 'linear-gradient(135deg, #22C55E 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)')
              }
              onClick={card.path}
            />
          ))}
        </section>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ title, sub, path, Icon, bg, border, hover, iconBg }) => (
            <button type="button" key={path} onClick={() => navigate(path)}
              className={`group relative flex items-center gap-4 rounded-lg border bg-gradient-to-br ${bg} ${border} p-4 sm:p-5 text-left shadow-sm hover:shadow-lg ${hover} transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]`}>
              <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
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

        {/* Village Tasks Section */}
        <div className={`p-6 rounded-lg border ${dk('bg-[#111] border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>My Village Tasks</h2>
                {villageData.villages && villageData.villages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {villageData.villages.map(v => (
                      <span key={v} className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700')}`}>
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>Reports from your assigned villages</p>
            </div>
            <button type="button" onClick={fetchVillageReports}
              className={`text-[10px] font-medium flex items-center gap-1 ${dk('text-slate-400 hover:text-green-400', 'text-slate-400 hover:text-green-600')} uppercase tracking-widest`}>
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
                      <VillageTaskCard key={r._id} report={r} dk={dk} onNavigate={() => navigate('/collector/public-waste')} />
                    ))}
                    {villageData.villageReports.length > 5 && (
                      <button type="button" onClick={() => navigate('/collector/public-waste')}
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
                    <VillageTaskCard key={r._id} report={r} dk={dk} onNavigate={() => navigate('/collector/public-waste')} nearby />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shortcuts Section */}
        <div className={`p-6 rounded-lg border ${dk('bg-[#111] border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>Shortcuts</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/collector/performance')}
              className="h-11 px-6 rounded-lg bg-[#0AAF29] text-white text-sm font-semibold hover:bg-[#0AAF29]/90 transition-all flex items-center gap-2 group">
              View Performance <HiChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
};

export default CollectorDashboard;
