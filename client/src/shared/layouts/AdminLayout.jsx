import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HiLogout, HiMenu, HiX, HiChartBar, HiUserAdd, HiUsers, HiBadgeCheck, HiClipboardCheck, HiDocumentText, HiGlobe, HiHome, HiShoppingCart, HiSpeakerphone, HiClock, HiCog, HiSun, HiMoon } from 'react-icons/hi';
import EcoLoopLogo from '../components/EcoLoopLogo';
import DarkBg from '../components/DarkBg';
import { ToastContainer, useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

const SECTIONS = [
  {
    title: 'MANAGEMENT',
    items: [
      { path: '/admin/dashboard',       Icon: () => <HiChartBar className="h-5 w-5" />,       label: 'Dashboard' },
      { path: '/admin/add-collector',   Icon: () => <HiUserAdd className="h-5 w-5" />,        label: 'Add Collector' },
      { path: '/admin/view-collectors', Icon: () => <HiUsers className="h-5 w-5" />,           label: 'View Collectors' },
    ],
  },
  {
    title: 'COMMUNITY',
    items: [
      { path: '/admin/green-champions',   Icon: () => <HiBadgeCheck className="h-5 w-5" />,    label: 'Green Champions' },
      { path: '/admin/champion-requests', Icon: () => <HiClipboardCheck className="h-5 w-5" />,label: 'Champion Requests' },
      { path: '/admin/approval-requests', Icon: () => <HiDocumentText className="h-5 w-5" />,  label: 'Approval Requests' },
    ],
  },
  {
    title: 'WASTE MANAGEMENT',
    items: [
      { path: '/admin/reports',             Icon: () => <HiGlobe className="h-5 w-5" />,       label: 'Public Waste Reports' },
      { path: '/admin/home-pickup-requests',Icon: () => <HiHome className="h-5 w-5" />,        label: 'Home Pickup Requests' },
    ],
  },
  {
    title: 'MARKETPLACE',
    items: [
      { path: '/admin/eco-shopping', Icon: () => <HiShoppingCart className="h-5 w-5" />,       label: 'Eco Shopping' },
      { path: '/admin/eco-shopping/buyers', Icon: () => <HiUsers className="h-5 w-5" />,         label: 'Eco Product Buyers' },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { path: '/admin/broadcast',         Icon: () => <HiSpeakerphone className="h-5 w-5" />,  label: 'Broadcast Center' },
      { path: '/admin/broadcast-history', Icon: () => <HiClock className="h-5 w-5" />,         label: 'Broadcast History' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { path: '/admin/settings', Icon: () => <HiCog className="h-5 w-5" />,                    label: 'Settings' },
    ],
  },
];

const NavItem = ({ item, collapsed, dark, onClick }) => {
  const location = useLocation();
  const active = location.pathname === item.path;
  return (
    <button onClick={() => onClick(item.path)}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${
        active
          ? dark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-700'
          : dark ? 'text-slate-400 hover:bg-white/5 hover:text-slate-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}>
      <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-green-500' : ''}`}>
        <item.Icon />
      </span>
      <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
      {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />}
    </button>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const { dark, toggleDark } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin');
  }, [navigate]);

  const sideW = collapsed ? 'lg:w-[72px]' : 'lg:w-64';
  const mainML = collapsed ? 'lg:ml-[72px]' : 'lg:ml-64';

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    toast.success('Logged out!');
    setTimeout(() => navigate('/admin'), 1500);
  };

  const handleNav = (path) => { navigate(path); setMobileOpen(false); };

  const sidebarBg = dark ? 'bg-[#0a0a0a]/95 border-white/[0.06]' : 'bg-white border-slate-200';
  const headerBg = dark ? 'bg-[#0a0a0a]/80 border-white/[0.06]' : 'bg-white/90 border-slate-200';

  return (
    <div className={`min-h-screen relative ${dark ? 'bg-black' : 'bg-[#F4FBF6]'}`}>
      {dark && <DarkBg />}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full z-50 flex flex-col border-r shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${sidebarBg} ${
        mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
      } lg:translate-x-0 ${sideW}`}>
        <div className={`h-16 flex items-center border-b shrink-0 px-4 ${dark ? 'border-white/[0.06]' : 'border-slate-200'} ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${collapsed ? 'lg:w-0 lg:opacity-0' : ''}`}>
            <EcoLoopLogo height={36} dark={dark} />
          </div>
          <button type="button" onClick={() => setCollapsed(c => !c)}
            className={`hidden lg:flex items-center justify-center h-8 w-8 rounded-lg transition shrink-0 ${
              dark ? 'text-slate-600 hover:bg-white/[0.06] hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}>
            <HiMenu className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className={`px-3 text-[10px] font-bold tracking-widest uppercase ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                  {section.title}
                </p>
              )}
              <div className={`mt-1.5 space-y-0.5 ${collapsed ? 'space-y-1' : ''}`}>
                {section.items.map(i => <NavItem key={i.path} item={i} collapsed={collapsed} dark={dark} onClick={handleNav} />)}
              </div>
            </div>
          ))}
        </nav>

        <div className={`p-2 border-t shrink-0 ${dark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <button type="button" onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
              dark ? 'text-slate-400 hover:bg-red-900/20 hover:text-red-400' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'
            }`}>
            <HiLogout className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>Log Out</span>
          </button>
        </div>
      </aside>

      <div className={`relative z-10 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${mainML} flex flex-col min-h-screen`}>
        <header className={`h-16 backdrop-blur-md border-b sticky top-0 z-30 flex items-center px-3 sm:px-5 gap-2 sm:gap-4 shadow-sm ${headerBg}`}>
          <button onClick={() => setMobileOpen(o => !o)}
            className={`flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200 lg:hidden active:scale-90 ${
              dark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            {mobileOpen ? <HiX className="h-5 w-5" /> : <HiMenu className="h-5 w-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-sm sm:text-base font-bold tracking-tight truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
              Admin Panel
            </h1>
            <p className={`text-[9px] sm:text-[10px] uppercase tracking-widest leading-none mt-0.5 truncate ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
              EcoLoop Management
            </p>
          </div>
          <button onClick={toggleDark}
            className={`flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200 active:scale-90 ${
              dark ? 'text-yellow-400 hover:bg-white/[0.06]' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
          </button>
          <button onClick={() => navigate('/admin/settings')}
            className="h-9 w-9 rounded-xl overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
            A
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ toast, dark }} />
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default AdminLayout;
