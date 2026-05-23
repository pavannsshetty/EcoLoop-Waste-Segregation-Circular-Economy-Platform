import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../shared/constants';
import { HiChevronRight, HiPencil, HiTrash, HiEye, HiExclamation, HiClipboardList, HiStar, HiCheckCircle, HiRefresh, HiLocationMarker } from 'react-icons/hi';
import { MdRecycling } from 'react-icons/md';
import EditReportModal from '../../shared/components/EditReportModal';
import CleanupTimeBadge from '../../shared/components/CleanupTimeBadge';
import ConfirmationModal from '../../shared/components/ConfirmationModal';
import { DashboardSkeleton, Skeleton } from '../../shared/components/SkeletonLoader';
import { ToastContainer, useToast } from '../../shared/components/Toast';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';






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

  useEffect(() => { 
    fetchReports();
    fetchScrapStats();
    fetchNotifications();
    refreshUser();
    const t = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(t);
  }, [fetchReports, fetchScrapStats, fetchNotifications, refreshUser]);

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

  const ecoPoints = user.ecoPoints || user.rewards?.points || 0;
  const streakCount = user.streakCount || 0;
  const resolvedCount = recentReports.filter(r => r.status === 'Resolved').length;

  if (pageLoading) return <DashboardSkeleton />;

  return (
    <div className={`min-h-screen ${dk('bg-[#0A0A0A]', 'bg-[#F9FAFB]')}`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Modern Hero Card */}
        <section
          className="relative overflow-hidden p-8 rounded-sm"
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
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Hello, <span className="text-white/90">{user.name?.split(' ')[0] || 'Citizen'}</span>
              </h1>
              <p className="text-sm mt-2 max-w-lg text-white/75">
                Service Area: <span className="font-bold">{user.village || 'Kundapura Taluk'}</span>, Kundapura Taluk. Manage waste and recycling for your community.
              </p>
              <div className="flex flex-wrap gap-4 mt-6">
                <button
                  onClick={() => navigate('/citizen/report-waste')}
                  className="h-11 px-6 rounded-sm bg-white text-[#0A8F3C] text-sm font-semibold hover:bg-white/90 transition-all flex items-center gap-2 group"
                >
                  <HiExclamation className="h-4 w-4" />
                  Report Local Waste
                  <HiChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <div className="h-11 px-4 rounded-sm bg-white/15 border border-white/20 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-white/70">Join Date:</span>
                  <span className="text-xs font-medium text-white">{new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Streak Card - Compact */}
            <div
              className="w-full md:w-64 p-6 rounded-sm border border-white/20"
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
                <div className="h-1.5 w-full bg-white/20 rounded-sm overflow-hidden">
                  <div className="h-full bg-white rounded-sm" style={{ width: `${((streakCount % 7) / 7) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Address Setup Warning Banner */}
        {(!user?.houseNo || !user?.streetArea) && (
          <section className={`p-4 sm:p-6 rounded-sm border flex items-center gap-4 ${dk(
            'bg-amber-900/20 border-amber-800/50',
            'bg-amber-50 border-amber-300'
          )}`}>
            <div className={`h-10 w-10 rounded-sm flex items-center justify-center shrink-0 ${dk(
              'bg-amber-800/30 text-amber-300',
              'bg-amber-200 text-amber-700'
            )}`}>
              <HiExclamation className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${dk('text-amber-200', 'text-amber-800')}`}>
                Complete your address to unlock Home Pickup services
              </p>
              <p className={`text-xs mt-1 ${dk('text-amber-300/70', 'text-amber-700/70')}`}>
                Your address helps us provide village-based waste collection and location-specific services.
              </p>
            </div>
            <button
              onClick={() => navigate('/citizen/complete-profile')}
              className="h-10 px-4 rounded-sm bg-[#0AAF29] text-white text-sm font-semibold hover:bg-[#0AAF29]/90 transition-all shrink-0"
            >
              Complete Profile
            </button>
          </section>
        )}

        {/* Real Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              label: 'CO2 Saved',
              value: `${scrapStats.co2Saved || 0} kg`,
              icon: HiRefresh,
              gradient: dark
                ? 'linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)'
                : 'linear-gradient(135deg, #0EA5A4 0%, #2DD4BF 100%)',
            },
            {
              label: 'Recycled',
              value: `${scrapStats.totalWeight || 0} kg`,
              icon: MdRecycling,
              gradient: dark
                ? 'linear-gradient(135deg, #178a3e 0%, #2db85a 100%)'
                : 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-4 rounded-sm flex items-center gap-3"
              style={{ background: stat.gradient }}
            >
              <div className="h-10 w-10 rounded-sm bg-white/20 flex items-center justify-center shrink-0">
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-medium tracking-wider text-white/70">{stat.label}</p>
                <p className="text-lg font-semibold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Activity Column */}
          <div className="lg:col-span-2 space-y-8">
            
            <div className={`p-6 rounded-sm border ${dk('bg-[#111] border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>Your Recent Reports</h2>
                <button onClick={() => navigate('/citizen/my-reports')} className="text-[10px] font-medium text-[#0AAF29] uppercase tracking-widest transition-all">View All History</button>
              </div>
              
              {loadingReports ? (
                 <div className="space-y-4">
                   {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-sm w-full" />)}
                 </div>
              ) : recentReports.length === 0 ? (
                <div className="text-center py-16">
                   <div className="h-12 w-12 rounded-sm bg-gray-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                     <HiClipboardList className="h-6 w-6 text-gray-300" />
                   </div>
                   <p className="text-sm font-medium text-slate-400">No reports submitted yet.</p>
                   <button onClick={() => navigate('/citizen/report-waste')} className="mt-4 text-xs text-[#0AAF29] font-medium transition-all">Start your first report →</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentReports.slice(0, 5).map((r, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-sm border ${dk('bg-[#151515] border-gray-800', 'bg-gray-50 border-gray-100')} hover:border-[#0AAF29]/30 transition-all group`}>
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-sm flex items-center justify-center ${
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
                      <button onClick={() => setViewReport(r)} className="p-2 rounded-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5">
                        <HiEye className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            
            {/* Real Admin Announcements */}
            <div className={`p-6 rounded-sm border ${dk('bg-[#111] border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-sm font-semibold uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>Official Updates</h2>
                <div className="h-2 w-2 rounded-full bg-[#0AAF29]" />
              </div>
              
              {loadingNotifications ? (
                <div className="space-y-4">
                  {[1,2].map(i => <Skeleton key={i} className="h-20 rounded-sm w-full" />)}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 dark:bg-white/5 rounded-sm border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">No announcements available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.slice(0, 3).map((notif, i) => (
                    <div key={i} className={`p-4 rounded-sm border ${dk('border-gray-800 bg-white/5', 'border-gray-100 bg-gray-50/50')}`}>
                      <p className={`text-xs font-medium leading-relaxed ${dk('text-slate-200', 'text-slate-800')}`}>{notif.message}</p>
                      <p className="text-[9px] text-gray-500 mt-2 uppercase font-medium">{new Date(notif.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • Admin</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Rewards Section */}
            <div
              className="p-6 rounded-sm"
              style={{
                background: dark
                  ? 'linear-gradient(135deg, #076b2d 0%, #0e8f5a 100%)'
                  : 'linear-gradient(135deg, #0A8F3C 0%, #16C47F 100%)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-sm bg-white/20 flex items-center justify-center text-xl">
                  {user.rewards?.level === 'Recycling Hero' ? '🛡️' : '🌱'}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-white/70 tracking-widest">Global Rank</p>
                  <p className="text-base font-semibold text-white">{user.rewards?.level || 'Green Beginner'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-semibold text-white/70">
                  <span>Level Progress</span>
                  <span>{ecoPoints % 100} / 100</span>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-sm overflow-hidden">
                  <div className="h-full bg-white rounded-sm transition-all duration-500" style={{ width: `${ecoPoints % 100}%` }} />
                </div>
              </div>
              <button
                onClick={() => navigate('/citizen/rewards')}
                className="w-full mt-6 py-2 rounded-sm text-[10px] font-semibold uppercase tracking-widest transition-all bg-white/15 text-white hover:bg-white/25"
              >
                Redeem Rewards
              </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewReport(null)}>
          <div onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-sm shadow-2xl overflow-hidden ${dk('bg-[#111] border border-gray-800', 'bg-white')}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dk('border-gray-800', 'border-slate-100')}`}>
              <div className="flex items-center gap-2">
                <HiClipboardList className="h-5 w-5 text-[#0AAF29]" />
                <span className={`font-semibold text-sm uppercase tracking-widest ${dk('text-white', 'text-slate-900')}`}>Official Report Details</span>
              </div>
              <button onClick={() => setViewReport(null)} className={`p-1.5 rounded-sm transition ${dk('text-slate-400 hover:bg-slate-800', 'text-slate-400 hover:bg-slate-100')}`}>
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-sm border ${
                  viewReport.status === 'Resolved'    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-[#0AAF29]/20' :
                  viewReport.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20' :
                  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20'
                }`}>{viewReport.status}</span>
                <span className={`text-base font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{viewReport.wasteType}</span>
                {viewReport.severity && (
                  <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-sm border ${dk('bg-white/5 border-white/10 text-slate-400', 'bg-slate-100 border-slate-200 text-slate-500')}`}>{viewReport.severity}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Submission ID', value: viewReport._id.slice(-8).toUpperCase() },
                  { label: 'Date Submitted', value: new Date(viewReport.createdAt).toLocaleDateString('en-IN') },
                  { label: 'Landmark',       value: viewReport.landmark || 'Not Specified' },
                  { label: 'Landmark Type',  value: viewReport.landmarkType || 'Not Specified' },
                ].map(({ label, value }) => (
                  <div key={label} className={`rounded-sm border p-3 ${dk('bg-white/5 border-gray-800', 'bg-slate-50 border-slate-200')}`}>
                    <p className={`text-[9px] font-medium uppercase tracking-widest mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>{label}</p>
                    <p className={`text-xs font-normal ${dk('text-slate-200', 'text-slate-700')}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className={`rounded-sm border p-3 ${dk('bg-white/5 border-gray-800', 'bg-slate-50 border-slate-200')}`}>
                <p className={`text-[9px] font-medium uppercase tracking-widest mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Civic Location</p>
                <div className="flex items-start gap-1.5">
                  <HiLocationMarker className="h-4 w-4 text-[#0AAF29] shrink-0 mt-0.5" />
                  <p className={`text-xs font-normal leading-relaxed ${dk('text-slate-200', 'text-slate-700')}`}>{viewReport.location?.displayAddress || 'No Address Logged'}</p>
                </div>
              </div>

              {viewReport.description && (
                <div className={`rounded-sm border p-3 ${dk('bg-white/5 border-gray-800', 'bg-slate-50 border-slate-200')}`}>
                  <p className={`text-[9px] font-medium uppercase tracking-widest mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Official Remarks</p>
                  <p className={`text-xs leading-relaxed font-normal ${dk('text-slate-300', 'text-slate-600')}`}>{viewReport.description}</p>
                </div>
              )}
            </div>

            <div className={`px-5 py-3 border-t flex justify-end ${dk('border-gray-800', 'border-slate-100')}`}>
              <button onClick={() => setViewReport(null)}
                className={`text-[10px] font-medium uppercase tracking-widest px-6 py-2.5 rounded-sm transition ${dk('bg-white/10 text-slate-200 hover:bg-white/20', 'bg-slate-900 text-white hover:bg-slate-800')}`}>
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;