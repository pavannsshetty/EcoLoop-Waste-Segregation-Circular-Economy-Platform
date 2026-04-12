import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HiMenu, HiX, HiLogout, HiHome, HiClipboardList, HiCheckCircle, HiChartBar, HiUser, HiCog, HiMap, HiCollection } from 'react-icons/hi';
import EcoLoopLogo from '../components/EcoLoopLogo';

const NAV = [
  { path: '/collector/dashboard',  Icon: HiHome,          label: 'Dashboard'         },
  { path: '/collector/assigned',   Icon: HiClipboardList, label: 'Assigned Reports'  },
  { path: '/collector/tasks',      Icon: HiCollection,    label: 'My Tasks'          },
  { path: '/collector/completed',  Icon: HiCheckCircle,   label: 'Completed'         },
  { path: '/collector/nearby',     Icon: HiMap,           label: 'Nearby Issues'     },
  { path: '/collector/performance',Icon: HiChartBar,      label: 'Performance'       },
  { path: '/collector/profile',    Icon: HiUser,          label: 'Profile'           },
  { path: '/collector/settings',   Icon: HiCog,           label: 'Settings'          },
];

const CollectorLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800 shrink-0">
          <EcoLoopLogo height={32} dark />
          <span className="text-xs text-slate-500 ml-1">Collector</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto [scrollbar-width:none]">
          {NAV.map(({ path, Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button key={path} onClick={() => { navigate(path); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition group ${active ? 'bg-green-900/40 text-green-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-green-500' : ''}`} />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 shrink-0">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition">
            <HiLogout className="h-5 w-5 shrink-0" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-4">
          <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-white transition lg:hidden">
            {open ? <HiX className="h-6 w-6" /> : <HiMenu className="h-6 w-6" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{user.name || 'Collector'}</p>
            <p className="text-xs text-slate-500">{user.collectorId || 'Collector Dashboard'}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(user.name || 'C')[0].toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CollectorLayout;
