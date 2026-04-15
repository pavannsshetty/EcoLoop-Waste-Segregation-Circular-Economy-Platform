import { useState, useEffect, useRef, useCallback } from 'react';
import { HiBell, HiX, HiCheckCircle, HiClipboardList, HiRefresh, HiThumbUp, HiExclamation } from 'react-icons/hi';

const TYPE_ICONS = { report: HiClipboardList, status: HiRefresh, support: HiThumbUp, delay: HiExclamation, system: HiBell };

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';

const NotificationBell = () => {
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
      const res = await fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setUnread(d.count); }
    } catch { }
  }, [token]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
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
        setNotifications(prev => [newNotification, ...prev]);
        setUnread(prev => prev + 1);
        // Optional: show a toast or sound here
      };

      const handleReportCreated = (report) => {
        // Only for collectors - we can check user role if needed, 
        // but simple notification message is fine
        const notif = {
          _id: Date.now().toString(), // Temp ID
          title: 'New Waste Reported',
          message: `A new ${report.wasteType} report was submitted nearby.`,
          type: 'report',
          createdAt: new Date(),
          isRead: false
        };
        setNotifications(prev => [notif, ...prev]);
        setUnread(prev => prev + 1);
      };

      socket.on('notification', handleNotification);
      socket.on('report_created', handleReportCreated);

      return () => {
        socket.off('notification', handleNotification);
        socket.off('report_created', handleReportCreated);
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

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/read/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(u => Math.max(0, u - 1));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-green-600 transition">
        <HiBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-16 sm:top-12 sm:w-[400px] rounded-sm shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-300 ${
          dark ? 'bg-black/90 border border-gray-800' : 'bg-white border border-slate-100'
        }`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-gray-800' : 'border-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${dark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                <HiBell className="h-4 w-4" />
              </div>
              <div>
                <span className={`text-sm font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>Notifications</span>
                {unread > 0 && <p className="text-[10px] text-green-500 uppercase tracking-widest">{unread} unread messages</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] uppercase tracking-widest text-green-600 hover:text-green-700 transition-colors">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <HiX className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${dark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <HiBell className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400">All caught up! No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-gray-800">
                {notifications.map(n => {
                  const Icon = TYPE_ICONS[n.type] || HiBell;
                  return (
                    <button key={n._id} onClick={() => markRead(n._id)}
                      className={`w-full flex items-start gap-4 px-6 py-4 text-left transition relative group overflow-hidden ${
                        !n.isRead 
                          ? dark ? 'bg-green-500/5 hover:bg-green-500/10' : 'bg-green-50/50 hover:bg-green-50' 
                          : dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}>
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 ${
                        !n.isRead 
                          ? dark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                          : dark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-bold tracking-tight truncate ${!n.isRead ? (dark ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{n.title}</p>
                          {!n.isRead && <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-2">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`px-6 py-3 border-t text-center ${dark ? 'bg-white/5 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
            <button onClick={() => { setOpen(false); window.location.href = '/citizen/notifications'; }}
              className="text-[10px] uppercase tracking-widest text-green-600 hover:text-green-700 transition-colors">View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
