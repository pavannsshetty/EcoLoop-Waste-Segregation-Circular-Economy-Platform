import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HiLogout,
  HiMenu,
  HiX,
  HiCog,
  HiUser,
  HiMap,
  HiChartBar,
  HiClipboardList,
  HiCheckCircle,
  HiCollection,
  HiMoon,
  HiSun,
} from 'react-icons/hi';
import EcoLoopLogo from '../components/EcoLoopLogo';
import NotificationBell from '../components/NotificationBell';
import DarkBg from '../components/DarkBg';
import { ToastContainer, useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const NAV_MAIN = [
  { path: '/collector/dashboard', Icon: IconDashboard, label: 'Dashboard' },
  { path: '/collector/assigned', Icon: () => <HiClipboardList className="h-5 w-5" />, label: 'Assigned Reports' },
  { path: '/collector/tasks', Icon: () => <HiCollection className="h-5 w-5" />, label: 'My Tasks' },
  { path: '/collector/completed', Icon: () => <HiCheckCircle className="h-5 w-5" />, label: 'Completed' },
];
const NAV_FIELD = [
  { path: '/collector/nearby', Icon: () => <HiMap className="h-5 w-5" />, label: 'Nearby Issues' },
  { path: '/collector/performance', Icon: () => <HiChartBar className="h-5 w-5" />, label: 'Performance' },
];
const NAV_ACCOUNT = [
  { path: '/collector/profile', Icon: () => <HiUser className="h-5 w-5" />, label: 'Profile' },
  { path: '/collector/settings', Icon: () => <HiCog className="h-5 w-5" />, label: 'Settings' },
];

const NavItem = ({ item, collapsed, dark, onClick }) => {
  const location = useLocation();
  const active = location.pathname === item.path;
  return (
    <button
      type="button"
      onClick={() => onClick(item.path)}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
        active
          ? dark
            ? 'bg-green-900/40 text-green-400'
            : 'bg-green-50 text-green-700'
          : dark
            ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-green-500' : ''}`}>
        <item.Icon />
      </span>
      <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
      {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />}
    </button>
  );
};

const CollectorLayout = () => {
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const { dark, toggleDark } = useTheme();
  const { user: ctxUser, clearUser } = useUser();
  const user = ctxUser || JSON.parse(localStorage.getItem('user') || '{}');

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const sideW = collapsed ? 'lg:w-20' : 'lg:w-64';
  const mainML = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  const logout = () => {
    clearUser();
    navigate('/');
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarBg = dark ? 'bg-black/80 border-gray-800' : 'bg-white border-gray-100';
  const headerBg = dark ? 'bg-black/80 border-gray-800' : 'bg-white/90 border-gray-100';
  const sectionLbl = dark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div
      className="min-h-screen relative"
      style={
        dark
          ? { background: '#000000' }
          : {
              backgroundColor: '#F4FBF6',
              backgroundImage: 'radial-gradient(circle, #d1fae5 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }
      }
    >
      {dark && <DarkBg />}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col border-r shadow-lg transition-all duration-300 ease-in-out ${sidebarBg} ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
        } lg:translate-x-0 ${sideW}`}
      >
        <div
          className={`h-16 flex items-center border-b shrink-0 px-4 ${dark ? 'border-gray-800' : 'border-gray-100'} ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div
            className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${
              collapsed ? 'w-0 opacity-0 lg:w-auto lg:opacity-100' : ''
            }`}
          >
            <EcoLoopLogo height={38} dark={dark} />
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${sectionLbl} hidden sm:inline`}>Collector</span>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`hidden lg:flex items-center justify-center h-8 w-8 rounded-lg transition shrink-0 ${
              dark ? 'text-slate-500 hover:bg-white/10 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <HiMenu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className={`text-xs font-semibold px-3 mb-1 uppercase tracking-wider ${collapsed ? 'lg:hidden' : ''} ${sectionLbl}`}>Main</p>
          {NAV_MAIN.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} dark={dark} onClick={handleNav} />
          ))}

          <div className={`pt-3 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className={`text-xs font-semibold px-3 mb-1 uppercase tracking-wider ${sectionLbl}`}>Field</p>
          </div>
          {NAV_FIELD.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} dark={dark} onClick={handleNav} />
          ))}

          <div className={`pt-3 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className={`text-xs font-semibold px-3 mb-1 uppercase tracking-wider ${sectionLbl}`}>Account</p>
          </div>
          {NAV_ACCOUNT.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} dark={dark} onClick={handleNav} />
          ))}
        </nav>

        <div className={`p-3 border-t shrink-0 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <button
            type="button"
            onClick={logout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition group ${
              dark ? 'text-slate-400 hover:bg-red-900/30 hover:text-red-400' : 'text-slate-500 hover:bg-red-50 hover:text-red-500'
            }`}
          >
            <HiLogout className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className={`relative z-10 transition-all duration-300 ease-in-out ${mainML} flex flex-col min-h-screen`}>
        <header
          className={`h-16 backdrop-blur-sm border-b sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-4 shadow-sm ${headerBg}`}
        >
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className={`flex items-center justify-center h-9 w-9 rounded-xl transition lg:hidden ${
              dark ? 'text-slate-400 hover:bg-white/10 hover:text-green-400' : 'text-slate-500 hover:bg-slate-100 hover:text-green-600'
            }`}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <HiX className="h-5 w-5" /> : <HiMenu className="h-5 w-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
              {greeting}, {user.name || 'Collector'}
            </p>
            <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              {user.collectorId ? `ID ${user.collectorId}` : 'Collector Dashboard'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className={`flex items-center justify-center h-9 w-9 rounded-xl transition ${
              dark ? 'text-yellow-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
          </button>
          <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              (user.name || 'C')[0].toUpperCase()
            )}
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ toast, dark }} />
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default CollectorLayout;
