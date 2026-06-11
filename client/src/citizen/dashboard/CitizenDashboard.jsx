import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../shared/constants';
import { HiChevronRight, HiPencil, HiTrash, HiEye, HiExclamation, HiClipboardList, HiStar, HiCheckCircle, HiRefresh, HiLocationMarker, HiX } from 'react-icons/hi';
import { MdRecycling, MdWhatshot } from 'react-icons/md';
import { LuPlus, LuZap, LuFileText, LuRecycle, LuLeaf, LuAward, LuUsers, LuChevronRight } from 'react-icons/lu';
import EditReportModal from '../../shared/components/EditReportModal';
import CleanupTimeBadge from '../../shared/components/CleanupTimeBadge';
import ConfirmationModal from '../../shared/components/ConfirmationModal';
import StatCard from '../../shared/components/StatCard';
import { ToastContainer, useToast } from '../../shared/components/Toast';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser, parseStoredUser } from '../../shared/context/UserContext';
import socket from '../../socket';






const LOCKED_STATUSES = ['In Progress', 'Resolved', 'Delayed', 'Clarification Expired'];

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const { dark } = useTheme();
  const { user: ctxUser, refreshUser } = useUser();
  const dk = (d, l) => dark ? d : l;
  const user = ctxUser || parseStoredUser();
  const [tab,           setTab]           = useState('home');
  const [editReport,    setEditReport]    = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [scrapStats, setScrapStats] = useState({ totalWeight: 0, pickups: 0, points: 0, co2Saved: 0 });
  const [loadingScrap, setLoadingScrap] = useState(false);
  const [analytics, setAnalytics] = useState({ recycledWeight: 0, co2Saved: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewReport,    setViewReport]    = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingReports(true);
    try {
      const res  = await fetch(`${API}/api/waste/my-reports`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRecentReports(await res.json());
    } catch { }
    finally { setLoadingReports(false); }
  }, []);

  const fetchScrapStats = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingScrap(true);
    try {
      const res = await fetch(`${API}/api/scrap/user/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setScrapStats(await res.json());
    } catch { }
    finally { setLoadingScrap(false); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch { }
    finally { setLoadingNotifications(false); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/citizen/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setAnalytics({ recycledWeight: d.recycledWeight ?? 0, co2Saved: d.co2Saved ?? 0 });
      }
    } catch { }
  }, []);

  useEffect(() => { 
    fetchReports();
    fetchScrapStats();
    fetchNotifications();
    fetchAnalytics();
    refreshUser();
  }, [fetchReports, fetchScrapStats, fetchNotifications, fetchAnalytics, refreshUser]);

  useEffect(() => {
    const handler = (updated) => {
      setRecentReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));
    };
    socket.on('report_updated', handler);
    const analyticsHandler = () => { fetchAnalytics(); };
    socket.on('analytics_updated', analyticsHandler);
    return () => {
      socket.off('report_updated', handler);
      socket.off('analytics_updated', analyticsHandler);
    };
  }, [fetchAnalytics]);

  const handleReportSuccess = (report) => {
    setRecentReports(rs => [report, ...rs]);
    toast.success('Waste report submitted successfully!');
    fetchReports();
    refreshUser();
  };

  const handleReportUpdated = (updated) => {
    setRecentReports(rs => rs.map(r => r._id === updated._id ? updated : r));
    toast.success('Report updated successfully!');
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/waste/report/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setRecentReports(rs => rs.filter(r => r._id !== id));
        toast.success('Report deleted successfully.');
        refreshUser();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Could not delete report.');
      }
    } catch { toast.error('Network error. Check your connection.'); }
  };

  const canEdit = (r) => !LOCKED_STATUSES.includes(r.status) && !r.assignedCollector && !r.collectorId;

  const ecoPoints = user.ecoPoints || user.rewards?.points || 0;
  const streakCount = user.streakCount || 0;
  const resolvedCount = recentReports.filter(r => r.status === 'Resolved').length;


  return (
    <div className={`min-h-screen ${dk('bg-[#0A0A0A]', 'bg-[#F5F5F5]')}`}>
      {/* Mobile-Only Design */}
      <div className="md:hidden">
        <div className="pb-24 bg-white dark:bg-[#0A0A0A]">

          {/* ===== MOBILE HERO BANNER ===== */}
          <section
            className="relative overflow-hidden rounded-[22px] mx-5 mt-3 p-4"
            style={{
              height: 175,
              background: dark
                ? 'linear-gradient(135deg, #16C55B 0%, #0E9D3E 100%)'
                : 'linear-gradient(135deg, #16C55B 0%, #0E9D3E 100%)',
            }}
          >
            <div className="flex items-center justify-between h-full gap-5">
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p className="text-base font-bold text-white">Good morning, {user.name?.split(' ')[0] || 'Citizen'} 👋</p>
                <p className="text-xs text-white/80 mt-0.5">Make a difference today!</p>

                <div className="mt-3">
                  <button
                    onClick={() => navigate('/citizen/report-waste')}
                    className="h-10 rounded-xl bg-white text-[#0F9C41] text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-white/95 transition-all active:scale-95 px-4"
                  >
                    <LuPlus className="h-4 w-4 text-[#0F9C41]" />
                    Report New Waste
                  </button>
                </div>
              </div>

              {/* Eco Illustration */}
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 100 }}>
                <svg viewBox="0 0 80 100" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.88 }}>
                  {/* Background decorative dots */}
                  <circle cx="15" cy="15" r="2.5" fill="white" opacity="0.18"/>
                  <circle cx="62" cy="10" r="2" fill="white" opacity="0.14"/>
                  <circle cx="50" cy="18" r="1.8" fill="white" opacity="0.1"/>
                  <circle cx="10" cy="40" r="1.5" fill="white" opacity="0.12"/>
                  <circle cx="70" cy="30" r="1.2" fill="white" opacity="0.1"/>

                  {/* Leaves behind bin */}
                  <path d="M38 26 C34 18, 28 14, 25 17 C22 20, 30 28, 38 26Z" fill="white" opacity="0.15"/>
                  <path d="M47 24 C51 16, 57 13, 59 16 C61 19, 53 26, 47 24Z" fill="white" opacity="0.12"/>
                  <path d="M35 22 C32 16, 28 14, 26 16 C24 18, 28 24, 35 22Z" fill="white" opacity="0.1"/>

                  {/* Plant stem behind bin */}
                  <path d="M42 30 C40 24, 38 20, 36 16" stroke="white" strokeWidth="1" fill="none" opacity="0.2"/>
                  <path d="M36 16 C32 14, 29 15, 30 17 C31 19, 35 18, 36 16Z" fill="white" opacity="0.2"/>
                  <path d="M40 22 C37 20, 35 21, 36 23 C37 25, 40 24, 40 22Z" fill="white" opacity="0.15"/>

                  {/* Garbage Bag 1 (left) */}
                  <path d="M8 50 C8 43, 10 40, 13 40 C14 40, 15 41, 15 42 C16 41, 18 40, 20 40 C23 40, 25 43, 25 50 L25 70 C25 73, 23 75, 20 75 L13 75 C10 75, 8 73, 8 70Z" fill="#0A7A2E"/>
                  <path d="M13 40 L15 42 L20 40" stroke="#087028" strokeWidth="1" fill="none"/>
                  <path d="M10 50 L23 50" stroke="#087028" strokeWidth="0.6" opacity="0.35"/>
                  <path d="M10 58 L23 58" stroke="#087028" strokeWidth="0.6" opacity="0.25"/>
                  <path d="M10 66 L23 66" stroke="#087028" strokeWidth="0.6" opacity="0.15"/>

                  {/* Garbage Bag 2 (right) */}
                  <path d="M55 46 C55 39, 57 36, 60 36 C61 36, 62 37, 62 38 C63 37, 65 36, 67 36 C70 36, 72 39, 72 46 L72 66 C72 69, 70 71, 67 71 L60 71 C57 71, 55 69, 55 66Z" fill="#0B8030"/>
                  <path d="M60 36 L62 38 L67 36" stroke="#096E28" strokeWidth="1" fill="none"/>
                  <path d="M57 46 L70 46" stroke="#096E28" strokeWidth="0.6" opacity="0.35"/>
                  <path d="M57 54 L70 54" stroke="#096E28" strokeWidth="0.6" opacity="0.25"/>

                  {/* Recycling Bin Body */}
                  <rect x="26" y="30" width="28" height="52" rx="5" fill="#0D8A35"/>
                  <rect x="28" y="32" width="10" height="48" rx="3" fill="white" opacity="0.06"/>
                  <path d="M26 78 L54 78 L54 82 C54 84, 52 86, 50 86 L30 86 C28 86, 26 84, 26 82Z" fill="#0B752D"/>

                  {/* Bin Lid */}
                  <rect x="24" y="25" width="32" height="6" rx="2" fill="#0B7A2E"/>
                  <rect x="24" y="25" width="32" height="3" rx="1" fill="white" opacity="0.08"/>

                  {/* Recycling Symbol (3 arrows) */}
                  <path d="M44 46 L48 52 L40 52Z" fill="white"/>
                  <path d="M44 46 C44 42, 40 40, 37 42" stroke="white" strokeWidth="1.5" fill="none"/>
                  <path d="M50 56 L48 62 L55 60Z" fill="white"/>
                  <path d="M50 56 C52 54, 54 56, 53 58" stroke="white" strokeWidth="1.5" fill="none"/>
                  <path d="M36 56 L30 60 L38 62Z" fill="white"/>
                  <path d="M36 56 C34 54, 32 56, 33 58" stroke="white" strokeWidth="1.5" fill="none"/>

                  {/* Small leaf accents */}
                  <path d="M60 20 C64 18, 66 14, 64 12 C62 10, 58 16, 60 20Z" fill="white" opacity="0.18"/>
                  <path d="M60 20 C60 18, 61 16, 64 12" stroke="white" strokeWidth="0.4" opacity="0.12"/>
                  <path d="M30 82 C28 86, 30 90, 33 88 C36 86, 34 82, 30 82Z" fill="white" opacity="0.12"/>
                </svg>
              </div>
            </div>
          </section>

          {/* ===== QUICK STATS - Horizontal Scroll ===== */}
          <section className="px-6 py-4 space-y-3">
            {/* Streak Card */}
            <div className="rounded-2xl px-4 flex items-center justify-between bg-white shadow-sm border border-gray-100 dark:border-gray-800" style={{ height: '76px' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white flex-shrink-0">
                  <MdWhatshot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Active Streak</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{streakCount} <span className="text-sm font-normal text-slate-400">Days</span></p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500">
                  <LuZap className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Stats Mini Cards - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Reports', value: recentReports.length, Icon: LuFileText, gradient: 'linear-gradient(135deg,#8B5CF6 0%,#A78BFA 100%)' },
                { label: 'Waste Recycled', value: `${analytics.recycledWeight} kg`, Icon: LuRecycle, gradient: 'linear-gradient(135deg,#3B82F6 0%,#60A5FA 100%)' },
                { label: 'CO₂ Saved', value: `${analytics.co2Saved} kg`, Icon: LuLeaf, gradient: 'linear-gradient(135deg,#16C55B 0%,#12B84F 100%)' },
                { label: 'Eco Points', value: ecoPoints, Icon: LuAward, gradient: 'linear-gradient(135deg,#F59E0B 0%,#FBBF24 100%)' },
                { label: 'Badges Earned', value: user.badges?.length || 0, Icon: LuAward, gradient: 'linear-gradient(135deg,#0EA5A4 0%,#06B6D4 100%)' },
                { label: 'Community Posts', value: user.postsCount || 0, Icon: LuUsers, gradient: 'linear-gradient(135deg,#06B6D4 0%,#60E1D3 100%)' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: s.gradient, height: '106px' }}>
                  <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <s.Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-white/85 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== ADDRESS WARNING BANNER ===== */}
          {(!user?.houseNo || !user?.streetArea) && (
            <section className="px-6 py-3">
              <div className={`p-3 rounded-2xl border flex items-start gap-3 ${dk(
                'bg-amber-900/20 border-amber-800/50',
                'bg-amber-50 border-amber-300'
              )}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dk(
                  'bg-amber-800/30 text-amber-300',
                  'bg-amber-200 text-amber-700'
                )}`}>
                  <HiExclamation className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${dk('text-amber-200', 'text-amber-800')}`}>
                    Complete your address
                  </p>
                  <p className={`text-xs mt-0.5 ${dk('text-amber-300/70', 'text-amber-700/70')}`}>
                    Unlock home pickup services
                  </p>
                  <button
                    onClick={() => navigate('/citizen/complete-profile')}
                    className="mt-2.5 h-9 px-3 rounded-lg bg-[#16A34A] text-white text-xs font-bold transition-all active:scale-95"
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ===== RECENT REPORTS SECTION ===== */}
          <section className="px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide">Your Recent Reports</h2>
              <button 
                onClick={() => navigate('/citizen/public-reports')}
                className="text-xs font-semibold text-[#16A34A] flex items-center gap-0.5"
              >
                View All <HiChevronRight className="h-3 w-3" />
              </button>
            </div>
            
            {loadingReports ? (
              <div className={`py-6 text-center rounded-2xl border-2 border-dashed ${dk('border-gray-800 bg-white/5', 'border-gray-300 bg-gray-50')}`}>
                <p className="text-xs text-gray-500 font-medium">Loading reports...</p>
              </div>
            ) : recentReports.length === 0 ? (
              <div className={`py-8 text-center rounded-2xl border-2 border-dashed ${dk('border-gray-800 bg-white/5', 'border-gray-300 bg-gray-50')}`}>
                <LuFileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-500">No reports yet</p>
                <button 
                  onClick={() => navigate('/citizen/report-waste')}
                  className="mt-3 text-xs text-[#16A34A] font-semibold"
                >
                  Start your first report →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                 {recentReports.slice(0, 2).map((r, i) => (
                  <div key={i} className={`rounded-2xl border ${dk('bg-[#151515] border-gray-800', 'bg-white border-gray-200')}`}>
                    <button
                      onClick={() => setViewReport(r)}
                      className={`w-full text-left p-3 transition-all active:scale-95`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          r.status === 'Resolved' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 
                          r.status === 'In Progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 
                          'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          <LuFileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${dk('text-white', 'text-gray-900')}`}>{r.wasteType}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{r.status} • {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                        </div>
                        <LuChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                    {canEdit(r) && (
                      <div className="px-3 pb-2">
                        <button onClick={() => setEditReport(r)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition flex items-center gap-1">
                          <HiPencil className="h-3 w-3" /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== ANNOUNCEMENTS SECTION ===== */}
          <section className="px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide">Official Updates</h2>
              <button onClick={() => navigate('/citizen/notifications')} className="text-xs font-semibold text-[#16A34A] flex items-center gap-1">View All <HiChevronRight className="h-3 w-3" /></button>
            </div>
            
            {loadingNotifications ? (
              <div className="py-4 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 font-medium">Loading updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-4 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 font-medium">No announcements</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151515] divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.slice(0, 2).map((notif, i) => (
                  <div key={i} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-[#16A34A] mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{new Date(notif.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • Admin</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="h-4" />
        </div>
      </div>

      {/* Desktop View - Hidden on Mobile */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        
        {/* ===== DESKTOP HERO (unchanged, hidden on mobile) ===== */}
        <section
          className="hidden md:block relative overflow-hidden p-6 sm:p-8 rounded-lg"
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
                <span className="text-[10px] uppercase font-semibold tracking-widest">Citizen Dashboard Active</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
                Hello, <span className="text-white/90">{user.name?.split(' ')[0] || 'Citizen'}</span>
              </h1>
              <p className="text-sm mt-2 max-w-lg text-white/75">
                Service Area: <span className="font-bold">{user.village || 'Kundapura Taluk'}</span>, Kundapura Taluk. Manage waste and recycling for your community.
              </p>
              <div className="flex flex-wrap gap-4 mt-6">
                <button
                  onClick={() => navigate('/citizen/report-waste')}
                  className="h-11 px-6 rounded-lg bg-white text-[#0A8F3C] text-sm font-semibold hover:bg-white/90 transition-all flex items-center gap-2 group"
                >
                  <HiExclamation className="h-4 w-4" />
                  Report Local Waste
                  <HiChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <div className="h-11 px-4 rounded-lg bg-white/15 border border-white/20 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-white/70">Join Date:</span>
                  <span className="text-xs font-medium text-white">{new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Streak Card - Desktop */}
            <div
              className="w-full md:w-64 p-6 rounded-lg border border-white/20"
              style={{
                background: dark
                  ? 'linear-gradient(135deg, #4d42b0 0%, #6355c4 100%)'
                  : 'linear-gradient(135deg, #6D5EF5 0%, #8B7CF6 100%)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-semibold text-white/70 tracking-wider">Active Streak</span>
                <div className="h-6 w-6 rounded-full bg-white/15 flex items-center justify-center">
                  <span className="text-white text-xs">🔥</span>
                </div>
              </div>
              <p className="text-3xl font-semibold text-white">{streakCount} <span className="text-base text-white/60 font-normal">Days</span></p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-semibold text-white/70 uppercase">
                  <span>Weekly Goal</span>
                  <span>{streakCount % 7} / 7</span>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-lg overflow-hidden">
                  <div className="h-full bg-white rounded-lg" style={{ width: `${((streakCount % 7) / 7) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real Stats Grid */}
        <section className="grid grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              label: 'Reports',
              value: recentReports.length,
              icon: HiClipboardList,
              gradient: dark
                ? 'linear-gradient(135deg, #2563c4 0%, #3b7fd4 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
            },
            {
              label: 'Resolved',
              value: resolvedCount,
              icon: HiCheckCircle,
              gradient: dark
                ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)'
                : 'linear-gradient(135deg, #1FA971 0%, #34D399 100%)',
            },
            {
              label: 'EcoPoints',
              value: ecoPoints,
              icon: HiStar,
              gradient: dark
                ? 'linear-gradient(135deg, #b87208 0%, #d4960e 100%)'
                : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
            },
            {
              label: 'CO₂ Saved',
              value: `${analytics.co2Saved} kg`,
              icon: HiRefresh,
              gradient: dark
                ? 'linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)'
                : 'linear-gradient(135deg, #0EA5A4 0%, #2DD4BF 100%)',
            },
            {
              label: 'Recycled',
              value: `${analytics.recycledWeight} kg`,
              icon: MdRecycling,
              gradient: dark
                ? 'linear-gradient(135deg, #178a3e 0%, #2db85a 100%)'
                : 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
            },
          ].map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Activity Column */}
          <div className="lg:col-span-2 space-y-8">
            
            <div className={`p-6 rounded-lg border ${dk('bg-[#111] border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>Your Recent Reports</h2>
                <button onClick={() => navigate('/citizen/public-reports')} className="text-[10px] font-medium text-[#0AAF29] uppercase tracking-widest transition-all">View All History</button>
              </div>
              
              {loadingReports ? (
                 <div className="py-8 text-center bg-gray-50/50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                   <p className="text-[10px] text-gray-400 uppercase font-medium">Loading recent reports...</p>
                 </div>
              ) : recentReports.length === 0 ? (
                <div className="text-center py-16">
                   <div className="h-12 w-12 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                     <HiClipboardList className="h-6 w-6 text-gray-300" />
                   </div>
                   <p className="text-sm font-medium text-slate-400">No reports submitted yet.</p>
                   <button onClick={() => navigate('/citizen/report-waste')} className="mt-4 text-xs text-[#0AAF29] font-medium transition-all">Start your first report →</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentReports.slice(0, 5).map((r, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-lg border ${dk('bg-[#151515] border-gray-800', 'bg-gray-50 border-gray-100')} hover:border-[#0AAF29]/30 transition-all group`}>
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          r.status === 'Resolved' ? 'bg-[#0AAF29]/10 text-[#0AAF29]' : 
                          r.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500' : 
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          <HiLocationMarker className="h-5 w-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${dk('text-white', 'text-slate-900')}`}>{r.wasteType}</p>
                          <p className="text-[10px] text-slate-500">{r.status} • {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit(r) && (
                          <button onClick={() => setEditReport(r)} className="p-2 rounded-lg hover:bg-white/5 transition-all">
                            <HiPencil className="h-4 w-4 text-blue-500" />
                          </button>
                        )}
                        <button onClick={() => setViewReport(r)} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5">
                          <HiEye className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            
            {/* Real Admin Announcements */}
            <div className={`p-6 rounded-lg border ${dk('bg-[#111] border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>Official Updates</h2>
                <div className="h-2 w-2 rounded-full bg-[#0AAF29]" />
              </div>
              
              {loadingNotifications ? (
                <div className="py-8 text-center bg-gray-50/50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Loading announcements...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">No announcements available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.slice(0, 3).map((notif, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${dk('border-gray-800 bg-white/5', 'border-gray-100 bg-gray-50/50')}`}>
                      <p className={`text-xs font-medium leading-relaxed ${dk('text-slate-200', 'text-slate-800')}`}>{notif.message}</p>
                      <p className="text-[9px] text-gray-500 mt-2 uppercase font-medium">{new Date(notif.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • Admin</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
        </div>
      </div>

      <EditReportModal isOpen={!!editReport} report={editReport} onClose={() => setEditReport(null)} onUpdated={handleReportUpdated} />
      <ConfirmationModal 
         isOpen={!!deleteConfirm} 
         onClose={() => setDeleteConfirm(null)} 
         onConfirm={() => handleDelete(deleteConfirm)} 
         title="Delete Waste Report?"
         message="Are you sure you want to remove this report? All progress and potentially pending EcoPoints will be lost."
      />
      <ToastContainer toasts={toasts} onRemove={remove} />

      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => setViewReport(null)}>
          <div onClick={e => e.stopPropagation()}
            className={`relative w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col sm:rounded-lg shadow-2xl overflow-hidden ${dk('bg-[#111] border border-gray-800', 'bg-white')}`}>
            <div className={`flex items-center justify-between px-4 sm:px-5 py-3.5 border-b shrink-0 ${dk('border-gray-800', 'border-slate-100')}`}>
              <div className="flex items-center gap-2 min-w-0">
                <HiClipboardList className="h-5 w-5 text-[#0AAF29] shrink-0" />
                <span className={`font-semibold text-sm uppercase tracking-widest truncate ${dk('text-white', 'text-slate-900')}`}>Report Details</span>
              </div>
              <button onClick={() => setViewReport(null)} className={`p-1.5 rounded-lg transition shrink-0 ${dk('text-slate-400 hover:bg-slate-800', 'text-slate-400 hover:bg-slate-100')}`}>
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 sm:px-5 py-4 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                  viewReport.status === 'Resolved'    ? 'bg-green-100 text-green-700 border-green-200' :
                  viewReport.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
                }`}>{viewReport.status}</span>
                <span className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{viewReport.wasteType}</span>
                {viewReport.severity && (
                  <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-lg border ${dk('bg-white/5 border-white/10 text-slate-400', 'bg-slate-100 border-slate-200 text-slate-500')}`}>{viewReport.severity}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Submission ID', value: viewReport._id.slice(-8).toUpperCase() },
                  { label: 'Date Submitted', value: new Date(viewReport.createdAt).toLocaleDateString('en-IN') },
                  { label: 'Landmark',       value: viewReport.landmark || 'Not Specified' },
                  { label: 'Landmark Type',  value: viewReport.landmarkType || 'Not Specified' },
                ].map(({ label, value }) => (
                  <div key={label} className={`rounded-lg border p-3 ${dk('bg-white/5 border-gray-800', 'bg-slate-50 border-slate-200')}`}>
                    <p className={`text-[9px] font-medium uppercase tracking-widest mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>{label}</p>
                    <p className={`text-xs font-normal ${dk('text-slate-200', 'text-slate-700')}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className={`rounded-lg border p-3 ${dk('bg-white/5 border-gray-800', 'bg-slate-50 border-slate-200')}`}>
                <p className={`text-[9px] font-medium uppercase tracking-widest mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Civic Location</p>
                <div className="flex items-start gap-1.5">
                  <HiLocationMarker className="h-4 w-4 text-[#0AAF29] shrink-0 mt-0.5" />
                  <p className={`text-xs font-normal leading-relaxed ${dk('text-slate-200', 'text-slate-700')}`}>{viewReport.location?.displayAddress || 'No Address Logged'}</p>
                </div>
              </div>

              {viewReport.description && (
                <div className={`rounded-lg border p-3 ${dk('bg-white/5 border-gray-800', 'bg-slate-50 border-slate-200')}`}>
                  <p className={`text-[9px] font-medium uppercase tracking-widest mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Official Remarks</p>
                  <p className={`text-xs leading-relaxed font-normal ${dk('text-slate-300', 'text-slate-600')}`}>{viewReport.description}</p>
                </div>
              )}
            </div>

            <div className={`px-4 sm:px-5 py-3 border-t shrink-0 flex justify-end ${dk('border-gray-800', 'border-slate-100')}`}>
              <button onClick={() => setViewReport(null)}
                className="text-[10px] font-medium uppercase tracking-widest px-6 py-2.5 rounded-lg bg-[#0AAF29] text-white hover:bg-[#0AAF29]/90 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;