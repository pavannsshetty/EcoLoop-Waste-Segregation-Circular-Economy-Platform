import { useEffect, useMemo, useState } from 'react';
import { HiCalendar, HiLocationMarker, HiLink, HiSearch, HiCheckCircle, HiEye, HiX } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { parseStoredUser } from '../context/UserContext';
import { useSocket } from '../context/SocketContext';
import { API } from '../constants';

const ROLE_CONFIG = {
  citizen: {
    label: 'Community Updates',
    desc: 'Stay informed with public announcements, eco events, and awareness campaigns.',
    categories: ['All', 'Eco Events', 'Awareness Campaigns', 'Waste Collection Drives', 'Plastic-Free Campaigns', 'Emergency Alerts', 'Government Announcements', 'New Features/Updates', 'Reward Bonus Events', 'System'],
  },
  greenchampion: {
    label: 'Community Updates',
    desc: 'Campaign invitations, volunteer activities, and champion notices.',
    categories: ['All', 'Campaign Invitations', 'Volunteer Activities', 'Champion Notices', 'Awareness Campaigns', 'Reward Bonus Events', 'Plastic-Free Campaigns', 'New Features/Updates', 'System'],
  },
  collector: {
    label: 'Community Updates',
    desc: 'Pickup alerts, area updates, and shift/route announcements.',
    categories: ['All', 'Pickup Alerts', 'Area Updates', 'Shift/Route Announcements', 'Waste Collection Drives', 'Emergency Alerts', 'New Features/Updates', 'System'],
  },
};

