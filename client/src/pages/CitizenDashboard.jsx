import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiLogout, HiMenu, HiX, HiHome, HiClipboardList,
  HiStar, HiCollection, HiChevronRight,
} from 'react-icons/hi';
import { MdOutlineReportProblem } from 'react-icons/md';
import EcoLoopLogo from '../components/EcoLoopLogo';
import ReportWasteModal from '../components/ReportWasteModal';
import { ToastContainer, useToast } from '../components/Toast';

const NAV = [
  { id: 'home',    icon: HiHome,          label: 'Dashboard'    },
  { id: 'reports', icon: HiClipboardList, label: 'My Reports'   },
  { id: 'rewards', icon: HiStar,          label: 'My Rewards'   },
];

const CitizenDashboard = () => {
  const navigate  = useNavigate();
  const { toasts, toast, remove } = useToast();
  const user      = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab,        setTab]        = useState('home');
  const [sideOpen,   setSideOpen]   = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [recentReports, setRecentReports] = useState([]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleReportSuccess = (report) => {
    setRecentReports(r => [report, ...r]);
    toast.success('Waste report submitted successfully!');
  };

  const firstName = user.name?.split(' ')[0] || 'Citizen';

  return (
    <div className="min-h-screen bg-[#F7FDF8] flex flex-col">

      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6 gap-3">
        <button onClick={() => setSideOpen(o => !o)} className="text-slate-500 hover:text-green-600 transition lg:hidden">
          {sideOpen ? <HiX className="h-6 w-6" /> : <HiMenu className="h-6 w-6" />}
        </button>
        <EcoLoopLogo height={32} />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:block text-sm text-slate-500">
            Welcome, <span className="font-semibold text-slate-800">{firstName}</span>
          </span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition">
            <HiLogout className="h-5 w-5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <aside className={`${sideOpen ? 'w-56' : 'w-0 lg:w-56'} transition-all duration-300 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden`}>
          <nav className="flex-1 py-4 px-3 space-y-1">
            {NAV.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => { setTab(id); setSideOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  tab === id ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {tab === 'home' && (
            <>
              <div className="bg-gradient-to-r from-[#16A34A] to-[#22C55E] rounded-2xl p-5 sm:p-6 text-white shadow-md">
                <p className="text-sm opacity-80">Good day,</p>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-0.5">{user.name || 'Citizen'}</h2>
                <p className="text-sm opacity-75 mt-1">Help keep your city clean. Report waste around you.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => setReportOpen(true)}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md hover:border-green-200 transition group text-left">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition">
                    <MdOutlineReportProblem className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Report Waste</p>
                    <p className="text-xs text-slate-400 mt-0.5">Submit a new waste report</p>
                  </div>
                  <HiChevronRight className="h-5 w-5 text-slate-300 ml-auto group-hover:text-green-500 transition" />
                </button>

                <button onClick={() => setTab('reports')}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md hover:border-green-200 transition group text-left">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition">
                    <HiClipboardList className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">My Reports</p>
                    <p className="text-xs text-slate-400 mt-0.5">View submitted reports</p>
                  </div>
                  <HiChevronRight className="h-5 w-5 text-slate-300 ml-auto group-hover:text-green-500 transition" />
                </button>

                <button onClick={() => setTab('rewards')}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md hover:border-green-200 transition group text-left">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200 transition">
                    <HiStar className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">My Rewards</p>
                    <p className="text-xs text-slate-400 mt-0.5">EcoPoints earned</p>
                  </div>
                  <HiChevronRight className="h-5 w-5 text-slate-300 ml-auto group-hover:text-green-500 transition" />
                </button>
              </div>

              {recentReports.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">Recent Reports</h3>
                    <button onClick={() => navigate('/my-reports')} className="text-xs text-green-600 hover:underline">View all</button>
                  </div>
                  <div className="space-y-3">
                    {recentReports.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                          <HiCollection className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{r.wasteType}</p>
                          <p className="text-xs text-slate-400 truncate">{r.location?.address}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">My Reports</h2>
                <button onClick={() => navigate('/my-reports')}
                  className="text-sm text-green-600 hover:underline font-medium">View full page</button>
              </div>
              <button onClick={() => setReportOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 transition shadow-sm">
                <MdOutlineReportProblem className="h-5 w-5" />
                Report New Waste
              </button>
              {recentReports.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">No reports yet. Submit your first report above.</p>
                : recentReports.map((r, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                        <HiCollection className="h-5 w-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{r.wasteType}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.description}</p>
                        <p className="text-xs text-slate-400 mt-1 truncate">{r.location?.address}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">Pending</span>
                    </div>
                  ))
              }
            </div>
          )}

          {tab === 'rewards' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-800">My Rewards</h2>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl p-5 text-white shadow-md">
                <p className="text-sm opacity-80">Total EcoPoints</p>
                <p className="text-4xl font-extrabold mt-1">0</p>
                <p className="text-xs opacity-75 mt-1">Start reporting waste to earn points!</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800 mb-3">How to earn points</p>
                <div className="space-y-2">
                  {[
                    { action: 'Submit a waste report', pts: '+10 pts' },
                    { action: 'Report gets resolved',  pts: '+15 pts' },
                    { action: 'Weekly active user',    pts: '+5 pts'  },
                  ].map(({ action, pts }) => (
                    <div key={action} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{action}</span>
                      <span className="font-semibold text-green-600">{pts}</span>
                    </div>
                  ))}
                </div>
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
