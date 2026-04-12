import { useEffect, useState } from 'react';
import { HiBell, HiRefresh } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';

const TYPE_ICONS = { report: '📋', status: '🔄', support: '👍', delay: '⚠️', system: '🔔' };
const TYPE_COLORS = {
  report:  'bg-green-100 text-green-700',
  status:  'bg-blue-100 text-blue-700',
  support: 'bg-yellow-100 text-yellow-700',
  delay:   'bg-red-100 text-red-700',
  system:  'bg-slate-100 text-slate-600',
};

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
};

const Notifications = () => {
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const token    = localStorage.getItem('token');
  const [notifications, setNotifications] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/read/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-base font-semibold ${dk('text-slate-200','text-slate-800')}`}>Notifications</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-green-500 hover:underline font-medium">Mark all read</button>
          )}
          <button onClick={fetchAll} className={`flex items-center gap-1 text-xs transition ${dk('text-slate-400 hover:text-green-400','text-slate-400 hover:text-green-600')}`}>
            <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

        <div className={`flex items-center gap-1 rounded-xl border shadow-sm p-1 w-fit ${dk('bg-white/5 border-gray-700','bg-white border-slate-100')}`}>
          {[['all', 'All'], ['unread', 'Unread'], ['read', 'Read']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === val ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">No notifications found.</div>
        ) : (
          filtered.map(n => (
            <button key={n._id} onClick={() => markRead(n._id)}
              className={`w-full flex items-start gap-4 rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md ${
                !n.isRead
                  ? dk('bg-green-900/20 border-green-800','bg-white border-green-200')
                  : dk('bg-white/5 border-gray-700','bg-white/70 border-slate-100')
              }`}>
              <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg ${TYPE_COLORS[n.type] || 'bg-slate-100'}`}>
                {TYPE_ICONS[n.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${!n.isRead ? dk('text-slate-100','text-slate-900') : dk('text-slate-400','text-slate-600')}`}>{n.title}</p>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${dk('text-slate-400','text-slate-500')}`}>{n.message}</p>
                <p className={`text-xs mt-1.5 ${dk('text-slate-500','text-slate-400')}`}>{timeAgo(n.createdAt)}</p>
              </div>
            </button>
          ))
        )}
    </div>
  );
};

export default Notifications;
