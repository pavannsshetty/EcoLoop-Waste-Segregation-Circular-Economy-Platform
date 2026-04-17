import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiChevronRight, HiPencil, HiTrash, HiEye, HiExclamation, HiClipboardList, HiStar, HiChartBar, HiCheckCircle, HiClock, HiRefresh, HiLocationMarker } from 'react-icons/hi';
import EditReportModal from '../../shared/components/EditReportModal';
import CleanupTimeBadge from '../../shared/components/CleanupTimeBadge';
import ConfirmationModal from '../../shared/components/ConfirmationModal';
import { DashboardSkeleton, Skeleton } from '../../shared/components/SkeletonLoader';
import { ToastContainer, useToast } from '../../shared/components/Toast';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';


const IllustrationHero = () => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="160" cy="200" rx="130" ry="14" fill="rgba(0,0,0,0.08)"/>
    <rect x="60" y="80" width="60" height="110" rx="6" fill="white" fillOpacity="0.25"/>
    <rect x="68" y="90" width="44" height="8" rx="2" fill="white" fillOpacity="0.5"/>
    <rect x="68" y="104" width="30" height="6" rx="2" fill="white" fillOpacity="0.35"/>
    <rect x="68" y="116" width="36" height="6" rx="2" fill="white" fillOpacity="0.35"/>
    <rect x="68" y="128" width="24" height="6" rx="2" fill="white" fillOpacity="0.35"/>
    <rect x="140" y="100" width="70" height="90" rx="6" fill="white" fillOpacity="0.25"/>
    <rect x="150" y="112" width="50" height="8" rx="2" fill="white" fillOpacity="0.5"/>
    <rect x="150" y="126" width="36" height="6" rx="2" fill="white" fillOpacity="0.35"/>
    <rect x="150" y="138" width="42" height="6" rx="2" fill="white" fillOpacity="0.35"/>
    <rect x="220" y="120" width="50" height="70" rx="6" fill="white" fillOpacity="0.2"/>
    <circle cx="100" cy="62" r="22" fill="white" fillOpacity="0.3"/>
    <path d="M92 62 C92 57 96 53 100 53 C104 53 108 57 108 62 C108 67 104 71 100 71 C96 71 92 67 92 62Z" fill="white" fillOpacity="0.6"/>
    <path d="M96 62 L99 65 L104 59" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M130 50 C130 50 145 30 160 40 C175 50 190 25 205 35" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5"/>
    <circle cx="205" cy="35" r="5" fill="white" fillOpacity="0.5"/>
    <path d="M155 170 C155 170 160 155 170 160 C180 165 185 150 195 155" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
    <circle cx="72" cy="48" r="8" fill="white" fillOpacity="0.2"/>
    <path d="M69 48 L71.5 50.5 L75 46" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="240" cy="90" r="10" fill="white" fillOpacity="0.2"/>
    <path d="M236 90 L239 93 L244 87" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30 140 Q40 120 50 140 Q60 160 70 140" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.3"/>
    <circle cx="30" cy="140" r="3" fill="white" fillOpacity="0.4"/>
    <circle cx="70" cy="140" r="3" fill="white" fillOpacity="0.4"/>
  </svg>
);

const IllustrationReport = () => (
  <div className="h-8 w-8 flex items-center justify-center">
    <HiExclamation className="h-6 w-6 text-white" />
  </div>
);

const IllustrationMyReports = () => (
  <div className="h-8 w-8 flex items-center justify-center">
    <HiClipboardList className="h-6 w-6 text-white" />
  </div>
);

const IllustrationRewards = () => (
  <div className="h-8 w-8 flex items-center justify-center">
    <HiStar className="h-6 w-6 text-white" />
  </div>
);

