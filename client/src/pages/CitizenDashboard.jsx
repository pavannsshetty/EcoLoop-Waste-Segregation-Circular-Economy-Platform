import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLogout, HiMenu, HiX, HiChevronRight, HiBell, HiCog, HiQuestionMarkCircle, HiUser } from 'react-icons/hi';
import { MdOutlineReportProblem } from 'react-icons/md';
import EcoLoopLogo from '../components/EcoLoopLogo';
import ReportWasteModal from '../components/ReportWasteModal';
import { ToastContainer, useToast } from '../components/Toast';

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconReports = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
  </svg>
);
const IconRewards = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

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
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
    <circle cx="24" cy="24" r="20" fill="#FEF3C7"/>
    <path d="M24 14v10M24 30v2" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M16 36h16M18 20l-4 4 4 4M30 20l4 4-4 4" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IllustrationMyReports = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
    <circle cx="24" cy="24" r="20" fill="#DBEAFE"/>
    <rect x="14" y="13" width="20" height="24" rx="3" fill="white" stroke="#3B82F6" strokeWidth="1.5"/>
    <path d="M18 20h12M18 25h8M18 30h10" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="32" cy="32" r="6" fill="#3B82F6"/>
    <path d="M30 32l1.5 1.5L34 30" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IllustrationRewards = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
    <circle cx="24" cy="24" r="20" fill="#FEF9C3"/>
    <path d="M24 14l2.47 5.01L32 20.18l-4 3.9.94 5.5L24 27l-4.94 2.58.94-5.5-4-3.9 5.53-.17L24 14z" fill="#EAB308" stroke="#CA8A04" strokeWidth="1"/>
    <path d="M18 36h12" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M21 33v3M27 33v3" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const NAV_MAIN = [
  { id: 'home',    Icon: IconDashboard, label: 'Dashboard'    },
  { id: 'report',  Icon: () => <MdOutlineReportProblem className="h-5 w-5" />, label: 'Report Waste' },
  { id: 'reports', Icon: IconReports,   label: 'My Reports'   },
  { id: 'rewards', Icon: IconRewards,   label: 'My Rewards'   },
];
const NAV_ACTIVITY = [
  { id: 'notifications', Icon: () => <HiBell className="h-5 w-5" />,               label: 'Notifications' },
];
const NAV_USER = [
  { id: 'profile',  Icon: () => <HiUser className="h-5 w-5" />,                    label: 'Profile'       },
  { id: 'settings', Icon: () => <HiCog className="h-5 w-5" />,                     label: 'Settings'      },
  { id: 'help',     Icon: () => <HiQuestionMarkCircle className="h-5 w-5" />,       label: 'Help & Support'},
];