const getReadableRole = (role) => {
  const map = { citizen: 'Citizens', greenchampion: 'Green Champions', collector: 'Collectors' };
  return map[role] || 'All';
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CommunityUpdates = () => {
  const { dark } = useTheme();
  const { socket } = useSocket();
  const token = localStorage.getItem('token');
  const user = parseStoredUser();
  const role = (user.role || '').toLowerCase().replace('_', '');
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;

  const dk = (d, l) => (dark ? d : l);
  const card = `rounded-xl border overflow-hidden flex flex-col ${dk('bg-slate-800/60 border-gray-700', 'bg-white border-slate-200 shadow-sm')}`;
  const inp = dk(
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition',
    'w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition'
  );

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [viewItem, setViewItem] = useState(null);

  const fetchUpdates = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load updates.');
      const data = await res.json();
      const filtered = (data || []).filter((n) => !n.userId && (n.targetAudience === 'All' || n.targetAudience === getReadableRole(role)));
      setUpdates(filtered);
    } catch (err) {
      setError(err.message || 'Unable to load community updates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => { fetchUpdates(); };
    socket.on('notification', handler);
    socket.on('notification_broadcast', handler);
    return () => {
      socket.off('notification', handler);
      socket.off('notification_broadcast', handler);
    };
  }, [socket]);

  const markRead = async (id) => {
    try {
      await fetch(`${API}/api/notifications/read/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpdates((prev) => prev.map((u) => u._id === id ? { ...u, readBy: [...(u.readBy || []), user._id].filter(Boolean) } : u));
    } catch {}
  };

  const filteredUpdates = useMemo(() => {
    let list = updates;
    if (catFilter !== 'All') list = list.filter((u) => u.type === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => (u.title + ' ' + u.description).toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const aRead = a.readBy?.includes(user._id) || a.isRead;
      const bRead = b.readBy?.includes(user._id) || b.isRead;
      if (aRead && !bRead) return 1;
      if (!aRead && bRead) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return list;
  }, [updates, search, catFilter]);

  const isRead = (item) => item.readBy?.includes(user._id) || item.isRead;

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      <div className="pb-2">
        <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-white', 'text-gray-900')}`}>{config.label}</h1>
        <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-gray-400', 'text-gray-500')}`}>{config.desc}</p>
      </div>

      {error && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${dk('bg-red-900/20 border-red-800 text-red-300', 'bg-red-50 border-red-200 text-red-700')}`}>{error}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group flex-1 min-w-0 ${
          dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'
        }`}>
          <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search updates..." className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${inp} min-h-[44px] sm:max-w-[200px]`}>
          {config.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : filteredUpdates.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-12 text-center text-sm ${dk('border-slate-700 text-slate-500', 'border-slate-300 text-slate-400')}`}>
          {search || catFilter !== 'All' ? 'No updates match your filters.' : 'No community updates yet. Check back soon!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUpdates.map((item) => (
            <div key={item._id} className={`${card} transition hover:shadow-md ${isRead(item) ? 'opacity-75' : ''}`}>
              {item.eventDetails?.banner && (
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={item.eventDetails.banner} alt="" className="w-full h-full object-cover" />
                  {!isRead(item) && <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />}
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col gap-3">
                {!item.eventDetails?.banner && !isRead(item) && (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${dk('text-green-400', 'text-green-600')}`}>New</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className={`text-sm font-bold leading-snug line-clamp-2 ${dk('text-slate-100', 'text-slate-900')}`}>{item.title}</h3>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${dk('bg-green-900/40 text-green-400', 'bg-green-50 text-green-700')}`}>{item.type}</span>
                </div>
                <p className={`text-xs leading-relaxed line-clamp-3 ${dk('text-slate-400', 'text-slate-500')}`}>{item.description}</p>
                {item.isEvent && item.eventDetails && (
                  <div className={`flex flex-wrap gap-2 text-[10px] font-medium ${dk('text-amber-300', 'text-amber-700')}`}>
                    {item.eventDetails.date && <span className="flex items-center gap-1"><HiCalendar className="h-3 w-3" />{formatDate(item.eventDetails.date)}</span>}
                    {item.eventDetails.venue && <span className="flex items-center gap-1"><HiLocationMarker className="h-3 w-3" />{item.eventDetails.venue}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 mt-auto pt-2">
                  <span className={`text-[10px] ${dk('text-slate-500', 'text-slate-400')}`}>{formatDateTime(item.createdAt)}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => { setViewItem(item); if (!isRead(item)) markRead(item._id); }} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 min-h-[36px] text-[11px] font-semibold transition ${dk('bg-slate-700 text-slate-200 hover:bg-slate-600', 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}>
                      <HiEye className="h-3.5 w-3.5" /> View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setViewItem(null)}>
          <div className={`w-full max-w-2xl my-4 sm:my-8 mx-0 sm:mx-4 overflow-hidden rounded-2xl border shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-4 sm:px-5 py-4 border-b ${dk('border-slate-800', 'border-slate-100')}`}>
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-base font-semibold truncate ${dk('text-white', 'text-slate-900')}`}>{viewItem.title}</h2>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${dk('bg-green-900/40 text-green-400', 'bg-green-50 text-green-700')}`}>{viewItem.type}</span>
                </div>
                <p className={`text-xs mt-1 ${dk('text-slate-400', 'text-slate-500')}`}>{formatDateTime(viewItem.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setViewItem(null)} className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 transition">
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-4 sm:p-5 max-h-[70vh] overflow-y-auto">
              {viewItem.eventDetails?.banner && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img src={viewItem.eventDetails.banner} alt="" className="w-full max-h-56 object-cover" />
                </div>
              )}
              <div>
                <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Description</p>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${dk('text-slate-200', 'text-slate-700')}`}>{viewItem.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Category</p>
                  <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-700')}`}>{viewItem.type}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Target Audience</p>
                  <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-700')}`}>{viewItem.targetAudience}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Priority</p>
                  <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-700')}`}>{viewItem.priority || 'Normal'}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Posted</p>
                  <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-700')}`}>{formatDateTime(viewItem.createdAt)}</p>
                </div>
              </div>
              {viewItem.isEvent && viewItem.eventDetails && (
                <div className={`rounded-xl border p-4 space-y-3 ${dk('bg-white/5 border-amber-500/20', 'bg-amber-50 border-amber-200')}`}>
                  <p className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${dk('text-amber-300', 'text-amber-700')}`}>
                    <HiCalendar className="h-4 w-4" /> Event Details
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {viewItem.eventDetails.date && (
                      <div>
                        <p className="text-xs text-slate-500">Date</p>
                        <p className={`mt-0.5 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{formatDate(viewItem.eventDetails.date)}</p>
                      </div>
                    )}
                    {viewItem.eventDetails.time && (
                      <div>
                        <p className="text-xs text-slate-500">Time</p>
                        <p className={`mt-0.5 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{viewItem.eventDetails.time}</p>
                      </div>
                    )}
                    {viewItem.eventDetails.venue && (
                      <div>
                        <p className="text-xs text-slate-500">Venue</p>
                        <p className={`mt-0.5 text-sm flex items-center gap-1 ${dk('text-slate-200', 'text-slate-700')}`}>
                          <HiLocationMarker className="h-3.5 w-3.5 shrink-0" />{viewItem.eventDetails.venue}
                        </p>
                      </div>
                    )}
                    {viewItem.eventDetails.link && (
                      <div>
                        <p className="text-xs text-slate-500">Info Link</p>
                        <a href={viewItem.eventDetails.link} target="_blank" rel="noopener noreferrer" className={`mt-0.5 text-sm flex items-center gap-1 underline ${dk('text-blue-300 hover:text-blue-200', 'text-blue-600 hover:text-blue-800')}`}>
                          <HiLink className="h-3.5 w-3.5" />Open Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setViewItem(null)} className={`rounded-lg px-4 py-2 min-h-[40px] text-sm font-semibold transition ${dk('bg-slate-700 text-slate-200 hover:bg-slate-600', 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityUpdates;
