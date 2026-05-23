import { useState, useEffect, useCallback } from 'react';
import { HiBell, HiCheckCircle, HiRefresh, HiSearch, HiSparkles, HiTrash, HiX, HiAdjustments, HiCalendar, HiLocationMarker } from 'react-icons/hi';
import { MdEmojiNature, MdRecycling } from 'react-icons/md';
import { FaTrophy } from 'react-icons/fa';
import { API } from '../constants';
import { useTheme } from '../context/ThemeContext';

const TYPE_ICONS = { 
  'Eco Events': { icon: HiSparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
  'Awareness Campaigns': { icon: MdEmojiNature, color: 'text-green-500', bg: 'bg-green-500' },
  'Waste Collection Drives': { icon: MdRecycling, color: 'text-blue-500', bg: 'bg-blue-50' },
  'Plastic-Free Campaigns': { icon: MdRecycling, color: 'text-green-500', bg: 'bg-green-500' },
  'Emergency Alerts': { icon: HiBell, color: 'text-red-500', bg: 'bg-red-50' },
  'Government Announcements': { icon: HiBell, color: 'text-orange-500', bg: 'bg-orange-50' },
  'New Features/Updates': { icon: HiSparkles, color: 'text-blue-500', bg: 'bg-blue-50' },
  'Reward Bonus Events': { icon: FaTrophy, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  'report': { icon: HiCheckCircle, color: 'text-green-500', bg: 'bg-green-500' },
  'System': { icon: HiBell, color: 'text-slate-500', bg: 'bg-slate-50' }
};

const NotificationHub = () => {
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
                          (n.description || n.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`page-title flex items-center gap-2 ${dk('text-white', 'text-slate-900')} mb-0`}>
             <HiBell className="text-green-500" /> Notifications
          </h1>
          <p className={`small-text ${dk('text-slate-500', 'text-slate-400')}`}>Stay updated with community events & alerts</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={markAllRead} className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-green-500 text-white shadow-lg shadow-green-500/20 hover:scale-105 transition-all">Mark All Read</button>
           <button onClick={fetchAll} className={`p-2 rounded-xl border ${dk('border-slate-800 text-slate-400 hover:text-white', 'border-slate-200 text-slate-500 hover:text-green-500')}`}>
              <HiRefresh className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search updates..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-green-500 outline-none transition-all ${dk('bg-white/5 border-slate-800 text-white', 'bg-white border-slate-200 text-slate-900')}`}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['All', 'Unread', 'Events', 'Eco Events', 'Emergency Alerts'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === f ? 'bg-green-500 text-white' : dk('bg-white/5 text-slate-400', 'bg-white text-slate-500 border border-slate-200')}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && !notifications.length ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
           <div className="h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
           <p className="small-text text-slate-500">Retrieving your updates...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
           <div className="h-16 w-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiBell className="h-8 w-8 text-slate-300" />
           </div>
           <p className={`body-text font-bold ${dk('text-slate-400', 'text-slate-600')}`}>No notifications found</p>
           <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(n => {
            const meta = TYPE_ICONS[n.type] || TYPE_ICONS['System'];
            return (
              <div 
                key={n._id} 
                className={`relative group rounded-3xl border p-5 transition-all duration-300 ${!n.isRead ? dk('bg-green-500/5 border-green-500/20 shadow-lg', 'bg-green-500/30 border-green-500 shadow-lg') : dk('bg-white/5 border-slate-800', 'bg-white border-slate-100 shadow-sm')}`}
              >
                <div className="flex flex-col sm:flex-row gap-5">
                   <div className={`h-12 w-12 rounded-2xl shrink-0 flex items-center justify-center ${meta.bg} ${meta.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <meta.icon size={24} />
                   </div>
                   <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-3">
                            <h3 className={`font-bold leading-tight ${dk('text-white', 'text-slate-900')}`}>{n.title}</h3>
                            {n.priority === 'High' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest">Urgent</span>}
                            {n.priority === 'Critical' && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest animate-pulse">Critical</span>}
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString()}</span>
                            <button onClick={() => deleteNotif(n._id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 transition-all">
                               <HiTrash size={16} />
                            </button>
                         </div>
                      </div>
                      <p className={`text-sm leading-relaxed ${dk('text-slate-400', 'text-slate-600')}`}>{n.description || n.message}</p>
                      
                      {n.isEvent && (
                        <div className={`mt-4 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 ${dk('bg-white/5', 'bg-slate-50')}`}>
                           <div className="flex items-center gap-3 text-xs text-slate-500">
                             <HiCalendar className="text-green-500 h-4 w-4" />
                             <div>
                               <p className="font-bold">Date & Time</p>
                               <p>{n.eventDetails?.date ? new Date(n.eventDetails.date).toDateString() : 'TBD'} • {n.eventDetails?.time || '—'}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-3 text-xs text-slate-500">
                             <HiLocationMarker className="text-blue-500 h-4 w-4" />
                             <div>
                               <p className="font-bold">Venue</p>
                               <p>{n.eventDetails?.venue || 'Global/Online'}</p>
                             </div>
                           </div>
                           {n.eventDetails?.link && (
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
                          className="mt-3 text-[10px] items-center gap-1.5 flex uppercase tracking-widest font-black text-green-500 hover:text-green-500 hover:translate-x-1 transition-all"
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

export default NotificationHub;
