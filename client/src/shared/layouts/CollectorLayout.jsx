import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HiLogout, HiMenu, HiX, HiCog, HiUser, HiMap, HiChartBar,
  HiClipboardList, HiCheckCircle, HiCollection, HiUserGroup,
  HiMoon, HiSun,
} from 'react-icons/hi';
import EcoLoopLogo from '../components/EcoLoopLogo';
import NotificationBell from '../components/NotificationBell';
import DarkBg from '../components/DarkBg';
import AccountRestrictionOverlay from '../components/AccountRestrictionOverlay';
import { ToastContainer, useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useUser, parseStoredUser } from '../context/UserContext';
import socket from '../../socket';

const NAV_MAIN = [
  { path: '/collector/dashboard', Icon: () => <HiChartBar className="h-5 w-5" />, label: 'Dashboard' },
  { path: '/collector/public-waste', Icon: () => <HiClipboardList className="h-5 w-5" />, label: 'Public Waste' },
  { path: '/collector/home-pickup', Icon: () => <HiCollection className="h-5 w-5" />, label: 'Home Pickup' },
  { path: '/collector/scrap-requests', Icon: () => <HiClipboardList className="h-5 w-5" />, label: 'Scrap Requests' },
  { path: '/collector/eco-deliveries', Icon: () => <HiCollection className="h-5 w-5" />, label: 'Eco Deliveries' },
  { path: '/collector/completed', Icon: () => <HiCheckCircle className="h-5 w-5" />, label: 'Completed' },
  { path: '/collector/community', Icon: () => <HiUserGroup className="h-5 w-5" />, label: 'Community Updates' },
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
  const active   = location.pathname === item.path;
  return (
    <button onClick={() => onClick(item.path)}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-sm transition-all duration-200 group ${
        active
          ? dark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-700'
          : dark ? 'text-slate-300 hover:bg-white/5 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}>
      <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-green-500' : ''}`}>
        <item.Icon />
      </span>
      <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
      {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-lg bg-green-500 shrink-0" />}
    </button>
  );
};

const CollectorLayout = () => {
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const { dark, toggleDark } = useTheme();
  const { user: ctxUser, loading: userLoading, clearUser } = useUser();
  const user = ctxUser || parseStoredUser();

  const [restriction, setRestriction] = useState(null);

  useEffect(() => {
    if (!userLoading) {
      const r = user?.role?.toLowerCase();
      if (!user || r !== 'collector') navigate('/');
    }
  }, [user, userLoading, navigate]);

  useEffect(() => {
    const stored = sessionStorage.getItem('accountRestriction');
    if (stored) setRestriction(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleSuspended = (data) => {
      const r = { type: 'suspended', ...data };
      setRestriction(r);
      sessionStorage.setItem('accountRestriction', JSON.stringify(r));
    };
    const handleDeleted = (data) => {
      const r = { type: 'deleted', ...data };
      setRestriction(r);
      sessionStorage.setItem('accountRestriction', JSON.stringify(r));
    };
    const handleReinstated = () => {
      setRestriction(null);
      sessionStorage.removeItem('accountRestriction');
    };
    socket.on('account_suspended', handleSuspended);
    socket.on('account_deleted', handleDeleted);
    socket.on('account_reinstated', handleReinstated);
    return () => {
      socket.off('account_suspended', handleSuspended);
      socket.off('account_deleted', handleDeleted);
      socket.off('account_reinstated', handleReinstated);
    };
  }, []);

  const clearUserAndLogout = () => {
    clearUser();
    setRestriction(null);
    sessionStorage.removeItem('accountRestriction');
    navigate('/');
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const sideW    = collapsed ? 'lg:w-20' : 'lg:w-64';
  const mainML   = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  const logout = () => {
    toast.success('Logged out successfully! Redirecting...');
    setTimeout(() => {
      clearUser();
      navigate('/');
    }, 2000);
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarBg  = dark ? 'bg-black/60 border-white/10' : 'bg-white border-slate-200';
  const headerBg   = dark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-slate-200';
  const sectionLbl = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className="min-h-screen relative"
      style={dark ? { background: '#000000' } : { backgroundColor: '#F4FBF6', backgroundImage: 'radial-gradient(circle, #d1fae5 1px, transparent 1px)', backgroundSize: '28px 28px' }}
    >
      {dark && <DarkBg />}

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full z-50 flex flex-col border-r shadow-lg transition-all duration-300 ease-in-out ${sidebarBg} ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} lg:translate-x-0 ${sideW} rounded-lg`}>
        <div className={`h-16 flex items-center border-b shrink-0 px-4 ${dark ? 'border-white/10' : 'border-slate-200'} ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 lg:w-auto lg:opacity-100' : ''}`}>
            <EcoLoopLogo height={38} dark={dark} />
          </div>
          <button onClick={() => setCollapsed(c => !c)}
            className={`hidden lg:flex items-center justify-center h-8 w-8 rounded-lg transition shrink-0 ${dark ? 'text-slate-500 hover:bg-white/10 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <HiMenu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className={`text-xs font-bold px-3 mb-1 uppercase tracking-wider ${collapsed ? 'lg:hidden' : ''} ${sectionLbl}`}>Main</p>
          {NAV_MAIN.map(i => <NavItem key={i.path} item={i} collapsed={collapsed} dark={dark} onClick={handleNav} />)}

          <div className={`pt-3 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className={`text-xs font-bold px-3 mb-1 uppercase tracking-wider ${sectionLbl}`}>Field</p>
          </div>
          {NAV_FIELD.map(i => <NavItem key={i.path} item={i} collapsed={collapsed} dark={dark} onClick={handleNav} />)}

          <div className={`pt-3 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className={`text-xs font-bold px-3 mb-1 uppercase tracking-wider ${sectionLbl}`}>Account</p>
          </div>
          {NAV_ACCOUNT.map(i => <NavItem key={i.path} item={i} collapsed={collapsed} dark={dark} onClick={handleNav} />)}
        </nav>

        <div className={`p-3 border-t shrink-0 ${dark ? 'border-white/10' : 'border-slate-200'}`}>
          <button onClick={logout} title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition group ${dark ? 'text-slate-300 hover:bg-red-900/30 hover:text-red-400' : 'text-slate-600 hover:bg-red-50 hover:text-red-500'}`}>
            <HiLogout className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>Log Out</span>
          </button>
        </div>
      </aside>

      <div className={`relative z-10 transition-all duration-300 ease-in-out ${mainML} flex flex-col min-h-screen`}>
        <header className={`h-16 backdrop-blur-sm border-b sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-4 shadow-sm ${headerBg}`}>
          <button onClick={() => setMobileOpen(o => !o)}
            className={`flex items-center justify-center h-9 w-9 rounded-lg transition lg:hidden ${dark ? 'text-slate-400 hover:bg-white/10 hover:text-green-400' : 'text-slate-500 hover:bg-slate-100 hover:text-green-600'}`}>
            {mobileOpen ? <HiX className="h-5 w-5" /> : <HiMenu className="h-5 w-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-base font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
              {user.name || 'Collector'}
            </h1>
            <p className={`text-[10px] uppercase tracking-widest leading-none mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              Dashboard
            </p>
          </div>
          <button onClick={toggleDark} aria-label="Toggle dark mode"
            className={`flex items-center justify-center h-9 w-9 rounded-lg transition ${dark ? 'text-yellow-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>
            {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
          </button>
          <button onClick={() => navigate('/collector/profile')}
            className="h-9 w-9 rounded-lg overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm hover:shadow-md hover:from-green-500 hover:to-green-700 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer">
            {user.profilePhoto
              ? <img src={user.profilePhoto} alt="avatar" className="h-full w-full object-cover" />
              : (user.name || 'C')[0].toUpperCase()
            }
          </button>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ toast, dark }} />
        </main>
      </div>

      {restriction && (
        <AccountRestrictionOverlay restriction={restriction} clearUser={clearUserAndLogout} dark={dark} />
      )}

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default CollectorLayout;