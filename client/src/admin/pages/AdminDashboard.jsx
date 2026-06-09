import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiClipboardList, HiUserGroup, HiCheckCircle, HiExclamation, HiUsers, HiChevronRight, HiUserAdd, HiClipboardCheck, HiSpeakerphone, HiDocumentText, HiShieldCheck, HiBadgeCheck } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import StatCard, { StatCardSkeleton } from '../../shared/components/StatCard';
import { API } from '../../shared/constants';
import socket from '../../socket';

const INITIAL = {
  totalCollectors: 0,
  activeCollectors: 0,
  totalReports: 0,
  publicReports: 0,
  homePickupReports: 0,
  highSeverityReports: 0,
  todayCompletedPickups: 0,
  pendingReports: 0,
  inProgressReports: 0,
  completedReports: 0,
  totalCitizens: 0,
  villagesCovered: 0,
  ecoShopOrders: 0,
  pendingRequests: 0,
  totalGreenChampions: 0,
  collectors: [],
  recentActivity: [],
  topCollectors: [],
  notificationPreview: [],
  reportStatusChart: { pending: 0, inProgress: 0, completed: 0 },
};

const AdminDashboard = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const navigate = useNavigate();
  const [stats, setStats] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch { return {}; }
  })();
  const adminToken = localStorage.getItem('adminToken');
  const adminName = adminUser?.username || 'Administrator';

  const fetchDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load dashboard.');
      setStats({ ...INITIAL, ...data });
    } catch (err) {
      setError(err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!socket) return;
    const sync = () => { fetchDashboard(false); };
    const events = [
      'collector_updated',
      'report_created',
      'reports_updated',
      'approval_request_created',
      'approval_request_updated',
      'RECYCLE_ITEM_UPDATED',
      'STORE_ANALYTICS_UPDATED',
      'notification',
    ];
    events.forEach((event) => socket.on(event, sync));
    return () => {
      events.forEach((event) => socket.off(event, sync));
    };
  }, [socket, fetchDashboard]);

  useEffect(() => {
    const onFocus = () => fetchDashboard(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchDashboard]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const quickActions = [
    {
      label: 'Add Collector',
      icon: HiUserAdd,
      path: '/admin/add-collector',
      gradient: dk('linear-gradient(135deg, #2563c4 0%, #3b7fd4 100%)', 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'),
    },
    {
      label: 'Review Requests',
      icon: HiClipboardCheck,
      path: '/admin/approval-requests',
      gradient: dk('linear-gradient(135deg, #b85a00 0%, #d9730a 100%)', 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)'),
    },
    {
      label: 'Broadcast Message',
      icon: HiSpeakerphone,
      path: '/admin/broadcast',
      gradient: dk('linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'),
    },
    {
      label: 'View Reports',
      icon: HiDocumentText,
      path: '/admin/reports',
      gradient: dk('linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)', 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)'),
    },
  ];

  const chips = [
    {
      label: 'Pending Approvals',
      value: stats.pendingRequests,
      icon: HiClipboardCheck,
      color: dk('text-amber-300', 'text-amber-600'),
      bg: dk('bg-amber-900/30', 'bg-amber-50'),
      border: dk('border-amber-700/40', 'border-amber-200'),
    },
    {
      label: 'Champion Requests',
      value: stats.totalGreenChampions,
      icon: HiBadgeCheck,
      color: dk('text-purple-300', 'text-purple-600'),
      bg: dk('bg-purple-900/30', 'bg-purple-50'),
      border: dk('border-purple-700/40', 'border-purple-200'),
    },
    {
      label: 'Active Collectors',
      value: stats.activeCollectors,
      icon: HiShieldCheck,
      color: dk('text-green-300', 'text-green-600'),
      bg: dk('bg-green-900/30', 'bg-green-50'),
      border: dk('border-green-700/40', 'border-green-200'),
    },
    {
      label: 'Pending Reports',
      value: stats.pendingReports,
      icon: HiExclamation,
      color: dk('text-red-300', 'text-red-600'),
      bg: dk('bg-red-900/30', 'bg-red-50'),
      border: dk('border-red-700/40', 'border-red-200'),
    },
  ];

  const statCards = [
    {
      label: 'Collectors', value: stats.totalCollectors, icon: HiUserGroup,
      gradient: dark ? 'linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)' : 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)',
      onClick: '/admin/view-collectors',
    },
    {
      label: 'Citizens', value: stats.totalCitizens, icon: HiUsers,
      gradient: dark ? 'linear-gradient(135deg, #2563c4 0%, #3b7fd4 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
      onClick: '/admin/manage-citizens',
    },
    {
      label: 'Reports', value: stats.totalReports, icon: HiClipboardList,
      gradient: dark ? 'linear-gradient(135deg, #b85a00 0%, #d9730a 100%)' : 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)',
      onClick: '/admin/reports',
    },
    {
      label: 'Resolved', value: stats.completedReports, icon: HiCheckCircle,
      gradient: dark ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)' : 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
    },
    {
      label: 'Pending', value: stats.pendingReports, icon: HiExclamation,
      gradient: dark ? 'linear-gradient(135deg, #b87208 0%, #d4960e 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    },
    {
      label: 'Green Champions', value: stats.totalGreenChampions, icon: HiBadgeCheck,
      gradient: dark ? 'linear-gradient(135deg, #178a3e 0%, #2db85a 100%)' : 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      onClick: '/admin/green-champions',
    },
  ];

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
                <p className="text-base font-bold text-white">{greeting}, <span className="text-white/90">{adminName}</span> 👋</p>
                <p className="text-xs text-white/80 mt-0.5">{stats.villagesCovered} villages covered</p>
                <div className="mt-3">
                  <button onClick={() => navigate('/admin/approval-requests')}
                    className="h-10 rounded-xl bg-white text-[#0F9C41] text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-white/95 transition-all active:scale-95 px-4">
                    Review Requests
                  </button>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 100 }}>
                <svg viewBox="0 0 96 96" width="88" height="88" fill="none" style={{ opacity: 0.88 }}>
                  <circle cx="15" cy="15" r="2.5" fill="white" opacity="0.18"/>
                  <circle cx="75" cy="12" r="2" fill="white" opacity="0.14"/>
                  <circle cx="50" cy="8" r="1.8" fill="white" opacity="0.1"/>
                  <circle cx="80" cy="50" r="1.5" fill="white" opacity="0.12"/>
                  <path d="M48 14L22 28v20c0 18 10 34 26 40 16-6 26-22 26-40V28L48 14z" fill="white" opacity="0.2"/>
                  <circle cx="48" cy="44" r="12" stroke="white" strokeOpacity="0.3" strokeWidth="2"/>
                  <circle cx="48" cy="44" r="5" fill="white" opacity="0.25"/>
                  <line x1="48" y1="28" x2="48" y2="32" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="48" y1="56" x2="48" y2="60" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="32" y1="44" x2="36" y2="44" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="60" y1="44" x2="64" y2="44" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </section>

          {/* ===== CHIPS STRIP ===== */}
          <section className="mx-5">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-5 px-5">
              {chips.map((chip) => (
                <div key={chip.label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 ${chip.bg} ${chip.border}`}>
                  <chip.icon className={`h-4 w-4 ${chip.color}`} />
                  <div>
                    <p className="text-[10px] font-medium text-white/80">{chip.label}</p>
                    <p className={`text-sm font-bold ${chip.color}`}>{loading ? '-' : chip.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== ERROR BANNER ===== */}
          {error && (
            <section className="mx-5">
              <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
                dark ? 'bg-red-900/20 border-red-800/40' : 'bg-red-50 border-red-200'
              }`}>
                <HiExclamation className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs font-medium text-red-700 dark:text-red-300 flex-1">{error}</p>
                <button onClick={() => fetchDashboard(true)}
                  className="text-[10px] font-semibold underline text-red-600 dark:text-red-300 shrink-0">Retry</button>
              </div>
            </section>
          )}

          {/* ===== STATS GRID ===== */}
          <section className="mx-5">
            <div className="grid grid-cols-2 gap-3">
              {loading
                ? [1,2,3,4,5,6].map(i => <StatCardSkeleton key={i} />)
                : statCards.map(card => <StatCard key={card.label} {...card} />)
              }
            </div>
          </section>

          {/* ===== QUICK ACTIONS ===== */}
          <section className="mx-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button key={action.label} onClick={() => navigate(action.path)}
                  className="rounded-xl p-3 text-left border border-white/20 shadow-sm transition-all active:scale-[0.98]"
                  style={{ background: action.gradient }}>
                  <action.icon className="h-5 w-5 text-white mb-1.5" />
                  <p className="text-xs font-semibold text-white">{action.label}</p>
                </button>
              ))}
            </div>
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
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] uppercase font-semibold tracking-widest">Admin Dashboard Active</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
                {greeting}, <span className="text-white/90">{adminName}</span>
              </h1>
              <p className="text-lg font-medium text-white/90 mt-1">
                EcoLoop Administration Center
              </p>
              <p className="text-sm mt-2 max-w-lg text-white/75">
                Manage collectors, green champions, citizens, reports, approvals, notifications, and village operations from a single dashboard.
              </p>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-4 mt-6">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="h-11 px-6 rounded-lg bg-white text-[#0A8F3C] text-sm font-semibold hover:bg-white/90 transition-all flex items-center gap-2 group"
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                    <HiChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* Overview Chips Card */}
            <div className="w-full md:w-64 shrink-0">
              <div className="p-6 rounded-lg border border-white/20"
                style={{
                  background: dark
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)',
                }}
              >
                <span className="text-[10px] uppercase font-semibold text-white/70 tracking-wider block mb-4">System Overview</span>
                <div className="space-y-3">
                  {chips.map((chip) => (
                    <div key={chip.label}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border ${chip.bg} ${chip.border}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <chip.icon className={`h-3.5 w-3.5 shrink-0 ${chip.color}`} />
                        <span className="text-xs font-medium text-white/80 truncate">{chip.label}</span>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ml-2 ${chip.color}`}>
                        {loading ? '-' : chip.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-white/60 uppercase tracking-wider">
                    <span>Villages Covered</span>
                    <span>{loading ? '-' : stats.villagesCovered}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <div className={`p-4 rounded-lg border flex items-center gap-3 ${
            dark ? 'bg-red-900/20 border-red-800/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <HiExclamation className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button onClick={() => fetchDashboard(true)}
              className="text-xs font-semibold underline hover:no-underline shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          {loading
            ? [1,2,3,4,5,6].map(i => <StatCardSkeleton key={i} />)
            : statCards.map(card => <StatCard key={card.label} {...card} />)
          }
        </section>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
