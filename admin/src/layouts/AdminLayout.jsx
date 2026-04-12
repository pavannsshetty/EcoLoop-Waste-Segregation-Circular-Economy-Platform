import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HiMenu,
  HiX,
  HiLogout,
  HiHome,
  HiUserAdd,
  HiUsers,
  HiClipboardList,
  HiCog,
  HiMoon,
  HiSun,
} from 'react-icons/hi';
import DarkBg from '../components/DarkBg';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { path: '/admin/dashboard', icon: HiHome, label: 'Dashboard' },
  { path: '/admin/add-collector', icon: HiUserAdd, label: 'Add Collector' },
  { path: '/admin/collectors', icon: HiUsers, label: 'View Collectors' },
  { path: '/admin/reports', icon: HiClipboardList, label: 'Reports' },
  { path: '/admin/settings', icon: HiCog, label: 'Settings' },
];

const NavItem = ({ path, Icon, label, collapsed, dark, onNavigate }) => {
  const location = useLocation();
  const active = location.pathname === path;
  return (
    <button
      type="button"
      onClick={() => onNavigate(path)}
      title={collapsed ? label : undefined}
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
      <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-green-500' : ''}`} />
      <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
      {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />}
    </button>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const { dark, toggleDark } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const username = localStorage.getItem('admin-user') || 'Admin';

  const sideW = collapsed ? 'lg:w-20' : 'lg:w-64';
  const mainML = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  const logout = () => {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    navigate('/admin/login');
  };

  const go = (path) => {
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
            <span className="text-2xl shrink-0">🌱</span>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${dark ? 'text-slate-100' : 'text-slate-800'}`}>EcoLoop Admin</p>
              <p className={`text-[10px] uppercase tracking-wide font-semibold ${sectionLbl}`}>Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`hidden lg:flex items-center justify-center h-8 w-8 rounded-lg transition shrink-0 ${
              dark ? 'text-slate-500 hover:bg-white/10 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            aria-label="Toggle sidebar width"
          >
            <HiMenu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className={`text-xs font-semibold px-3 mb-1 uppercase tracking-wider ${collapsed ? 'lg:hidden' : ''} ${sectionLbl}`}>
            Management
          </p>
          {NAV.map(({ path, icon, label }) => (
            <NavItem key={path} path={path} Icon={icon} label={label} collapsed={collapsed} dark={dark} onNavigate={go} />
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
            <p className={`text-sm font-semibold truncate ${dark ? 'text-slate-200' : 'text-slate-800'}`}>Welcome, {username}</p>
            <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Admin Dashboard</p>
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
            {username[0].toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