const ACTION_CARDS = [
  { id: 'report',  Illustration: IllustrationReport,    title: 'Report Waste',  sub: 'Submit a new waste report',  gradient: 'from-orange-500 to-amber-500',   border: 'border-orange-500/30' },
  { id: 'reports', Illustration: IllustrationMyReports, title: 'My Reports',    sub: 'Track your submissions',     gradient: 'from-sky-500 to-blue-600',        border: 'border-sky-500/30'    },
  { id: 'rewards', Illustration: IllustrationRewards,   title: 'My Rewards',    sub: 'EcoPoints & achievements',   gradient: 'from-yellow-400 to-lime-500',     border: 'border-yellow-500/30' },
];

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const { dark } = useTheme();
  const { user: ctxUser, refreshUser } = useUser();
  const dk = (d, l) => dark ? d : l;
  const user = ctxUser || JSON.parse(localStorage.getItem('user') || '{}');
  const [tab,           setTab]           = useState('home');
  const [pageLoading,   setPageLoading]   = useState(true);
  const [editReport,    setEditReport]    = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [scrapStats, setScrapStats] = useState({ totalWeight: 0, pickups: 0, points: 0, co2Saved: 0 });
  const [loadingScrap, setLoadingScrap] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewReport,    setViewReport]    = useState(null);

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingReports(true);
    try {
      const res  = await fetch('/api/waste/my-reports', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRecentReports(await res.json());
    } catch { }
    finally { setLoadingReports(false); }
  }, []);

  const fetchScrapStats = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingScrap(true);
    try {
      const res = await fetch('/api/scrap/user/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setScrapStats(await res.json());
    } catch { }
    finally { setLoadingScrap(false); }
  }, []);

  useEffect(() => { 
    fetchReports();
    fetchScrapStats();
    const t = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(t);
  }, [fetchReports, fetchScrapStats]);

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
      const res   = await fetch(`/api/waste/report/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
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

  const handleCardClick = (id) => {
    if (id === 'report')  { navigate('/citizen/report-waste'); return; }
    if (id === 'reports') { setTab('reports'); return; }
    if (id === 'rewards') { navigate('/citizen/my-rewards'); return; }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        {tab === 'home' && (
            <>
              <div className="relative rounded-none overflow-hidden shadow-2xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 min-h-[180px] sm:min-h-[220px] active:scale-[0.99] transition-transform duration-300">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative z-10 flex items-center h-full p-6 sm:p-10 gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-green-100 text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Welcome back,</p>
                    <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight drop-shadow-sm">{user.name || 'Citizen'}</h2>
                    <p className="text-green-50 text-sm mt-3 max-w-sm leading-relaxed opacity-90">Your contributions are making {user.area || 'your city'} cleaner and greener.</p>
                    <button onClick={() => navigate('/citizen/report-waste')}
                      className="mt-6 inline-flex items-center gap-2 bg-white text-green-700 text-sm font-bold px-6 py-3 rounded-none shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group cta-pulse">
                      Report Waste Now
                      <HiChevronRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </div>
                  <div className="hidden lg:block w-72 shrink-0 opacity-90 hover:scale-105 transition-transform duration-700">
                    <IllustrationHero />
                  </div>
                </div>
              </div>

              {pageLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Reports',
                    value: user.reportsCount ?? recentReports.length,
                    Icon: HiChartBar,
                    trend: '+2',
                    gradient: 'from-green-500 to-emerald-600',
                    border: 'border-green-600/30',
                  },
                  {
                    label: 'Resolved',
                    value: user.resolvedCount ?? recentReports.filter(r => r.status === 'Resolved').length,
                    Icon: HiCheckCircle,
                    trend: '+1',
                    gradient: 'from-sky-400 to-blue-500',
                    border: 'border-sky-500/30',
                  },
                  {
                    label: 'EcoPoints',
                    value: user.ecoPoints ?? recentReports.length * 10,
                    Icon: HiStar,
                    trend: '+50',
                    gradient: 'from-yellow-400 to-orange-500',
                    border: 'border-yellow-500/30',
                  },
                  {
                    label: 'Streak',
                    value: ctxUser?.streakCount ?? 1,
                    Icon: HiClock,
                    trend: '🔥',
                    gradient: 'from-violet-500 to-purple-600',
                    border: 'border-violet-500/30',
                    streakBar: true,
                  },
                ].map(({ label, value, Icon, trend, gradient, border, streakBar }) => (
                  <div key={label}
                    className={`group relative rounded-xl border p-4 bg-gradient-to-br ${gradient} ${border} text-white overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/10`}
                  >
                    <div className="absolute inset-0 rounded-xl opacity-[0.07] pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

                    {trend && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                        {trend}
                      </span>
                    )}

                    <div className="relative z-10 h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                      <Icon className="h-[18px] w-[18px] text-white" />
                    </div>

                    <p className="relative z-10 text-2xl font-bold tracking-tight leading-none text-white">{value}</p>

                    <p className="relative z-10 text-xs mt-1.5 text-white/75">{label}</p>

                    {streakBar && (
                      <div className="relative z-10 mt-2.5 h-1 w-full rounded-full bg-white/20 overflow-hidden">
                        <div className="h-full rounded-full bg-white transition-all duration-700"
                          style={{ width: `${Math.min((value / 7) * 100, 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}

              {pageLoading ? (
                <div className="pt-2 space-y-3">
                  <Skeleton className="h-4 w-40 rounded" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                </div>
              ) : (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1 w-4 rounded-full bg-green-500" />
                  <h3 className={`text-xs uppercase tracking-widest ${dk('text-slate-400','text-slate-500')}`}>Circular Economy Impact</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  <div className="group relative rounded-xl border border-yellow-500/30 p-4 flex items-center gap-4 bg-gradient-to-br from-yellow-400 to-orange-500 text-white overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                    <div className="absolute inset-0 rounded-xl opacity-[0.07] pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                    <div className="relative z-10 h-11 w-11 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <HiStar className="h-5 w-5 text-white" />
                    </div>
                    <div className="relative z-10 flex-1 min-w-0">
                      <p className="text-xl font-bold leading-none text-white">{scrapStats.points}</p>
                      <p className="text-xs mt-1 text-white/75">Points Earned</p>
                    </div>
                    <span className="relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white shrink-0">+pts</span>
                  </div>

                  <div className="group relative rounded-xl border border-green-600/30 p-4 flex items-center gap-4 bg-gradient-to-br from-green-500 to-teal-600 text-white overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                    <div className="absolute inset-0 rounded-xl opacity-[0.07] pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                    <div className="relative z-10 h-11 w-11 shrink-0">
                      <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.2" />
                        <circle cx="22" cy="22" r="18" fill="none" stroke="white" strokeWidth="3"
                          strokeDasharray={`${Math.min((scrapStats.totalWeight / 100) * 113, 113)} 113`}
                          strokeLinecap="round" />
                      </svg>
                      <HiRefresh className="absolute inset-0 m-auto h-4 w-4 text-white" />
                    </div>
                    <div className="relative z-10 flex-1 min-w-0">
                      <p className="text-xl font-bold leading-none text-white">{scrapStats.totalWeight} <span className="text-sm">kg</span></p>
                      <p className="text-xs mt-1 text-white/75">Recycled Total</p>
                    </div>
                  </div>

                  <div className="group relative rounded-xl border border-emerald-600/30 p-4 bg-gradient-to-br from-emerald-600 to-teal-500 text-white overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                    <div className="absolute inset-0 rounded-xl opacity-[0.06] pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase tracking-widest opacity-75 mb-1">CO₂ Abatement</p>
                      <p className="text-xl font-bold leading-none">{scrapStats.co2Saved} <span className="text-sm">kg</span></p>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] opacity-70">
                          <span>Progress</span><span>65%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: '65%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              )}

              {loadingReports || pageLoading ? (
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-5 w-36 rounded" />
                  {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-sm" />)}
                </div>
              ) : recentReports.length > 0 && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h3 className={`text-lg font-bold tracking-tight ${dk('text-slate-200','text-slate-800')}`}>Recent Reports</h3>
                      <p className="text-xs text-slate-500">Manage and track your cleanup submissions</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                         className={`text-xs rounded-sm border border-slate-200 dark:border-gray-700 ${dk('bg-white/5 text-slate-200','bg-white text-slate-700')} focus:ring-green-500 px-3 py-1.5 transition-colors duration-200`}>
                         <option value="all">All Status</option>
                         <option value="Submitted">Submitted</option>
                         <option value="In Progress">In Progress</option>
                         <option value="Resolved">Resolved</option>
                       </select>
                       <button onClick={() => navigate('/citizen/my-reports')} className="text-xs font-bold text-green-600 hover:text-green-700 px-3 py-1.5 rounded-none border border-green-100 dark:border-green-500/20 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">View all</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {recentReports
                      .filter(r => filterStatus === 'all' || r.status === filterStatus)
                      .slice(0, 3)
                      .map((r) => {
                        const statusColors = {
                          'Resolved':    'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
                          'In Progress': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
                          'Submitted':   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                        };
                        const statusSteps = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
                        const currentStepIdx = statusSteps.indexOf(r.status);
                        const canEdit = r.status === 'Submitted';
                        const fmtDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                        
                        return (
                          <div key={r._id} className={`group relative rounded-sm border border-slate-200 dark:border-gray-700 p-5 sm:p-6 overflow-hidden transition-colors duration-200 ${dk('bg-white/5','bg-white')}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap mb-2">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColors[r.status] || ''}`}>
                                    {r.status}
                                  </span>
                                  <p className={`text-lg font-bold tracking-tight ${dk('text-slate-100','text-slate-900')}`}>{r.wasteType}</p>
                                  {r.severity && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10">{r.severity}</span>}
                                </div>
                                
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                                  <HiLocationMarker className="h-4 w-4 shrink-0 text-slate-500" />
                                  <span className="truncate max-w-md">{r.location?.displayAddress || 'Location not set'}</span>
                                  <span className="mx-1 opacity-30">•</span>
                                  <span>{fmtDate}</span>
                                </div>

                                <div className="flex items-center gap-2 w-full max-w-sm">
                                  {statusSteps.map((step, idx) => (
                                    <div key={step} className="flex-1 flex flex-col gap-1">
                                      <div className={`h-1.5 rounded-full transition-all duration-500 ${idx <= currentStepIdx ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 md:bg-black/5 dark:md:bg-white/5 p-1 rounded-none">
                                <button onClick={(e) => { e.stopPropagation(); setEditReport(r); }} disabled={!canEdit}
                                  className={`h-10 px-4 rounded-none flex items-center gap-2 text-xs font-bold transition-all relative z-10 ${
                                    canEdit ? 'bg-white dark:bg-white/10 text-green-600 shadow-sm hover:shadow-md active:scale-95' : 'text-slate-400 opacity-50 cursor-not-allowed'
                                  }`}>
                                  <HiPencil className="h-4 w-4" /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setViewReport(r); }}
                                  className="h-10 px-4 rounded-none flex items-center gap-2 text-xs font-bold bg-white dark:bg-white/10 text-blue-600 shadow-sm hover:shadow-md active:scale-95 transition-all relative z-10">
                                  <HiEye className="h-4 w-4" /> View
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(r._id); }} disabled={!canEdit}
                                  className={`h-10 px-4 rounded-none flex items-center gap-2 text-xs font-bold transition-all relative z-10 ${
                                    canEdit ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-400 opacity-50 cursor-not-allowed'
                                  }`}>
                                  <HiTrash className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div onClick={() => navigate('/citizen/my-reports')} className="absolute inset-0 z-0 cursor-pointer group-active:bg-black/5 transition-colors" />
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">My Reports</h2>
                <div className="flex items-center gap-3">
                  <button onClick={fetchReports} className="text-xs text-slate-400 hover:text-green-600 transition flex items-center gap-1">
                    <HiRefresh className="h-3.5 w-3.5" /> Refresh
                  </button>
                  <button onClick={() => navigate('/citizen/my-reports')} className="text-sm text-green-600 hover:underline">Full page →</button>
                </div>
              </div>
              <button onClick={() => navigate('/citizen/report-waste')}
                className="w-full flex items-center justify-center gap-2 rounded-none bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-green-200 transition active:scale-[0.98]">
                <HiExclamation className="h-5 w-5" />
                Report New Waste
              </button>
              {loadingReports ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
                </div>
              ) : recentReports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">No reports yet. Submit your first report above.</div>
              ) : (
                recentReports.map((r) => {
                  const statusCls = r.status === 'Resolved' ? 'bg-green-100 text-green-700' : r.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';
                  const canEdit   = r.status === 'Submitted';
                  return (
                    <div key={r._id} className="bg-white rounded-none border border-slate-100 shadow-sm p-4 space-y-2 hover:shadow-md transition">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-none bg-orange-50 flex items-center justify-center">
                          <HiExclamation className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900">{r.wasteType}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusCls}`}>{r.status}</span>
                            {r.severity && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{r.severity}</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{r.location?.displayAddress || r.location?.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pl-1">
                        <button onClick={() => setEditReport(r)} disabled={!canEdit}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-none border transition ${canEdit ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100' : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'}`}>
                          <HiPencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => setViewReport(r)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-none border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
                          <HiEye className="h-3 w-3" /> View
                        </button>
                        <button onClick={() => handleDelete(r._id)} disabled={!canEdit}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-none border transition ${canEdit ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'}`}>
                          <HiTrash className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'rewards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">My Rewards</h2>
                <button onClick={() => navigate('/citizen/my-rewards')} className="text-sm text-green-600 hover:underline">Full page →</button>
              </div>
              <div className="relative rounded-none overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-400 p-6 text-white shadow-lg">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="relative">
                  <p className="text-sm opacity-80">Total EcoPoints</p>
                  <p className="text-5xl font-bold mt-1">{recentReports.length * 10}</p>
                  <p className="text-xs opacity-75 mt-2">Keep reporting waste to earn more points!</p>
                </div>
              </div>
              <div className="bg-white rounded-none border border-slate-100 shadow-sm p-5 space-y-3">
                <p className="text-sm font-bold text-slate-800">How to earn points</p>
                {[
                  { action: 'Submit a waste report', pts: '+10 pts', color: 'text-green-600' },
                  { action: 'Report gets resolved',  pts: '+15 pts', color: 'text-blue-600'  },
                  { action: 'Weekly active user',    pts: '+5 pts',  color: 'text-purple-600' },
                ].map(({ action, pts, color }) => (
                  <div key={action} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-600">{action}</span>
                    <span className={`text-sm font-bold ${color}`}>{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewReport(null)}>
          <div onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-sm shadow-2xl overflow-hidden ${dk('bg-slate-900 border border-gray-700', 'bg-white')}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dk('border-gray-700', 'border-slate-100')}`}>
              <div className="flex items-center gap-2">
                <HiClipboardList className="h-5 w-5 text-green-500" />
                <span className={`font-bold text-sm ${dk('text-white', 'text-slate-900')}`}>Report Details</span>
              </div>
              <button onClick={() => setViewReport(null)} className={`p-1.5 rounded-sm transition ${dk('text-slate-400 hover:bg-slate-700', 'text-slate-400 hover:bg-slate-100')}`}>
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  viewReport.status === 'Resolved'    ? 'bg-green-100 text-green-700 border-green-200' :
                  viewReport.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
                }`}>{viewReport.status}</span>
                <span className={`text-base font-bold ${dk('text-slate-100', 'text-slate-900')}`}>{viewReport.wasteType}</span>
                {viewReport.severity && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${dk('bg-white/5 border-white/10 text-slate-400', 'bg-slate-100 border-slate-200 text-slate-500')}`}>{viewReport.severity}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Date Submitted', value: viewReport.createdAt ? new Date(viewReport.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  { label: 'Waste Seen At',  value: viewReport.wasteSeenAt || '—' },
                  { label: 'Landmark',       value: viewReport.landmark || '—' },
                  { label: 'Landmark Type',  value: viewReport.landmarkType || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className={`rounded-sm border p-3 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>{label}</p>
                    <p className={`text-xs ${dk('text-slate-200', 'text-slate-700')}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className={`rounded-sm border p-3 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Location</p>
                <div className="flex items-start gap-1.5">
                  <HiLocationMarker className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <p className={`text-xs ${dk('text-slate-200', 'text-slate-700')}`}>{viewReport.location?.displayAddress || viewReport.location?.address || '—'}</p>
                </div>
              </div>

              {viewReport.description && (
                <div className={`rounded-sm border p-3 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Description</p>
                  <p className={`text-xs leading-relaxed ${dk('text-slate-300', 'text-slate-600')}`}>{viewReport.description}</p>
                </div>
              )}

              {viewReport.pickupTime && (
                <div className={`rounded-sm border p-3 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Scheduled Pickup</p>
                  <p className={`text-xs ${dk('text-slate-200', 'text-slate-700')}`}>
                    {new Date(viewReport.pickupTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            <div className={`px-5 py-3 border-t flex justify-end ${dk('border-gray-700', 'border-slate-100')}`}>
              <button onClick={() => setViewReport(null)}
                className={`text-sm font-bold px-4 py-2 rounded-sm transition ${dk('bg-white/10 text-slate-200 hover:bg-white/20', 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CitizenDashboard;
