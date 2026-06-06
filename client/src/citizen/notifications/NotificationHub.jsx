import { useState, useEffect, useCallback } from 'react';
import { HiBell, HiCheckCircle, HiRefresh, HiSearch, HiSparkles, HiTrash, HiX, HiAdjustments, HiCalendar, HiLocationMarker } from 'react-icons/hi';
import { MdEmojiNature, MdRecycling } from 'react-icons/md';
import { FaTrophy } from 'react-icons/fa';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';

const TYPE_ICONS = { 
  'Eco Events': { icon: HiSparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
  'Awareness Campaigns': { icon: MdEmojiNature, color: 'text-green-500', bg: 'bg-green-500' },
  'Waste Collection Drives': { icon: MdRecycling, color: 'text-blue-500', bg: 'bg-blue-50' },
  'Emergency Alerts': { icon: HiBell, color: 'text-red-500', bg: 'bg-red-50' },
  'Reward Bonus Events': { icon: FaTrophy, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  'report': { icon: HiCheckCircle, color: 'text-green-500', bg: 'bg-green-500' },
  'System': { icon: HiBell, color: 'text-slate-500', bg: 'bg-slate-50' }
};

const NotificationPage = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  const token = localStorage.getItem('token');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch { }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const markRead = async (id) => {
    try {
      await fetch(`${API}/api/notifications/read/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch { }
  };

  const deleteNotif = async (id) => {
    try {
      const res = await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(ns => ns.filter(n => n._id !== id));
    } catch { }
  };

  const markAllRead = async () => {
     try {
       await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
       setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
     } catch { }
  };

  const filtered = notifications.filter(n => {
    const matchesFilter = filter === 'All' || n.type === filter || (filter === 'Unread' && !n.isRead) || (filter === 'Events' && n.isEvent);
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="page-container animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="page-header mb-0 flex items-center gap-3">
             <HiBell className="text-green-500 h-8 w-8" /> Notifications
          </h1>
          <p className="page-subheading">Stay updated with community events & alerts</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
           <button onClick={markAllRead} className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-green-500 text-white shadow-lg shadow-green-500/20 hover:scale-105 transition-all active:scale-95">Mark All Read</button>
           <button onClick={fetchAll} className="btn-refresh" title="Refresh">
              <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search updates..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full pl-11 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-green-500/20 outline-none transition-all shadow-sm ${dk('bg-white/5 border-white/10 text-white', 'bg-white border-black/5 text-slate-900')}`}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['All', 'Unread', 'Events', 'Eco Events', 'Emergency Alerts'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-5 py-3 sm:py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filter === f ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : dk('bg-white/5 text-slate-400 hover:bg-white/10', 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 shadow-sm')}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && !notifications.length && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
           <div className="h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
           <p className="small-text text-slate-500">Retrieving your updates...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state-container bg-white/5 border border-white/10 rounded-[2.5rem] py-24">
           <div className="h-20 w-20 bg-slate-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <HiBell className="h-10 w-10 text-slate-400" />
           </div>
           <h2 className="empty-state-title">No notifications</h2>
           <p className="empty-state-text">Try adjusting your filters or search terms</p>
        </div>
      )}
      {filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map(n => {
            const meta = TYPE_ICONS[n.type] || TYPE_ICONS['System'];
            return (
              <div 
                key={n._id} 
                className={`relative group rounded-2xl sm:rounded-[2.5rem] border p-4 sm:p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${!n.isRead ? dk('bg-green-500/5 border-green-500/20 shadow-lg shadow-green-500/5', 'bg-green-500/50 border-green-500 shadow-lg shadow-green-500/5') : dk('bg-white/5 border-white/10', 'bg-white border-black/[0.04] shadow-sm')}`}
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                   <div className={`h-14 w-14 rounded-lg shrink-0 flex items-center justify-center ${meta.bg} ${meta.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <meta.icon size={28} />
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                         <div className="min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                               <h3 className={`text-lg font-extrabold tracking-tight truncate ${dk('text-white', 'text-slate-900')}`}>{n.title}</h3>
                               {n.priority === 'High' && <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest shadow-sm">Urgent</span>}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                         </div>
                          <button onClick={() => deleteNotif(n._id)} className="h-10 w-10 flex items-center justify-center rounded-lg bg-red-50 text-red-400 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100">
                            <HiTrash size={20} />
                         </button>
                      </div>
                      <p className={`text-sm leading-relaxed font-medium ${dk('text-slate-400', 'text-slate-600')}`}>{n.description || n.message}</p>
                      
                      {n.isEvent && (
                        <div className={`mt-4 p-3.5 sm:p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${dk('bg-white/5', 'bg-slate-50')}`}>
                           <div className="flex items-center gap-3 text-xs text-slate-500">
                             <HiCalendar className="text-green-500 h-4 w-4" />
                             <div>
                               <p className="font-bold">Date & Time</p>
                               <p>{n.eventDetails.date ? new Date(n.eventDetails.date).toDateString() : 'TBD'} • {n.eventDetails.time || '—'}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-3 text-xs text-slate-500">
                             <HiLocationMarker className="text-blue-500 h-4 w-4" />
                             <div>
                               <p className="font-bold">Venue</p>
                               <p>{n.eventDetails.venue || 'Global/Online'}</p>
                             </div>
                           </div>
                           {n.eventDetails.link && (
                             <div className="sm:col-span-2">
                               <a href={n.eventDetails.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-green-500 hover:underline">
                                 Join/Register for Event →
                               </a>
                             </div>
                           )}
                        </div>
                      )}

                      {!n.isRead && (
                        <button 
                          onClick={() => markRead(n._id)}
                          className="mt-3 py-1.5 text-[10px] items-center gap-1.5 flex uppercase tracking-widest font-black text-green-500 hover:text-green-500 hover:translate-x-1 transition-all"
                        >
                          Mark as Read <HiCheckCircle size={14} />
                        </button>
                      )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