const ACTION_CARDS = [
  { id: 'report',  Illustration: IllustrationReport,    title: 'Report Waste',  sub: 'Submit a new waste report',  bg: 'from-orange-50 to-amber-50',   border: 'border-orange-100', hover: 'hover:border-orange-300 hover:shadow-orange-100' },
  { id: 'reports', Illustration: IllustrationMyReports, title: 'My Reports',    sub: 'Track your submissions',     bg: 'from-blue-50 to-sky-50',        border: 'border-blue-100',   hover: 'hover:border-blue-300 hover:shadow-blue-100'   },
  { id: 'rewards', Illustration: IllustrationRewards,   title: 'My Rewards',    sub: 'EcoPoints & achievements',   bg: 'from-yellow-50 to-lime-50',     border: 'border-yellow-100', hover: 'hover:border-yellow-300 hover:shadow-yellow-100' },
];

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const user     = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab,           setTab]           = useState('home');
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [collapsed,     setCollapsed]     = useState(false);
  const [reportOpen,    setReportOpen]    = useState(false);
  const [recentReports, setRecentReports] = useState([]);

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); };

  const handleReportSuccess = (report) => {
    setRecentReports(r => [report, ...r]);
    toast.success('Waste report submitted successfully!');
  };

  const handleCardClick = (id) => {
    if (id === 'report')  { setReportOpen(true); return; }
    if (id === 'reports') { setTab('reports'); return; }
    if (id === 'rewards') { setTab('rewards'); return; }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const sideW = collapsed ? 'lg:w-20' : 'lg:w-64';
  const mainML = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  return (
    <div className="min-h-screen bg-[#F4FBF6]" style={{ backgroundImage: 'radial-gradient(circle, #d1fae5 1px, transparent 1px)', backgroundSize: '28px 28px' }}>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col bg-white border-r border-gray-100 shadow-lg
        transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
        lg:translate-x-0 ${sideW}
      `}>
        <div className={`h-16 flex items-center border-b border-gray-100 shrink-0 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 lg:w-auto lg:opacity-100' : ''}`}>
            <EcoLoopLogo height={38} />
          </div>
          <button onClick={() => setCollapsed(c => !c)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition shrink-0">
            <HiMenu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-hidden overflow-y-auto">
          <p className={`text-xs font-semibold text-slate-400 px-3 mb-1 uppercase tracking-wider transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>Main</p>
          {NAV_MAIN.map(({ id, Icon, label }) => (
            <button key={id} onClick={() => { if (id === 'report') { setReportOpen(true); setMobileOpen(false); } else { setTab(id); setMobileOpen(false); } }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                tab === id ? 'bg-green-50 text-green-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${tab === id ? 'text-green-600' : ''}`}><Icon /></span>
              <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
              {tab === id && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />}
            </button>
          ))}

          <div className={`pt-3 transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs font-semibold text-slate-400 px-3 mb-1 uppercase tracking-wider">Activity</p>
          </div>
          {NAV_ACTIVITY.map(({ id, Icon, label }) => (
            <button key={id} onClick={() => { setTab(id); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                tab === id ? 'bg-green-50 text-green-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${tab === id ? 'text-green-600' : ''}`}><Icon /></span>
              <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
            </button>
          ))}

          <div className={`pt-3 transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs font-semibold text-slate-400 px-3 mb-1 uppercase tracking-wider">Account</p>
          </div>
          {NAV_USER.map(({ id, Icon, label }) => (
            <button key={id}
              onClick={() => { if (id === 'profile') { navigate('/citizen/profile'); } else { setTab(id); setMobileOpen(false); } }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                tab === id ? 'bg-green-50 text-green-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${tab === id ? 'text-green-600' : ''}`}><Icon /></span>
              <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 shrink-0">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 transition group"
            title={collapsed ? 'Sign Out' : undefined}>
            <HiLogout className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ease-in-out ${mainML} flex flex-col min-h-screen`}>
        <header className="h-16 bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-4 shadow-sm">
          <button onClick={() => setMobileOpen(o => !o)}
            className="flex items-center justify-center h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-green-600 transition lg:hidden">
            {mobileOpen ? <HiX className="h-5 w-5" /> : <HiMenu className="h-5 w-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{greeting}, {user.name || 'Citizen'}</p>
            <p className="text-xs text-slate-400">Citizen Dashboard</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
            {(user.name || 'C')[0].toUpperCase()}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ACTION_CARDS.map(({ id, Illustration, title, sub, bg, border, hover }) => (
                  <button key={id} onClick={() => handleCardClick(id)}
                    className={`group relative flex items-center gap-4 rounded-2xl border bg-gradient-to-br ${bg} ${border} p-4 sm:p-5 text-left shadow-sm hover:shadow-lg ${hover} transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]`}>
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

              {recentReports.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Recent Reports</h3>
                    <button onClick={() => navigate('/my-reports')} className="text-xs text-green-600 hover:underline font-medium">View all →</button>
                  </div>
                  <div className="space-y-3">
                    {recentReports.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-green-50 transition">
                        <div className="h-9 w-9 shrink-0 rounded-xl bg-orange-100 flex items-center justify-center">
                          <IllustrationReport />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{r.wasteType}</p>
                          <p className="text-xs text-slate-400 truncate">{r.location?.displayAddress || r.location?.address}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0 font-medium">Submitted</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Reports Submitted', value: recentReports.length, color: 'text-green-600' },
                  { label: 'Resolved',           value: 0,                   color: 'text-blue-600'  },
                  { label: 'EcoPoints',          value: recentReports.length * 10, color: 'text-yellow-600' },
                  { label: 'Streak (days)',      value: 1,                   color: 'text-purple-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center hover:shadow-md transition">
                    <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">My Reports</h2>
                <button onClick={() => navigate('/my-reports')} className="text-sm text-green-600 hover:underline font-medium">Full page →</button>
              </div>
              <button onClick={() => setReportOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-green-200 transition active:scale-[0.98]">
                <IllustrationReport />
                Report New Waste
              </button>
              {recentReports.length === 0
                ? <div className="text-center py-12 text-slate-400 text-sm">No reports yet. Submit your first report above.</div>
                : recentReports.map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-50 flex items-center justify-center">
                        <IllustrationReport />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{r.wasteType}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.description}</p>
                        <p className="text-xs text-slate-400 mt-1 truncate">{r.location?.displayAddress || r.location?.address}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0 font-medium">Submitted</span>
                    </div>
                  ))
              }
            </div>
          )}

          {tab === 'rewards' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-800">My Rewards</h2>
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

        </main>
      </div>

      <ReportWasteModal isOpen={reportOpen} onClose={() => setReportOpen(false)} onSuccess={handleReportSuccess} />
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default CitizenDashboard;
