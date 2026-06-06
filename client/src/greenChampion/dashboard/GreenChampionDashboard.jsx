import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../shared/constants';
import { HiChartBar, HiClipboardCheck, HiUserGroup, HiClock, HiCheckCircle, HiExclamation, HiEye, HiLocationMarker, HiRefresh, HiChevronRight, HiCollection, HiSpeakerphone, HiFlag, HiHome, HiUserAdd, HiUsers, HiClipboardList } from 'react-icons/hi';
import { MdRecycling } from 'react-icons/md';
import { ToastContainer, useToast } from '../../shared/components/Toast';
import StatCard, { StatCardSkeleton } from '../../shared/components/StatCard';
import { Skeleton } from '../../shared/components/SkeletonLoader';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser, parseStoredUser } from '../../shared/context/UserContext';
import socket from '../../socket';

const STATUS_BADGE = {
  'Submitted': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Assigned': 'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-orange-100 text-orange-700 border-orange-200',
  'Resolved': 'bg-green-100 text-green-700 border-green-200',
  'Picked Up': 'bg-teal-100 text-teal-700 border-teal-200',
};

const AVAIL_DOT = { Available: 'bg-green-500', Busy: 'bg-yellow-500', Offline: 'bg-slate-500' };

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const GreenChampionDashboard = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { toasts, toast, remove } = useToast();
  const { user: ctxUser, loading: userLoading, refreshUser } = useUser();
  const dk = (d, l) => dark ? d : l;
  const user = ctxUser || parseStoredUser();

  const [dashboardData, setDashboardData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef(null);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', type: 'Awareness', image: null });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchDashboard = useCallback(async (background = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (background) setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/green-champion/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDashboardData(await res.json());
      }
    } catch { }
    finally {
      setInitialLoading(false);
      if (background) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;
    const r = ctxUser?.role?.toLowerCase().replace('_', '');
    if (!ctxUser || r !== 'greenchampion') {
      navigate('/');
      return;
    }
    fetchDashboard();
  }, [userLoading, ctxUser, fetchDashboard, navigate]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handler = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => { fetchDashboard(true); }, 500);
    };
    socket.on('report_updated', handler);
    socket.on('notification', handler);
    socket.on('profile_updated', handler);
    socket.on('new_broadcast', handler);
    return () => {
      socket.off('report_updated', handler);
      socket.off('notification', handler);
      socket.off('profile_updated', handler);
      socket.off('new_broadcast', handler);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [fetchDashboard]);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token || !broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    setSendingBroadcast(true);
    try {
      const fd = new FormData();
      fd.append('title', broadcastForm.title.trim());
      fd.append('message', broadcastForm.message.trim());
      fd.append('notificationType', broadcastForm.type);
      if (broadcastForm.image) fd.append('image', broadcastForm.image);

      const res = await fetch(`${API}/api/green-champion/broadcast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        toast.success('Broadcast sent successfully!');
        setBroadcastForm({ title: '', message: '', type: 'Awareness', image: null });
        fetchDashboard();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to send broadcast.');
      }
    } catch { toast.error('Network error. Check your connection.'); }
    finally { setSendingBroadcast(false); }
  };

  const handleAssignCollector = async (reportId, collectorId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/collector/assign/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collectorId, assignedBy: 'green_champion' }),
      });
      if (res.ok) {
        toast.success('Collector assigned successfully!');
        fetchDashboard();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to assign collector.');
      }
    } catch { toast.error('Network error.'); }
  };

  const stats = dashboardData?.stats || {};
  const reports = dashboardData?.reports || [];
  const collectors = dashboardData?.collectors || [];
  const broadcasts = dashboardData?.broadcasts || [];
  const activityFeed = dashboardData?.activityFeed || [];
  const cleanupProgress = dashboardData?.cleanupProgress || { monthlyTarget: 80, currentRate: 0 };
  const recyclingProgress = dashboardData?.recyclingProgress || { monthlyTarget: 70, currentRate: 0 };

  const statCards = [
    { label: 'Total Citizens', value: stats.totalCitizens ?? 0, Icon: HiUsers, subtitle: 'Registered in village',
      gradient: dark ? 'linear-gradient(135deg, #2563c4 0%, #3b7fd4 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' },
    { label: 'Active Reports', value: stats.activeReports ?? 0, Icon: HiClipboardCheck, subtitle: 'In progress / assigned',
      gradient: dark ? 'linear-gradient(135deg, #b85a00 0%, #d9730a 100%)' : 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)' },
    { label: 'Pending Pickups', value: stats.pendingPickups ?? 0, Icon: HiHome, subtitle: 'Awaiting collection',
      gradient: dark ? 'linear-gradient(135deg, #b87208 0%, #d4960e 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #CA8A04 100%)' },
    { label: 'Collected Today', value: stats.wasteCollectedToday ?? 0, Icon: HiRefresh, subtitle: 'Home pickups completed',
      gradient: dark ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)' : 'linear-gradient(135deg, #22C55E 0%, #059669 100%)' },
    { label: 'Active Collectors', value: stats.activeCollectors ?? 0, Icon: HiUserGroup, subtitle: 'Available / busy',
      gradient: dark ? 'linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)' : 'linear-gradient(135deg, #14B8A6 0%, #0891B2 100%)' },
    { label: 'Resolved Reports', value: stats.resolvedReports ?? 0, Icon: HiCheckCircle, subtitle: 'Verified cleanups',
      gradient: dark ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)' : 'linear-gradient(135deg, #10B981 0%, #16A34A 100%)' },
  ];

  const quickActions = [
    { title: 'View All Citizens', sub: 'Browse village citizens', path: '/green-champion/community', Icon: HiUsers, color: 'green' },
    { title: 'Manage Reports', sub: 'Review waste reports', path: '/green-champion/reports', Icon: HiClipboardList, color: 'blue' },
    { title: 'View Collectors', sub: 'Monitor collector status', path: '/green-champion/tasks', Icon: HiUserGroup, color: 'teal' },
    { title: 'Send Broadcast', sub: 'Notify village citizens', path: '#broadcast', Icon: HiSpeakerphone, color: 'purple' },
    { title: 'Recycling Data', sub: 'Track recycling metrics', path: '/green-champion/recycling', Icon: MdRecycling, color: 'emerald' },
    { title: 'Awareness Campaigns', sub: 'Launch green campaigns', path: '/green-champion/campaigns', Icon: HiFlag, color: 'amber' },
  ];

  const ACTION_COLORS = {
    green: { bg: dk('from-green-900/30 to-slate-900/40', 'from-green-50 to-emerald-50'), border: dk('border-green-800/60', 'border-green-100'), hover: dk('hover:border-green-500/50', 'hover:border-green-300 hover:shadow-green-100'), iconBg: dk('bg-green-900/50 text-green-300', 'bg-green-100 text-green-600') },
    blue: { bg: dk('from-blue-900/30 to-slate-900/40', 'from-blue-50 to-indigo-50'), border: dk('border-blue-800/60', 'border-blue-100'), hover: dk('hover:border-blue-500/50', 'hover:border-blue-300 hover:shadow-blue-100'), iconBg: dk('bg-blue-900/50 text-blue-300', 'bg-blue-100 text-blue-600') },
    teal: { bg: dk('from-teal-900/30 to-slate-900/40', 'from-teal-50 to-cyan-50'), border: dk('border-teal-800/60', 'border-teal-100'), hover: dk('hover:border-teal-500/50', 'hover:border-teal-300 hover:shadow-teal-100'), iconBg: dk('bg-teal-900/50 text-teal-300', 'bg-teal-100 text-teal-600') },
    purple: { bg: dk('from-purple-900/30 to-slate-900/40', 'from-purple-50 to-violet-50'), border: dk('border-purple-800/60', 'border-purple-100'), hover: dk('hover:border-purple-500/50', 'hover:border-purple-300 hover:shadow-purple-100'), iconBg: dk('bg-purple-900/50 text-purple-300', 'bg-purple-100 text-purple-600') },
    emerald: { bg: dk('from-emerald-900/30 to-slate-900/40', 'from-emerald-50 to-teal-50'), border: dk('border-emerald-800/60', 'border-emerald-100'), hover: dk('hover:border-emerald-500/50', 'hover:border-emerald-300 hover:shadow-emerald-100'), iconBg: dk('bg-emerald-900/50 text-emerald-300', 'bg-emerald-100 text-emerald-600') },
    amber: { bg: dk('from-amber-900/30 to-slate-900/40', 'from-amber-50 to-yellow-50'), border: dk('border-amber-800/60', 'border-amber-100'), hover: dk('hover:border-amber-500/50', 'hover:border-amber-300 hover:shadow-amber-100'), iconBg: dk('bg-amber-900/50 text-amber-300', 'bg-amber-100 text-amber-600') },
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const villageEcoScore = stats.cleanupCompletionRate ?? 0;

  if (initialLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5,6].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500 overflow-hidden">
      {/* WELCOME HERO SECTION */}
      <section className="relative overflow-hidden rounded-lg shadow-2xl"
        style={{ background: dark ? 'linear-gradient(135deg, #076b2d 0%, #0e8f5a 100%)' : 'linear-gradient(135deg, #0A8F3C 0%, #16C47F 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-white/80 mb-2">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] uppercase font-semibold tracking-widest">{greeting},</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {user.name?.split(' ')[0] || 'Champion'}
            </h1>
            <p className="text-sm mt-2 text-white/80 max-w-xl">
              Your village: <span className="font-bold">{user.village || 'Kundapura Taluk'}</span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold uppercase">
                <HiChartBar className="h-3 w-3" /> Green Champion
              </span>
            </p>
            <p className="text-xs mt-1 text-white/60">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="mx-2">•</span>
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="flex flex-wrap items-center gap-6 mt-5">
              <div>
                <p className="text-white/70 text-[10px] uppercase font-semibold tracking-widest">Village Eco Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold text-white">{villageEcoScore}%</span>
                  <span className="text-white/60 text-xs">cleanliness rate</span>
                </div>
              </div>
              <div className="flex-1 max-w-xs">
                <div className="flex justify-between text-[10px] font-semibold text-white/70 uppercase mb-1">
                  <span>Monthly Target</span>
                  <span>{villageEcoScore}% / {cleanupProgress.monthlyTarget}%</span>
                </div>
                <div className="h-2.5 w-full bg-white/20 rounded-lg overflow-hidden">
                  <div className="h-full bg-white rounded-lg transition-all duration-700" style={{ width: `${Math.min(100, (villageEcoScore / cleanupProgress.monthlyTarget) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="w-full sm:w-56 p-5 rounded-lg border border-white/20 text-center"
            style={{ background: dark ? 'linear-gradient(135deg, #4d42b0 0%, #6355c4 100%)' : 'linear-gradient(135deg, #6D5EF5 0%, #8B7CF6 100%)' }}>
            <MdRecycling className="h-8 w-8 text-white/80 mx-auto mb-2" />
            <p className="text-white/70 text-[10px] uppercase font-semibold tracking-widest">Monthly Cleanup</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.resolvedReports ?? 0}</p>
            <p className="text-white/60 text-xs mt-1">reports resolved</p>
          </div>
        </div>
      </section>

      {/* STATS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, Icon, gradient, subtitle }) => (
          <StatCard
            key={label}
            label={label}
            value={`${value}`}
            icon={Icon}
            gradient={gradient}
          />
        ))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Recent Reports + Collector Status */}
        <div className="xl:col-span-2 space-y-6">
          {/* RECENT WASTE REPORTS */}
          <section className={`rounded-lg border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>
                <HiClipboardCheck className="inline h-4 w-4 mr-1.5 text-green-500" />
                Recent Waste Reports
              </h2>
              <button onClick={() => navigate('/green-champion/reports')}
                className="text-[10px] font-medium text-green-600 uppercase tracking-widest">
                View All
              </button>
            </div>
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <HiClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className={`text-sm font-medium ${dk('text-slate-400', 'text-slate-500')}`}>No reports yet</p>
                <p className={`text-xs mt-1 ${dk('text-slate-500', 'text-slate-400')}`}>Reports from citizens will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r._id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border transition-all group hover:border-green-500/30 ${dk('bg-[#151515] border-gray-800', 'bg-gray-50 border-slate-100')}`}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        r.reportType === 'Home Pickup' ? 'bg-teal-100 text-teal-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {r.reportType === 'Home Pickup' ? <HiHome className="h-5 w-5" /> : <HiExclamation className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border ${STATUS_BADGE[r.status] || STATUS_BADGE['Submitted']}`}>{r.status}</span>
                          <span className={`text-xs font-semibold ${dk('text-white', 'text-slate-900')}`}>{r.wasteType}</span>
                        </div>
                        <p className={`text-xs truncate ${dk('text-slate-400', 'text-slate-500')}`}>
                          <HiUserGroup className="inline h-3 w-3 mr-0.5" />
                          {r.citizenName || 'Unknown Citizen'}
                          {r.location?.address && <span className="ml-2"><HiLocationMarker className="inline h-3 w-3 mr-0.5" />{r.location.address.substring(0, 40)}</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] ${dk('text-slate-500', 'text-slate-400')}`}>
                            {timeAgo(r.createdAt)} • {r.reportType}
                          </span>
                          {r.assignedCollectorName && r.assignedCollectorName !== 'Unassigned' && (
                            <span className={`text-[10px] ${dk('text-green-400', 'text-green-600')}`}>
                              <HiUserGroup className="inline h-3 w-3 mr-0.5" />{r.assignedCollectorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 sm:ml-4">
                      <button onClick={() => setSelectedReport(r)}
                        className="p-2 rounded-lg hover:bg-white/10 transition text-slate-500 hover:text-green-500"
                        title="View details">
                        <HiEye className="h-4 w-4" />
                      </button>
                      {r.location?.lat && r.location?.lng && (
                        <a href={`https://www.google.com/maps?q=${r.location.lat},${r.location.lng}`} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-white/10 transition text-slate-500 hover:text-blue-500"
                          title="Open location">
                          <HiLocationMarker className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* COLLECTOR STATUS */}
          <section className={`rounded-lg border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>
                <HiUserGroup className="inline h-4 w-4 mr-1.5 text-green-500" />
                Collector Status
              </h2>
              <button onClick={() => navigate('/green-champion/tasks')}
                className="text-[10px] font-medium text-green-600 uppercase tracking-widest">
                Manage
              </button>
            </div>
            {collectors.length === 0 ? (
              <div className="text-center py-12">
                <HiUserAdd className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className={`text-sm font-medium ${dk('text-slate-400', 'text-slate-500')}`}>No collectors assigned</p>
                <p className={`text-xs mt-1 ${dk('text-slate-500', 'text-slate-400')}`}>Collectors will appear once assigned to your village</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {collectors.map((c) => (
                  <div key={c._id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:border-green-500/30 ${dk('bg-[#151515] border-gray-800', 'bg-gray-50 border-slate-100')}`}>
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                      c.photo ? '' : dk('bg-slate-800 text-slate-300', 'bg-slate-200 text-slate-600')
                    }`}>
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        (c.name || 'C')[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${dk('text-white', 'text-slate-900')}`}>{c.name}</p>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${AVAIL_DOT[c.availability] || 'bg-slate-500'}`} />
                      </div>
                      <p className={`text-[10px] ${dk('text-slate-400', 'text-slate-500')}`}>
                        {c.availability || 'Offline'}
                        {c.vehicleType && <span className="ml-2">• {c.vehicleType}</span>}
                      </p>
                      <p className={`text-[10px] ${dk('text-slate-500', 'text-slate-400')}`}>
                        {c.completedTasks || 0} completed tasks • Score: {c.performanceScore || 0}
                      </p>
                    </div>
                    <button onClick={() => navigate('/green-champion/tasks')}
                      className="shrink-0 p-2 rounded-lg hover:bg-white/10 transition text-slate-500 hover:text-green-500">
                      <HiEye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RECENT ACTIVITIES */}
          <section className={`rounded-lg border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>
                <HiRefresh className="inline h-4 w-4 mr-1.5 text-green-500" />
                Recent Activities
              </h2>
            </div>
            {activityFeed.length === 0 ? (
              <div className="text-center py-10">
                <HiClock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className={`text-sm font-medium ${dk('text-slate-400', 'text-slate-500')}`}>No recent activity</p>
                <p className={`text-xs mt-1 ${dk('text-slate-500', 'text-slate-400')}`}>Activities will appear as citizens interact</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityFeed.map((a, i) => (
                  <div key={a._id || i}
                    className={`flex items-center gap-3 p-3 rounded-lg transition ${dk('hover:bg-white/5', 'hover:bg-slate-50')}`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      a.type === 'report' ? 'bg-orange-100 text-orange-600' :
                      a.type === 'campaign' ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {a.type === 'report' ? <HiClipboardCheck className="h-4 w-4" /> :
                       a.type === 'campaign' ? <HiFlag className="h-4 w-4" /> :
                       <HiSpeakerphone className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{a.text}</p>
                      <p className={`text-[10px] ${dk('text-slate-500', 'text-slate-400')}`}>
                        {a.userName} • {timeAgo(a.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN - Cleanliness, Broadcast, Quick Actions */}
        <div className="space-y-6">
          {/* VILLAGE CLEANLINESS OVERVIEW */}
          <section className={`rounded-lg border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-widest mb-5 pb-3 border-b border-slate-100 dark:border-slate-800 ${dk('text-white', 'text-slate-900')}`}>
              <HiChartBar className="inline h-4 w-4 mr-1.5 text-green-500" />
              Village Cleanliness
            </h2>
            <div className="space-y-4">
              {/* Public Waste Cleanliness */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={dk('text-slate-300', 'text-slate-700')}>Public Waste Cleanliness</span>
                  <span className="font-semibold text-green-600">{Math.min(100, villageEcoScore + 5)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-lg transition-all duration-700"
                    style={{ width: `${Math.min(100, villageEcoScore + 5)}%` }} />
                </div>
              </div>
              {/* Home Pickup Completion */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={dk('text-slate-300', 'text-slate-700')}>Home Pickup Completion</span>
                  <span className="font-semibold text-green-600">{villageEcoScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg transition-all duration-700"
                    style={{ width: `${villageEcoScore}%` }} />
                </div>
              </div>
              {/* Recycling Contribution */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={dk('text-slate-300', 'text-slate-700')}>Recycling Contribution</span>
                  <span className="font-semibold text-green-600">{recyclingProgress.currentRate}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-lg transition-all duration-700"
                    style={{ width: `${recyclingProgress.currentRate}%` }} />
                </div>
              </div>
              {/* Complaint Resolution */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={dk('text-slate-300', 'text-slate-700')}>Complaint Resolution</span>
                  <span className="font-semibold text-green-600">
                    {stats.totalReports > 0 ? Math.round((stats.resolvedReports / stats.totalReports) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg transition-all duration-700"
                    style={{ width: `${stats.totalReports > 0 ? (stats.resolvedReports / stats.totalReports) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* BROADCAST NOTIFICATION */}
          <section className={`rounded-lg border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-widest mb-5 pb-3 border-b border-slate-100 dark:border-slate-800 ${dk('text-white', 'text-slate-900')}`}>
              <HiSpeakerphone className="inline h-4 w-4 mr-1.5 text-green-500" />
              Send Broadcast
            </h2>
            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <select value={broadcastForm.type} onChange={e => setBroadcastForm(p => ({ ...p, type: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${dk('bg-white/5 border-gray-700 text-slate-100', 'bg-white border-slate-300 text-slate-700')}`}>
                <option value="Awareness">Awareness</option>
                <option value="Pickup Delay">Pickup Delay</option>
                <option value="Campaign">Campaign</option>
                <option value="Emergency">Emergency</option>
              </select>
              <input type="text" placeholder="Notification title"
                value={broadcastForm.title} onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${dk('bg-white/5 border-gray-700 text-slate-100 placeholder:text-slate-500', 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400')}`} />
              <textarea rows={2} placeholder="Write your broadcast message..."
                value={broadcastForm.message} onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${dk('bg-white/5 border-gray-700 text-slate-100 placeholder:text-slate-500', 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400')}`} />
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" id="broadcast-image" className="hidden"
                  onChange={e => setBroadcastForm(p => ({ ...p, image: e.target.files[0] }))} />
                <label htmlFor="broadcast-image"
                  className={`text-[10px] px-3 py-2 rounded-lg border cursor-pointer transition ${dk('border-gray-700 text-slate-400 hover:bg-white/5', 'border-slate-300 text-slate-500 hover:bg-slate-50')}`}>
                  {broadcastForm.image ? 'Image selected' : '+ Add Image'}
                </label>
                <button type="submit" disabled={sendingBroadcast}
                  className="ml-auto h-9 px-4 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1.5">
                  {sendingBroadcast ? 'Sending...' : <><HiSpeakerphone className="h-3.5 w-3.5" /> Send</>}
                </button>
              </div>
            </form>
            {broadcasts.length > 0 && (
              <>
                <div className={`mt-5 pt-4 border-t ${dk('border-gray-800', 'border-slate-200')}`}>
                  <p className={`text-[10px] uppercase font-semibold tracking-widest mb-3 ${dk('text-slate-400', 'text-slate-500')}`}>Recent Broadcasts</p>
                  <div className="space-y-2">
                    {broadcasts.slice(0, 3).map((b) => (
                      <div key={b._id}
                        className={`p-3 rounded-lg border ${dk('bg-[#151515] border-gray-800', 'bg-gray-50 border-slate-100')}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                            b.type === 'Emergency Alerts' ? 'bg-red-100 text-red-700' :
                            b.type === 'Waste Collection Drives' ? 'bg-orange-100 text-orange-700' :
                            b.type === 'Awareness Campaigns' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>{b.type.replace('Awareness', 'Awareness').replace('Waste Collection', 'Pickup')}</span>
                          <span className={`text-[10px] ${dk('text-slate-500', 'text-slate-400')}`}>{timeAgo(b.createdAt)}</span>
                        </div>
                        <p className={`text-xs font-semibold ${dk('text-white', 'text-slate-900')}`}>{b.title}</p>
                        <p className={`text-[10px] mt-0.5 line-clamp-1 ${dk('text-slate-400', 'text-slate-500')}`}>{b.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* QUICK ACTIONS */}
          <section className={`rounded-lg border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-widest mb-5 pb-3 border-b border-slate-100 dark:border-slate-800 ${dk('text-white', 'text-slate-900')}`}>
              <HiCollection className="inline h-4 w-4 mr-1.5 text-green-500" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {quickActions.map(({ title, sub, path, Icon, color }) => {
                const c = ACTION_COLORS[color];
                return (
                  <button key={title} type="button" onClick={() => {
                    if (path.startsWith('#')) {
                      document.getElementById('broadcast-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate(path);
                    }
                  }}
                    className={`group flex items-center gap-4 rounded-lg border bg-gradient-to-br ${c.bg} ${c.border} p-4 text-left shadow-sm hover:shadow-lg ${c.hover} transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]`}>
                    <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${c.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{title}</p>
                      <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{sub}</p>
                    </div>
                    <HiChevronRight className={`h-4 w-4 shrink-0 transition-all duration-200 group-hover:text-green-500 group-hover:translate-x-0.5 ${dk('text-slate-500', 'text-slate-300')}`} />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}>
          <div className={`w-full max-w-lg rounded-lg border shadow-xl p-6 ${dk('bg-[#111] border-gray-700', 'bg-white border-slate-200')}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${dk('text-white', 'text-slate-900')}`}>Report Details</h3>
              <button onClick={() => setSelectedReport(null)} className={`p-1.5 rounded-lg transition ${dk('text-slate-400 hover:bg-white/10', 'text-slate-500 hover:bg-slate-100')}`}>
                <HiExclamation className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className={dk('text-slate-400', 'text-slate-500')}>Type</span>
                <span className={`font-semibold ${dk('text-white', 'text-slate-900')}`}>{selectedReport.reportType}</span>
              </div>
              <div className="flex justify-between">
                <span className={dk('text-slate-400', 'text-slate-500')}>Waste Type</span>
                <span className={`font-semibold ${dk('text-white', 'text-slate-900')}`}>{selectedReport.wasteType}</span>
              </div>
              <div className="flex justify-between">
                <span className={dk('text-slate-400', 'text-slate-500')}>Status</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${STATUS_BADGE[selectedReport.status] || STATUS_BADGE['Submitted']}`}>{selectedReport.status}</span>
              </div>
              <div className="flex justify-between">
                <span className={dk('text-slate-400', 'text-slate-500')}>Citizen</span>
                <span className={`font-semibold ${dk('text-white', 'text-slate-900')}`}>{selectedReport.citizenName}</span>
              </div>
              <div className="flex justify-between">
                <span className={dk('text-slate-400', 'text-slate-500')}>Location</span>
                <span className={`font-medium text-right max-w-[60%] truncate ${dk('text-slate-300', 'text-slate-700')}`}>{selectedReport.location?.displayAddress || selectedReport.location?.address || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className={dk('text-slate-400', 'text-slate-500')}>Reported</span>
                <span className={`font-medium ${dk('text-slate-300', 'text-slate-700')}`}>{new Date(selectedReport.createdAt).toLocaleString('en-IN')}</span>
              </div>
              {selectedReport.description && (
                <div className={`pt-3 border-t ${dk('border-gray-800', 'border-slate-200')}`}>
                  <p className={dk('text-slate-400', 'text-slate-500')}>Description</p>
                  <p className={`text-sm mt-1 ${dk('text-slate-300', 'text-slate-700')}`}>{selectedReport.description}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              {selectedReport.location?.lat && selectedReport.location?.lng && (
                <a href={`https://www.google.com/maps?q=${selectedReport.location.lat},${selectedReport.location.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="h-9 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5">
                  <HiLocationMarker className="h-3.5 w-3.5" /> Open Location
                </a>
              )}
              <button onClick={() => navigate('/green-champion/reports')}
                className="h-9 px-4 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition flex items-center gap-1.5">
                <HiClipboardList className="h-3.5 w-3.5" /> Manage Reports
              </button>
              <button onClick={() => setSelectedReport(null)}
                className={`ml-auto h-9 px-4 rounded-lg border text-xs font-semibold transition ${dk('border-gray-700 text-slate-300 hover:bg-white/5', 'border-slate-300 text-slate-600 hover:bg-slate-50')}`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default GreenChampionDashboard;