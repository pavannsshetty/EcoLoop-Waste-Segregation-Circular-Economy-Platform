import { useState, useEffect, useRef, useCallback } from 'react';
import { HiBell, HiX, HiCheckCircle } from 'react-icons/hi';

const TYPE_ICONS = { report: '📋', status: '🔄', support: '👍', delay: '⚠️', system: '🔔' };

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

const NotificationBell = () => {
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
        <div className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-16 sm:top-11 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HiBell className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unread > 0 && <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">{unread}</span>}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-green-600 hover:underline font-medium">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <HiX className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No notifications yet.</div>
            ) : (
              notifications.map(n => (
                <button key={n._id} onClick={() => markRead(n._id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 last:border-0 transition hover:bg-slate-50 ${!n.isRead ? 'bg-green-50/50' : ''}`}>
                  <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</p>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 text-center">
            <button onClick={() => { setOpen(false); window.location.href = '/citizen/notifications'; }}
              className="text-xs text-green-600 hover:underline font-medium">View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
