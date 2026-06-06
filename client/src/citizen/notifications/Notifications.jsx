import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiBell, HiRefresh, HiClipboardList, HiThumbUp, HiExclamation, HiClock, HiHome, HiShoppingCart, HiSparkles, HiStar } from 'react-icons/hi';
import { MdRecycling, MdWarning, MdEmojiEvents } from 'react-icons/md';
import { FaTrophy } from 'react-icons/fa';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';

const TYPE_META = {
  report:       { Icon: HiClipboardList, bg: 'bg-green-100 text-green-700', color: 'text-green-600' },
  status:       { Icon: HiRefresh,       bg: 'bg-blue-100 text-blue-700',   color: 'text-blue-600'  },
  support:      { Icon: HiThumbUp,       bg: 'bg-purple-100 text-purple-700',color: 'text-purple-600' },
  escalation:   { Icon: MdWarning,       bg: 'bg-red-100 text-red-700',     color: 'text-red-600'   },
  delay:        { Icon: HiClock,         bg: 'bg-orange-100 text-orange-700',color: 'text-orange-600' },
  pickup:       { Icon: HiHome,          bg: 'bg-teal-100 text-teal-700',   color: 'text-teal-600'  },
  scrap:        { Icon: MdRecycling,     bg: 'bg-emerald-100 text-emerald-700',color: 'text-emerald-600'},
  reward:       { Icon: HiStar,          bg: 'bg-yellow-100 text-yellow-700',color: 'text-yellow-600' },
  order:        { Icon: HiShoppingCart,  bg: 'bg-indigo-100 text-indigo-700',color: 'text-indigo-600' },
  'Eco Events': { Icon: HiSparkles,      bg: 'bg-purple-100 text-purple-700',color: 'text-purple-600' },
  'Emergency Alerts': { Icon: MdWarning, bg: 'bg-red-100 text-red-700',     color: 'text-red-600'   },
  'Reward Bonus Events': { Icon: FaTrophy, bg: 'bg-yellow-100 text-yellow-700',color: 'text-yellow-600' },
  System:       { Icon: HiBell,          bg: 'bg-slate-100 text-slate-600', color: 'text-slate-600'  },
};

const TYPE_NAV = {
  report:     '/citizen/public-reports',
  status:     '/citizen/public-reports',
  support:    '/citizen/nearby-issues',
  escalation: '/citizen/public-reports',
  delay:      '/citizen/public-reports',
  pickup:     '/citizen/home-reports',
  scrap:      '/citizen/scrap-requests',
  reward:     '/citizen/my-rewards',
  order:      '/citizen/eco-shopping',
};

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const Notifications = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const token    = localStorage.getItem('token');
  const [notifications, setNotifications] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleClick = async (n) => {
    if (!n.isRead) {
      try {
        await fetch(`${API}/api/notifications/read/${n._id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
        setNotifications(ns => ns.map(x => x._id === n._id ? { ...x, isRead: true } : x));
      } catch { }
    }
    const navPath = n.reportId ? (TYPE_NAV[n.type] || TYPE_NAV.report) : TYPE_NAV[n.type];
    if (navPath) navigate(navPath);
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
    } catch { }
  };

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : filter === 'read'
      ? notifications.filter(n => n.isRead)
      : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200','text-slate-800')}`}>Notifications</h1>
          <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400','text-slate-500')}`}>Stay updated on your recent activity</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs font-bold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors">Mark all read</button>
          )}
          <button onClick={fetchAll} className={`p-1.5 rounded-lg transition ${dk('text-slate-400 hover:bg-white/10 hover:text-green-400','text-slate-400 hover:bg-slate-100 hover:text-green-600')}`}>
            <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

        <div className={`flex items-center gap-1.5 rounded-xl border p-1.5 w-full sm:w-fit flex-wrap transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
          {[['all', 'All'], ['unread', 'Unread'], ['read', 'Read']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-4 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition ${filter === val ? 'bg-green-600 text-white shadow-sm' : dk('text-slate-400 hover:text-slate-200','text-slate-500 hover:text-slate-700')}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${dk('bg-white/5','bg-slate-50')}`}>
              <HiBell className="h-7 w-7 text-slate-300" />
            </div>
            <div>
              <p className={`text-sm font-bold ${dk('text-slate-300','text-slate-600')}`}>No notifications found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try a different filter.</p>
            </div>
          </div>
        ) : (
          filtered.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.System;
            return (
              <button key={n._id} onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 sm:gap-4 rounded-xl border p-3.5 sm:p-4 text-left transition-all duration-200 hover:shadow-sm ${
                  !n.isRead
                    ? dk('bg-green-500/[0.04] border-green-800/50 hover:bg-green-500/[0.08]','bg-green-50/60 border-green-200 hover:bg-green-50')
                    : dk('bg-white/5 border-gray-800 hover:bg-white/10','bg-white border-slate-200 hover:bg-slate-50')
                }`}>
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg ${!n.isRead ? meta.bg : (dk('bg-white/5 text-slate-500','bg-slate-100 text-slate-400'))}`}>
                  <meta.Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-bold ${!n.isRead ? dk('text-slate-100','text-slate-900') : dk('text-slate-400','text-slate-500')}`}>{n.title}</p>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${dk('text-slate-400','text-slate-500')}`}>{n.message || n.description}</p>
                  <p className={`text-xs mt-1.5 font-medium ${dk('text-slate-500','text-slate-400')}`}>{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            );
          })
        )}
    </div>
  );
};

export default Notifications;
