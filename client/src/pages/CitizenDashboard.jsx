import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiChevronRight, HiPencil, HiTrash, HiEye, HiExclamation, HiClipboardList, HiStar, HiChartBar, HiCheckCircle, HiClock, HiRefresh } from 'react-icons/hi';
import ReportWasteModal from '../components/ReportWasteModal';
import EditReportModal from '../components/EditReportModal';
import CleanupTimeBadge from '../components/CleanupTimeBadge';
import { ToastContainer, useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';


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
  <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-orange-100">
    <HiExclamation className="h-5 w-5 text-orange-500" />
  </div>
);

const IllustrationMyReports = () => (
  <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-blue-100">
    <HiClipboardList className="h-5 w-5 text-blue-500" />
  </div>
);

const IllustrationRewards = () => (
  <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-yellow-100">
    <HiStar className="h-5 w-5 text-yellow-500" />
  </div>
);

const ACTION_CARDS = [
  { id: 'report',  Illustration: IllustrationReport,    title: 'Report Waste',  sub: 'Submit a new waste report',  bg: 'from-orange-50 to-amber-50',   border: 'border-orange-100', hover: 'hover:border-orange-300 hover:shadow-orange-100' },
  { id: 'reports', Illustration: IllustrationMyReports, title: 'My Reports',    sub: 'Track your submissions',     bg: 'from-blue-50 to-sky-50',        border: 'border-blue-100',   hover: 'hover:border-blue-300 hover:shadow-blue-100'   },
  { id: 'rewards', Illustration: IllustrationRewards,   title: 'My Rewards',    sub: 'EcoPoints & achievements',   bg: 'from-yellow-50 to-lime-50',     border: 'border-yellow-100', hover: 'hover:border-yellow-300 hover:shadow-yellow-100' },
];

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const { dark } = useTheme();
  const { user: ctxUser, refreshUser } = useUser();
  const dk = (d, l) => dark ? d : l;
  const user = ctxUser || JSON.parse(localStorage.getItem('user') || '{}');
  const [tab,           setTab]           = useState('home');
  const [reportOpen,    setReportOpen]    = useState(false);
  const [editReport,    setEditReport]    = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

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

  useEffect(() => { fetchReports(); }, [fetchReports]);

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
    if (!window.confirm('Delete this report?')) return;
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/waste/report/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setRecentReports(rs => rs.filter(r => r._id !== id));
        toast.success('Report deleted.');
      } else {
        const d = await res.json();
        toast.error(d.message || 'Could not delete report.');
      }
    } catch { toast.error('Network error.'); }
  };

  const handleCardClick = (id) => {
    if (id === 'report')  { setReportOpen(true); return; }
    if (id === 'reports') { setTab('reports'); return; }
    if (id === 'rewards') { navigate('/citizen/my-rewards'); return; }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        {tab === 'home' && (
            <>
              <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 min-h-[160px] sm:min-h-[200px]">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative z-10 flex items-center h-full p-5 sm:p-8 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-green-100 text-sm font-medium">{greeting},</p>
                    <h2 className="text-white text-2xl sm:text-3xl font-extrabold mt-0.5 leading-tight">{user.name || 'Citizen'}</h2>
                    <p className="text-green-100 text-sm mt-2 max-w-xs leading-relaxed">Help keep your city clean. Every report makes a difference.</p>
                    <button onClick={() => setReportOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 bg-white text-green-700 text-sm font-semibold px-4 py-2 rounded-xl shadow hover:shadow-md hover:bg-green-50 transition active:scale-95">
                      Report Waste Now
                      <HiChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="hidden sm:block w-48 lg:w-64 shrink-0 opacity-90">
                    <IllustrationHero />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Reports Submitted', value: user.reportsCount  ?? recentReports.length,       color: 'text-green-600',  Icon: HiChartBar    },
                  { label: 'Resolved',           value: user.resolvedCount ?? recentReports.filter(r => r.status === 'Resolved').length, color: 'text-blue-600', Icon: HiCheckCircle },
                  { label: 'EcoPoints',          value: user.ecoPoints     ?? recentReports.length * 10, color: 'text-yellow-600', Icon: HiStar        },
                  { label: 'Streak (days)', value: ctxUser?.streakCount ?? 1, color: 'text-purple-600', Icon: HiClock },
                ].map(({ label, value, color, Icon }) => (
                  <div key={label} className={`rounded-2xl border shadow-sm p-4 text-center hover:shadow-md transition ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                    <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                    <p className={`text-xs mt-0.5 ${dk('text-slate-400','text-slate-500')}`}>{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ACTION_CARDS.map(({ id, Illustration, title, sub, bg, border, hover }) => (
                  <button key={id} onClick={() => handleCardClick(id)}
                    className={`group relative flex items-center gap-4 rounded-2xl border bg-gradient-to-br ${bg} ${border} p-4 sm:p-5 text-left shadow-sm hover:shadow-lg ${hover} transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${dk('opacity-90','')}`}>
                    <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                      <Illustration />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                    </div>
                    <HiChevronRight className="h-4 w-4 text-slate-300 shrink-0 transition-all duration-200 group-hover:text-green-500 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>

              {loadingReports ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-center">
                  <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
                </div>
              ) : recentReports.length > 0 && (
                <div className={`rounded-2xl border shadow-sm p-4 sm:p-5 ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-sm font-semibold ${dk('text-slate-200','text-slate-800')}`}>Recent Reports</h3>
                    <button onClick={() => navigate('/citizen/my-reports')} className="text-xs text-green-600 hover:underline font-medium">View all →</button>
                  </div>
                  <div className="space-y-3">
                    {recentReports.slice(0, 3).map((r) => {
                      const statusCls = r.status === 'Resolved' ? 'bg-green-100 text-green-700' : r.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';
                      const canEdit   = r.status === 'Submitted';
                      const fmtDate   = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
                      return (
                        <div key={r._id || r.wasteType} className={`rounded-xl border p-3 space-y-2 transition ${dk('bg-white/5 border-gray-700 hover:bg-white/10','bg-slate-50 border-slate-100 hover:bg-green-50')}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-semibold ${dk('text-slate-200','text-slate-800')}`}>{r.wasteType}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{r.status}</span>
                                {r.severity && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{r.severity}</span>}
                                {r.isEdited && <span className="text-xs text-blue-500">• Edited</span>}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{r.location?.displayAddress || r.location?.address || 'Location not set'}</p>
                              {fmtDate && <p className="text-xs text-slate-400">{fmtDate}</p>}
                              <CleanupTimeBadge report={r} showCountdown={false} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setEditReport(r)} disabled={!canEdit}
                              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
                                canEdit ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100' : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                              }`}>
                              <HiPencil className="h-3 w-3" /> Edit
                            </button>
                            <button onClick={() => navigate('/citizen/my-reports')}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
                              <HiEye className="h-3 w-3" /> View
                            </button>
                            <button onClick={() => handleDelete(r._id)} disabled={!canEdit}
                              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
                                canEdit ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                              }`}>
                              <HiTrash className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">My Reports</h2>
                <div className="flex items-center gap-3">
                  <button onClick={fetchReports} className="text-xs text-slate-400 hover:text-green-600 transition flex items-center gap-1">
                    <HiRefresh className="h-3.5 w-3.5" /> Refresh
                  </button>
                  <button onClick={() => navigate('/citizen/my-reports')} className="text-sm text-green-600 hover:underline font-medium">Full page →</button>
                </div>
              </div>
              <button onClick={() => setReportOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-green-200 transition active:scale-[0.98]">
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
                    <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2 hover:shadow-md transition">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-50 flex items-center justify-center">
                          <HiExclamation className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{r.wasteType}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{r.status}</span>
                            {r.severity && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{r.severity}</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{r.location?.displayAddress || r.location?.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pl-1">
                        <button onClick={() => setEditReport(r)} disabled={!canEdit}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition ${canEdit ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100' : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'}`}>
                          <HiPencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => navigate('/citizen/my-reports')}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
                          <HiEye className="h-3 w-3" /> View
                        </button>
                        <button onClick={() => handleDelete(r._id)} disabled={!canEdit}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition ${canEdit ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'}`}>
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
                <h2 className="text-base font-semibold text-slate-800">My Rewards</h2>
                <button onClick={() => navigate('/citizen/my-rewards')} className="text-sm text-green-600 hover:underline font-medium">Full page →</button>
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-400 p-6 text-white shadow-lg">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="relative">
                  <p className="text-sm opacity-80 font-medium">Total EcoPoints</p>
                  <p className="text-5xl font-extrabold mt-1">{recentReports.length * 10}</p>
                  <p className="text-xs opacity-75 mt-2">Keep reporting waste to earn more points!</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                <p className="text-sm font-semibold text-slate-800">How to earn points</p>
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

      <ReportWasteModal isOpen={reportOpen} onClose={() => setReportOpen(false)} onSuccess={handleReportSuccess} />
      <EditReportModal isOpen={!!editReport} report={editReport} onClose={() => setEditReport(null)} onUpdated={handleReportUpdated} />
      <ToastContainer toasts={toasts} onRemove={remove} />
    </>
  );
};

export default CitizenDashboard;
