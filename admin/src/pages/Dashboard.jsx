import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiBell,
  HiChartBar,
  HiCheckCircle,
  HiClipboardList,
  HiLocationMarker,
  HiSearch,
  HiShieldCheck,
  HiShoppingCart,
  HiUsers,
  HiExclamation,
  HiHome,
  HiAnnotation,
  HiChevronRight,
  HiUserAdd,
  HiClipboardCheck,
  HiSpeakerphone,
  HiDocumentText,
  HiBadgeCheck,
} from 'react-icons/hi';
import { MdRecycling, MdCloudQueue } from 'react-icons/md';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import Dropdown from '../components/Dropdown';
import StatCard, { StatCardSkeleton } from '../components/StatCard';

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
  totalRecycledWeight: 0,
  totalCo2Saved: 0,
  collectors: [],
  recentActivity: [],
  topCollectors: [],
  notificationPreview: [],
  reportStatusChart: { pending: 0, inProgress: 0, completed: 0 },
};

const Dashboard = () => {
  const { dark } = useTheme();
  const { socket } = useSocket();
  const dk = (d, l) => (dark ? d : l);
  const navigate = useNavigate();
  const [stats, setStats] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem('admin-user') || '{}'); } catch { return {}; }
  })();
  const adminName = adminUser?.username || 'Administrator';

  const fetchDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        let msg = 'Unable to load dashboard.';
        try { const p = JSON.parse(body); if (p.message) msg = p.message; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setStats({ ...INITIAL, ...data });
    } catch (err) {
      setError(err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      'analytics_updated',
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
    { label: 'Add Collector', icon: HiUserAdd, path: '/admin/add-collector' },
    { label: 'Review Requests', icon: HiClipboardCheck, path: '/admin/approval-requests' },
    { label: 'Broadcast Message', icon: HiSpeakerphone, path: '/admin/sendbrodcastnotifications' },
    { label: 'View Reports', icon: HiDocumentText, path: '/admin/reports' },
  ];

  const statCards = [
    { label: 'Collectors', value: stats.totalCollectors, icon: HiUsers, gradient: dk('linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)', 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)'), onClick: '/admin/collectors' },
    { label: 'Citizens', value: stats.totalCitizens, icon: HiUsers, gradient: dk('linear-gradient(135deg, #2563c4 0%, #3b7fd4 100%)', 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)') },
    { label: 'Green Champions', value: stats.totalGreenChampions, icon: HiBadgeCheck, gradient: dk('linear-gradient(135deg, #178a3e 0%, #2db85a 100%)', 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'), onClick: '/admin/champions' },
    { label: 'Reports', value: stats.totalReports, icon: HiClipboardList, gradient: dk('linear-gradient(135deg, #b85a00 0%, #d9730a 100%)', 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)'), onClick: '/admin/reports' },
    { label: 'Resolved', value: stats.completedReports, icon: HiCheckCircle, gradient: dk('linear-gradient(135deg, #157a50 0%, #22a06b 100%)', 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)') },
    { label: 'Pending', value: stats.pendingReports, icon: HiExclamation, gradient: dk('linear-gradient(135deg, #b87208 0%, #d4960e 100%)', 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)') },
    { label: 'Recycled Waste', value: `${stats.totalRecycledWeight} kg`, icon: MdRecycling, gradient: dk('linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)', 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)') },
    { label: 'CO₂ Saved', value: `${stats.totalCo2Saved} kg`, icon: MdCloudQueue, gradient: dk('linear-gradient(135deg, #157a50 0%, #22a06b 100%)', 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)') },
  ];

  const filteredCollectors = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (stats.collectors || []).filter((collector) => {
      const matchesStatus = statusFilter === 'All' || collector.status === statusFilter;
      const matchesQuery = !text || [
        collector.collectorId,
        collector.name,
        collector.teamLeader,
        collector.mobile,
        collector.collectorType,
      ].some((value) => String(value || '').toLowerCase().includes(text));
      return matchesStatus && matchesQuery;
    });
  }, [stats.collectors, query, statusFilter]);

  const chartItems = [
    { label: 'Pending', value: stats.reportStatusChart?.pending || 0, color: 'bg-amber-500' },
    { label: 'In Progress', value: stats.reportStatusChart?.inProgress || 0, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.reportStatusChart?.completed || 0, color: 'bg-green-500' },
  ];
  const chartTotal = Math.max(chartItems.reduce((sum, item) => sum + item.value, 0), 1);

  const card = `rounded-lg border shadow-sm ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`;
  const muted = dk('text-slate-400', 'text-slate-500');
  const primary = dk('text-slate-200', 'text-slate-800');

  const dateText = (value) => value
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '-';

  return (
    <div className={`min-h-screen ${dk('bg-[#0A0A0A]', 'bg-[#F9FAFB]')}`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5 animate-in fade-in duration-500">

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
                <span className="text-[10px] uppercase font-semibold tracking-widest">Admin Dashboard Active</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
                {greeting}, <span className="text-white/90">{adminName}</span>
              </h1>
              <p className="text-sm mt-2 max-w-lg text-white/75">
                EcoLoop Administration Center — Manage collectors, green champions, citizens, reports, approvals, notifications, and village operations from a single dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-56 shrink-0">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="h-11 px-6 rounded-lg bg-white text-[#0A8F3C] text-sm font-semibold hover:bg-white/90 transition-all flex items-center gap-2 group"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                  <HiChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1 ml-auto" />
                </button>
              ))}
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

        {/* Stats Cards — Row 1 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {loading
            ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />)
            : statCards.slice(0, 4).map(card => <StatCard key={card.label} {...card} />)
          }
        </section>
        {/* Stats Cards — Row 2 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {loading
            ? [5,6,7,8].map(i => <StatCardSkeleton key={i} />)
            : statCards.slice(4, 8).map(card => <StatCard key={card.label} {...card} />)
          }
        </section>

        {/* Report Status + Notifications */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className={`${card} p-5 xl:col-span-2`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className={`text-sm font-semibold ${primary}`}>Report Status</h2>
                <p className={`text-xs mt-0.5 ${muted}`}>Pending, in progress, and completed workload</p>
              </div>
              <HiChartBar className="h-5 w-5 text-green-500" />
            </div>
            <div className="space-y-4">
              {chartItems.map((item) => {
                const pct = Math.round((item.value / chartTotal) * 100);
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-medium ${primary}`}>{item.label}</span>
                      <span className={muted}>{item.value} ({pct}%)</span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${dk('bg-slate-800', 'bg-slate-100')}`}>
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className={`text-sm font-semibold ${primary}`}>Notification Preview</h2>
                <p className={`text-xs mt-0.5 ${muted}`}>New reports and requests</p>
              </div>
              <HiBell className="h-5 w-5 text-amber-500" />
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stats.notificationPreview?.length ? (
                stats.notificationPreview.map((item, index) => (
                  <div key={`${item.title}-${index}`} className={`rounded-lg border px-3 py-2 ${dk('border-slate-800 bg-slate-900/40', 'border-slate-100 bg-slate-50/70')}`}>
                    <p className={`text-sm font-semibold line-clamp-1 ${primary}`}>{item.title}</p>
                    <p className={`text-xs line-clamp-1 ${muted}`}>{item.description}</p>
                  </div>
                ))
              ) : (
                <p className={`text-sm ${muted}`}>No notifications yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity + Top Collectors */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className={`${card} overflow-hidden`}>
            <div className={`px-4 sm:px-5 py-4 border-b ${dk('border-gray-800', 'border-slate-100')}`}>
              <h2 className={`text-sm font-semibold ${primary}`}>Recent Activity</h2>
              <p className={`text-xs mt-0.5 ${muted}`}>Latest reports, collector additions, and requests</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-gray-800">
              {stats.recentActivity?.length ? (
                stats.recentActivity.map((item, index) => (
                  <div key={`${item.type}-${index}`} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${primary}`}>{item.title}</p>
                      <p className={`text-xs truncate ${muted}`}>{item.subtitle}</p>
                    </div>
                    <span className={`text-[11px] shrink-0 ${muted}`}>{dateText(item.createdAt)}</span>
                  </div>
                ))
              ) : (
                <div className={`p-6 text-sm ${muted}`}>No recent activity.</div>
              )}
            </div>
          </div>

          <div className={`${card} overflow-hidden`}>
            <div className={`px-4 sm:px-5 py-4 border-b ${dk('border-gray-800', 'border-slate-100')}`}>
              <h2 className={`text-sm font-semibold ${primary}`}>Top Active Collectors</h2>
              <p className={`text-xs mt-0.5 ${muted}`}>Ranked by completed work and current load</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-gray-800">
              {stats.topCollectors?.length ? (
                stats.topCollectors.map((collector, index) => (
                  <div key={collector._id || collector.collectorId} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold ${dk('bg-slate-800 text-green-400', 'bg-green-50 text-green-700')}`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${primary}`}>{collector.name}</p>
                        <p className={`text-xs font-mono ${muted}`}>{collector.collectorId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-500">{collector.stats?.completed || 0}</p>
                      <p className={`text-[11px] ${muted}`}>completed</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-6 text-sm ${muted}`}>No collector performance yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Collectors Table */}
        <div className={`${card} min-w-0 overflow-hidden`}>
          <div className={`px-4 sm:px-5 py-4 border-b space-y-4 ${dk('border-gray-800', 'border-slate-100')}`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className={`text-sm font-semibold ${primary}`}>Collectors</h2>
                <p className={`text-xs mt-0.5 ${muted}`}>{filteredCollectors.length} visible of {stats.collectors?.length || 0}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className={`flex items-center gap-2.5 px-3 h-10 rounded-lg border min-w-0 sm:min-w-72 ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
                  <HiSearch className={`h-4 w-4 shrink-0 ${muted}`} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search collectors..."
                    className="w-full bg-transparent border-none outline-none text-sm"
                  />
                </div>
                <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 text-sm">
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Dropdown>
              </div>
            </div>
          </div>

          {filteredCollectors.length === 0 ? (
            <div className={`text-center py-12 text-sm ${muted}`}>No collectors match the current filters.</div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                      {['Collector ID', 'Name', 'Leader', 'Mobile', 'Villages', 'Active', 'Completed', 'Status'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCollectors.map((c) => (
                      <tr key={c._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                        <td className="px-5 py-4 font-mono text-xs font-bold text-green-600 whitespace-nowrap">{c.collectorId}</td>
                        <td className={`px-5 py-4 font-semibold whitespace-nowrap ${primary}`}>{c.name}</td>
                        <td className={`px-5 py-4 whitespace-nowrap ${muted}`}>{c.teamLeader || '-'}</td>
                        <td className={`px-5 py-4 whitespace-nowrap ${muted}`}>{c.mobile || '-'}</td>
                        <td className={`px-5 py-4 max-w-xs ${muted}`}>{(c.villages || []).join(', ') || '-'}</td>
                        <td className="px-5 py-4 text-blue-500 font-bold">{c.stats?.active || 0}</td>
                        <td className="px-5 py-4 text-green-500 font-bold">{c.stats?.completed || 0}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'Active' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800') : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-700')}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lg:hidden divide-y divide-slate-100 dark:divide-gray-800">
                {filteredCollectors.map((c) => (
                  <div key={c._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-green-600">{c.collectorId}</p>
                        <p className={`font-semibold truncate ${primary}`}>{c.name}</p>
                        <p className={`text-xs ${muted}`}>{c.teamLeader || 'No leader listed'}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'Active' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800') : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-700')}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className={`text-[11px] uppercase font-semibold ${muted}`}>Active</p>
                        <p className="font-bold text-blue-500">{c.stats?.active || 0}</p>
                      </div>
                      <div>
                        <p className={`text-[11px] uppercase font-semibold ${muted}`}>Completed</p>
                        <p className="font-bold text-green-500">{c.stats?.completed || 0}</p>
                      </div>
                      <div className="col-span-2">
                        <p className={`text-[11px] uppercase font-semibold ${muted}`}>Villages</p>
                        <p className={muted}>{(c.villages || []).join(', ') || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
