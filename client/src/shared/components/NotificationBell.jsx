import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiBell, HiX, HiCheckCircle, HiClipboardList, HiRefresh, HiThumbUp, HiExclamation, HiClock, HiHome, HiShoppingCart, HiSparkles, HiStar } from 'react-icons/hi';
import { MdRecycling, MdWarning, MdEmojiEvents } from 'react-icons/md';
import { FaTrophy } from 'react-icons/fa';
import { API } from '../constants';

const TYPE_META = {
  report:       { Icon: HiClipboardList, color: 'text-green-600', bg: 'bg-green-100' },
  status:       { Icon: HiRefresh,       color: 'text-blue-600',  bg: 'bg-blue-100'  },
  support:      { Icon: HiThumbUp,       color: 'text-purple-600',bg: 'bg-purple-100' },
  escalation:   { Icon: MdWarning,       color: 'text-red-600',   bg: 'bg-red-100'   },
  delay:        { Icon: HiClock,         color: 'text-orange-600',bg: 'bg-orange-100' },
  pickup:       { Icon: HiHome,          color: 'text-teal-600',  bg: 'bg-teal-100'  },
  scrap:        { Icon: MdRecycling,     color: 'text-emerald-600',bg: 'bg-emerald-100'},
  reward:       { Icon: HiStar,          color: 'text-yellow-600',bg: 'bg-yellow-100' },
  order:        { Icon: HiShoppingCart,  color: 'text-indigo-600',bg: 'bg-indigo-100' },
  'Eco Events': { Icon: HiSparkles,      color: 'text-purple-600',bg: 'bg-purple-100' },
  'Emergency Alerts': { Icon: MdWarning, color: 'text-red-600',   bg: 'bg-red-100'   },
  'Reward Bonus Events': { Icon: FaTrophy, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  System:       { Icon: HiBell,          color: 'text-slate-600', bg: 'bg-slate-100'  },
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

import { useSocket } from '../context/SocketContext';
import { parseStoredUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

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

const NotificationBell = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [open,         setOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,       setUnread]       = useState(0);
  const [loading,      setLoading]      = useState(false);
  const panelRef = useRef(null);
  const { socket } = useSocket();

  const token = localStorage.getItem('token');

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setUnread(d.count); }
    } catch { }
  }, [token]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch { }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (socket) {
      const handleNotification = (newNotification) => {
        const userId = parseStoredUser()._id;
        const localUnread = newNotification.unreadCount !== undefined
          ? newNotification.unreadCount
          : (prev) => prev + 1;
        setNotifications(prev => {
          if (prev.some(n => n._id === newNotification._id)) return prev;
          return [{ ...newNotification, isRead: newNotification.isRead ?? (newNotification.readBy || []).includes(userId) }, ...prev];
        });
        if (typeof localUnread === 'number') setUnread(localUnread);
        else setUnread(prev => prev + 1);
      };

      socket.on('notification', handleNotification);

      return () => {
        socket.off('notification', handleNotification);
      };
    }
  }, [socket]);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (n) => {
    if (!n.isRead) {
      try {
        await fetch(`${API}/api/notifications/read/${n._id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
        setNotifications(ns => ns.map(x => x._id === n._id ? { ...x, isRead: true } : x));
        setUnread(u => Math.max(0, u - 1));
      } catch { }
    }
    const navPath = n.reportId ? TYPE_NAV[n.type] || TYPE_NAV.report : TYPE_NAV[n.type];
    if (navPath) navigate(navPath);
    setOpen(false);
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(o => !o)}
        className={`relative flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
          open
            ? (dark ? 'bg-white/10 text-green-400' : 'bg-green-50 text-green-600')
            : (dark ? 'text-slate-400 hover:bg-white/10 hover:text-green-400' : 'text-slate-500 hover:bg-slate-100 hover:text-green-600')
        }`}>
        <HiBell className="h-5 w-5 transition-all duration-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-[14px] min-w-[14px] rounded-full bg-red-400/80 text-white text-[8px] font-semibold flex items-center justify-center px-[3px] leading-none">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-16 sm:top-12 sm:w-[400px] rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-300 ${
          dark ? 'bg-[#0A0A0A] border border-gray-800' : 'bg-white border border-slate-100'
        }`}>
          <div className={`flex items-center justify-between px-5 max-md:px-3 py-4 max-md:py-3 border-b ${dark ? 'border-gray-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 max-md:h-7 max-md:w-7 rounded-lg flex items-center justify-center ${dark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                <HiBell className="h-4 w-4" />
              </div>
              <div>
                <span className={`text-sm max-md:text-xs font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>Notifications</span>
                {unread > 0 && <p className="text-[10px] text-green-500 uppercase tracking-widest font-semibold">{unread} new</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] uppercase tracking-widest font-bold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} className={`p-1.5 rounded-lg transition ${dark ? 'text-slate-500 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
                <HiX className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] max-md:max-h-[320px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12 max-md:py-8">
                <div className="h-6 w-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-14 max-md:py-8 flex flex-col items-center gap-3">
                <div className={`h-14 w-14 max-md:h-10 max-md:w-10 rounded-2xl flex items-center justify-center ${dark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <HiBell className="h-7 w-7 max-md:h-5 max-md:w-5 text-slate-300" />
                </div>
                <div>
                  <p className={`text-sm max-md:text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>All caught up!</p>
                  <p className="text-xs text-slate-400 mt-0.5">No notifications yet.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-gray-800/50">
                {notifications.map(n => {
                  const meta = TYPE_META[n.type] || TYPE_META.System;
                  return (
                    <button key={n._id} onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-5 max-md:px-3 py-4 max-md:py-3 text-left transition relative group ${
                        !n.isRead 
                          ? dark ? 'bg-green-500/[0.04] hover:bg-green-500/[0.08]' : 'bg-green-50/40 hover:bg-green-50' 
                          : dark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'
                      }`}>
                      <div className={`h-9 w-9 max-md:h-8 max-md:w-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 ${!n.isRead ? meta.bg : (dark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                        <meta.Icon className={`h-4 w-4 max-md:h-3.5 max-md:w-3.5 ${!n.isRead ? meta.color : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs max-md:text-[11px] font-bold truncate ${!n.isRead ? (dark ? 'text-white' : 'text-slate-900') : (dark ? 'text-slate-400' : 'text-slate-500')}`}>{n.title}</p>
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />}
                        </div>
                        <p className={`text-xs max-md:text-[11px] mt-0.5 leading-relaxed line-clamp-2 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>{n.message || n.description}</p>
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-1.5 font-medium">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`px-5 py-3 border-t ${dark ? 'bg-white/[0.02] border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
            <button onClick={() => { setOpen(false); navigate('/citizen/notifications'); }}
              className="w-full py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-white/5 transition-colors">View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
