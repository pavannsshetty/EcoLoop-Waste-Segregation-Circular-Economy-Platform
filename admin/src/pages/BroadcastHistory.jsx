import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiEye, HiPencil, HiTrash, HiX, HiCalendar, HiLocationMarker, HiLink } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import Dropdown from '../components/Dropdown';

const NOTIFICATION_TYPES = [
  'Eco Events',
  'Awareness Campaigns',
  'Waste Collection Drives',
  'Plastic-Free Campaigns',
  'Emergency Alerts',
  'Government Announcements',
  'New Features/Updates',
  'Reward Bonus Events',
  'System'
];

const TARGET_AUDIENCES = ['All', 'Citizens', 'Collectors', 'Green Champions', 'Specific Community'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const BROADCAST_STATUSES = ['All', 'Active', 'Scheduled', 'Draft', 'Archived'];

const mapStatusLabel = {
  Active: 'Sent',
  Scheduled: 'Scheduled',
  Draft: 'Draft',
  Archived: 'Archived'
};

const statusClasses = (status, dark) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (status === 'Active') return `${base} ${dark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`;
  if (status === 'Scheduled') return `${base} ${dark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-100 text-blue-700'}`;
  if (status === 'Draft') return `${base} ${dark ? 'bg-slate-600 text-slate-200' : 'bg-slate-100 text-slate-700'}`;
  return `${base} ${dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const buildSearchParams = ({ search, category, audience, status }) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category && category !== 'All') params.set('type', category);
  if (audience && audience !== 'All') params.set('audience', audience);
  if (status && status !== 'All') params.set('status', status);
  return params.toString();
};

const BroadcastHistory = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { socket } = useSocket();
  const dk = (darkValue, lightValue) => (dark ? darkValue : lightValue);
  const inp = dk(
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition',
    'w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition'
  );

  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAudience, setFilterAudience] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [editingBroadcast, setEditingBroadcast] = useState(null);
  const [editValues, setEditValues] = useState({
    title: '',
    description: '',
    type: 'System',
    priority: 'Low',
    targetAudience: 'All',
    targetVillage: '',
    status: 'Active',
    isEvent: false,
    date: '',
    time: '',
    venue: '',
    link: ''
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem('admin-token');
  const redirectToLogin = () => {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    navigate('/admin/login');
  };

  const loadBroadcasts = async () => {
    if (!token) {
      redirectToLogin();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = buildSearchParams({
        search,
        category: filterCategory,
        audience: filterAudience,
        status: filterStatus
      });
      const res = await fetch(`/api/notifications/admin${params ? `?${params}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load broadcast history.');
      setBroadcasts(data);
    } catch (err) {
      setError(err.message || 'Unable to fetch broadcast history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, [search, filterCategory, filterAudience, filterStatus]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadBroadcasts();
    socket.on('notification_broadcast', refresh);
    socket.on('notification', refresh);
    return () => {
      socket.off('notification_broadcast', refresh);
      socket.off('notification', refresh);
    };
  }, [socket]);

  const openView = (broadcast) => setSelectedBroadcast(broadcast);

  const openEdit = (broadcast) => {
    setEditingBroadcast(broadcast);
    setEditValues({
      title: broadcast.title || '',
      description: broadcast.description || '',
      type: broadcast.type || 'System',
      priority: broadcast.priority || 'Low',
      targetAudience: broadcast.targetAudience || 'All',
      targetVillage: broadcast.targetVillage || '',
      status: broadcast.status || 'Active',
      isEvent: broadcast.isEvent || false,
      date: broadcast.eventDetails?.date ? broadcast.eventDetails.date.slice(0, 10) : '',
      time: broadcast.eventDetails?.time || '',
      venue: broadcast.eventDetails?.venue || '',
      link: broadcast.eventDetails?.link || ''
    });
  };

  const handleEditChange = (key, value) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingBroadcast) return;
    setSaving(true);
    try {
      const payload = {
        title: editValues.title,
        description: editValues.description,
        type: editValues.type,
        priority: editValues.priority,
        targetAudience: editValues.targetAudience,
        targetVillage: editValues.targetAudience === 'Specific Community' ? editValues.targetVillage : '',
        status: editValues.status,
        isEvent: editValues.isEvent,
        eventDetails: {
          date: editValues.date || undefined,
          time: editValues.time || undefined,
          venue: editValues.venue || undefined,
          link: editValues.link || undefined
        }
      };
      const res = await fetch(`/api/notifications/admin/${editingBroadcast._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to save changes.');
      setEditingBroadcast(null);
      loadBroadcasts();
    } catch (err) {
      setError(err.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notifications/admin/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to delete broadcast.');
      setDeleteTarget(null);
      loadBroadcasts();
    } catch (err) {
      setError(err.message || 'Unable to delete broadcast.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredBroadcasts = useMemo(() => broadcasts, [broadcasts]);

  const renderEventBadge = (broadcast) => {
    if (!broadcast.isEvent) return null;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${dk('bg-amber-500/10 text-amber-300 border border-amber-500/20', 'bg-amber-50 text-amber-700 border border-amber-200')}`}>
        <HiCalendar className="h-3 w-3" /> Event
      </span>
    );
  };

  const renderEventDetailsFields = () => {
    if (!editValues.isEvent) return null;
    return (
      <div className={`col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border ${dk('bg-white/5 border-gray-800', 'bg-gray-50 border-gray-200')}`}>
        <div>
          <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Event Date</label>
          <input type="date" value={editValues.date} onChange={(e) => handleEditChange('date', e.target.value)} className={inp} />
        </div>
        <div>
          <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Event Time</label>
          <input type="time" value={editValues.time} onChange={(e) => handleEditChange('time', e.target.value)} className={inp} />
        </div>
        <div>
          <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Venue</label>
          <input type="text" value={editValues.venue} onChange={(e) => handleEditChange('venue', e.target.value)} placeholder="Physical address or meeting link" className={inp} />
        </div>
        <div>
          <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Info Link</label>
          <input type="url" value={editValues.link} onChange={(e) => handleEditChange('link', e.target.value)} placeholder="https://..." className={inp} />
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-6">
      <div className="pb-2">
        <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-white', 'text-gray-900')}`}>
          Broadcast History
        </h1>
        <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-gray-400', 'text-gray-500')}`}>
          Review past broadcasts, filter by audience, category, and status, and manage entries in real time.
        </p>
      </div>

      <div className={dk('bg-slate-950/70 border border-white/10', 'bg-white border border-slate-200') + ' rounded-xl p-5 space-y-4'}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description"
            className={dk(
              'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500',
              'w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
            )}
          />
          <Dropdown name="filterCategory" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inp}>
            {['All', ...NOTIFICATION_TYPES].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Dropdown>
          <Dropdown name="filterAudience" value={filterAudience} onChange={(e) => setFilterAudience(e.target.value)} className={inp}>
            {['All', ...TARGET_AUDIENCES].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Dropdown>
          <Dropdown name="filterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inp}>
            {BROADCAST_STATUSES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Dropdown>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-10 w-10 rounded-full border-4 border-[#0BAF2A] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No broadcasts found. Adjust your filters or try another search term.</div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden lg:block rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto] gap-3 px-5 py-3 text-xs uppercase tracking-wider font-bold text-slate-500 bg-slate-100/80 dark:bg-black/20 dark:text-slate-400 rounded-t-xl border-b dark:border-slate-800">
                <div className="truncate">Notification Title</div>
                <div className="truncate">Category</div>
                <div className="truncate">Priority</div>
                <div className="truncate">Audience</div>
                <div className="truncate">Sent</div>
                <div className="text-right">Actions</div>
              </div>
              {filteredBroadcasts.map((broadcast) => (
                <div key={broadcast._id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto] gap-3 px-5 py-3.5 border-t ${dk('border-slate-800', 'border-slate-200')} items-center hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openView(broadcast)} className={`text-left text-sm font-semibold truncate transition ${dk('text-slate-200 hover:text-green-400', 'text-slate-800 hover:text-green-600')}`}>
                        {broadcast.title}
                      </button>
                      {renderEventBadge(broadcast)}
                    </div>
                    <p className={`mt-0.5 text-xs truncate ${dk('text-slate-500', 'text-slate-400')}`}>{broadcast.description}</p>
                  </div>
                  <div className={`text-sm truncate ${dk('text-slate-300', 'text-slate-600')}`}>{broadcast.type}</div>
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      broadcast.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      broadcast.priority === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      broadcast.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>{broadcast.priority}</span>
                  </div>
                  <div className={`text-sm truncate ${dk('text-slate-300', 'text-slate-600')}`}>{broadcast.targetAudience}{broadcast.targetVillage ? ` (${broadcast.targetVillage})` : ''}</div>
                  <div className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>{formatDateTime(broadcast.createdAt)}</div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={`hidden xl:inline-flex ${statusClasses(broadcast.status, dark)}`}>{mapStatusLabel[broadcast.status] || broadcast.status}</span>
                    <span className="xl:hidden">{mapStatusLabel[broadcast.status] || broadcast.status}</span>
                    <button type="button" onClick={() => openView(broadcast)} title="View" className={`p-2.5 rounded-lg border ${dk('border-slate-700 text-slate-400 hover:bg-white/5', 'border-slate-200 text-slate-500 hover:bg-slate-100')}`}><HiEye className="h-4 w-4" /></button>
                    <button type="button" onClick={() => openEdit(broadcast)} title="Edit" className={`p-2.5 rounded-lg border ${dk('border-blue-900/40 text-blue-400 hover:bg-blue-900/20', 'border-blue-200 text-blue-600 hover:bg-blue-50')}`}><HiPencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setDeleteTarget(broadcast)} title="Delete" className={`p-2.5 rounded-lg border ${dk('border-red-900/40 text-red-400 hover:bg-red-900/20', 'border-red-200 text-red-600 hover:bg-red-50')}`}><HiTrash className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="grid gap-4 lg:hidden">
              {filteredBroadcasts.map((broadcast) => (
                <div key={broadcast._id} className={`rounded-2xl border p-4 ${dk('bg-slate-950 border-slate-800', 'bg-white border-slate-200')} shadow-sm`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button type="button" onClick={() => openView(broadcast)} className="text-left text-sm font-semibold text-slate-900 hover:text-[#0BAF2A] transition truncate">
                          {broadcast.title}
                        </button>
                        {renderEventBadge(broadcast)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 truncate">{broadcast.type} &bull; {broadcast.priority}</p>
                    </div>
                    <span className={statusClasses(broadcast.status, dark)}>{mapStatusLabel[broadcast.status] || broadcast.status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div><span className="font-semibold text-slate-800">Audience:</span> {broadcast.targetAudience}{broadcast.targetVillage ? ` (${broadcast.targetVillage})` : ''}</div>
                    <div><span className="font-semibold text-slate-800">Sent:</span> {formatDateTime(broadcast.createdAt)}</div>
                    {broadcast.isEvent && broadcast.eventDetails?.date && (
                      <div><span className="font-semibold text-slate-800">Event:</span> {formatDate(broadcast.eventDetails.date)}{broadcast.eventDetails?.venue ? ` at ${broadcast.eventDetails.venue}` : ''}</div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={() => openView(broadcast)} title="View" className={`p-2.5 rounded-lg border ${dk('border-slate-700 text-slate-400 hover:bg-white/5', 'border-slate-200 text-slate-500 hover:bg-slate-100')}`}><HiEye className="h-4 w-4" /></button>
                    <button type="button" onClick={() => openEdit(broadcast)} title="Edit" className={`p-2.5 rounded-lg border ${dk('border-blue-900/40 text-blue-400 hover:bg-blue-900/20', 'border-blue-200 text-blue-600 hover:bg-blue-50')}`}><HiPencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setDeleteTarget(broadcast)} title="Delete" className={`p-2.5 rounded-lg border ${dk('border-red-900/40 text-red-400 hover:bg-red-900/20', 'border-red-200 text-red-600 hover:bg-red-50')}`}><HiTrash className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto" onClick={() => setSelectedBroadcast(null)}>
          <div className={`w-full max-w-[95vw] sm:max-w-3xl my-8 overflow-hidden rounded-2xl border shadow-2xl max-h-[90vh] ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dk('border-slate-800', 'border-slate-100')}`}>
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-base font-semibold truncate ${dk('text-white', 'text-slate-900')}`}>{selectedBroadcast.title}</h2>
                  {renderEventBadge(selectedBroadcast)}
                </div>
                <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Sent {formatDateTime(selectedBroadcast.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setSelectedBroadcast(null)} className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 transition">
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Category</p>
                  <p className={`mt-1 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{selectedBroadcast.type}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Audience</p>
                  <p className={`mt-1 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>
                    {selectedBroadcast.targetAudience}
                    {selectedBroadcast.targetVillage ? ` (${selectedBroadcast.targetVillage})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Priority</p>
                  <p className={`mt-1 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{selectedBroadcast.priority}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className={`mt-1 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{mapStatusLabel[selectedBroadcast.status] || selectedBroadcast.status}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                <p className={`mt-2 text-sm leading-6 whitespace-pre-wrap ${dk('text-slate-200', 'text-slate-700')}`}>{selectedBroadcast.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Target Village</p>
                  <p className={`mt-1 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{selectedBroadcast.targetVillage || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Sent</p>
                  <p className={`mt-1 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{formatDateTime(selectedBroadcast.createdAt)}</p>
                </div>
              </div>

              {selectedBroadcast.isEvent && selectedBroadcast.eventDetails && (
                <div className={`rounded-xl border p-4 space-y-3 ${dk('bg-white/5 border-amber-500/20', 'bg-amber-50 border-amber-200')}`}>
                  <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-amber-300', 'text-amber-700')}`}>
                    <HiCalendar className="inline h-4 w-4 mr-1" />Event Details
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedBroadcast.eventDetails.date && (
                      <div>
                        <p className="text-xs text-slate-500">Date</p>
                        <p className={`mt-0.5 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{formatDate(selectedBroadcast.eventDetails.date)}</p>
                      </div>
                    )}
                    {selectedBroadcast.eventDetails.time && (
                      <div>
                        <p className="text-xs text-slate-500">Time</p>
                        <p className={`mt-0.5 text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{selectedBroadcast.eventDetails.time}</p>
                      </div>
                    )}
                    {selectedBroadcast.eventDetails.venue && (
                      <div>
                        <p className="text-xs text-slate-500">Venue</p>
                        <p className={`mt-0.5 text-sm flex items-center gap-1 ${dk('text-slate-200', 'text-slate-700')}`}>
                          <HiLocationMarker className="h-3.5 w-3.5 shrink-0" />
                          {selectedBroadcast.eventDetails.venue}
                        </p>
                      </div>
                    )}
                    {selectedBroadcast.eventDetails.link && (
                      <div>
                        <p className="text-xs text-slate-500">Info Link</p>
                        <a href={selectedBroadcast.eventDetails.link} target="_blank" rel="noopener noreferrer" className={`mt-0.5 text-sm flex items-center gap-1 underline hover:text-[#0BAF2A] transition ${dk('text-blue-300', 'text-blue-600')}`}>
                          <HiLink className="h-3.5 w-3.5 shrink-0" />
                          {selectedBroadcast.eventDetails.link.replace(/^https?:\/\//, '').slice(0, 40)}
                        </a>
                      </div>
                    )}
                  </div>
                  {selectedBroadcast.eventDetails.banner && (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <img src={selectedBroadcast.eventDetails.banner} alt="Event banner" className="w-full max-h-48 object-cover" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <button type="button" onClick={() => { openEdit(selectedBroadcast); setSelectedBroadcast(null); }} title="Edit" className={`p-2.5 rounded-lg border ${dk('border-blue-900/40 text-blue-400 hover:bg-blue-900/20', 'border-blue-200 text-blue-600 hover:bg-blue-50')}`}><HiPencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => { setDeleteTarget(selectedBroadcast); setSelectedBroadcast(null); }} title="Delete" className={`p-2.5 rounded-lg border ${dk('border-red-900/40 text-red-400 hover:bg-red-900/20', 'border-red-200 text-red-600 hover:bg-red-50')}`}><HiTrash className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto" onClick={() => setEditingBroadcast(null)}>
          <div className={`w-full max-w-[95vw] sm:max-w-3xl my-8 overflow-hidden rounded-2xl border shadow-2xl max-h-[90vh] ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dk('border-slate-800', 'border-slate-100')}`}>
              <div>
                <h2 className={`text-base font-semibold ${dk('text-white', 'text-slate-900')}`}>Edit Broadcast</h2>
                <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Update broadcast metadata and save changes.</p>
              </div>
              <button type="button" onClick={() => setEditingBroadcast(null)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 transition">
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-5 p-5 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Title</label>
                  <input type="text" value={editValues.title} onChange={(e) => handleEditChange('title', e.target.value)} className={inp} required />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Status</label>
                  <Dropdown value={editValues.status} onChange={(e) => handleEditChange('status', e.target.value)} className={inp}>
                    {['Active', 'Scheduled', 'Draft', 'Archived'].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Dropdown>
                </div>
                <div className="lg:col-span-2">
                  <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Description</label>
                  <textarea value={editValues.description} onChange={(e) => handleEditChange('description', e.target.value)} rows={4} className={`${inp} resize-none`} required />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Category</label>
                  <Dropdown value={editValues.type} onChange={(e) => handleEditChange('type', e.target.value)} className={inp}>
                    {NOTIFICATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </Dropdown>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Priority</label>
                  <Dropdown value={editValues.priority} onChange={(e) => handleEditChange('priority', e.target.value)} className={inp}>
                    {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </Dropdown>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Audience</label>
                  <Dropdown value={editValues.targetAudience} onChange={(e) => handleEditChange('targetAudience', e.target.value)} className={inp}>
                    {TARGET_AUDIENCES.map((audience) => <option key={audience} value={audience}>{audience}</option>)}
                  </Dropdown>
                </div>
                {editValues.targetAudience === 'Specific Community' && (
                  <div>
                    <label className={`block text-xs font-bold mb-2 ${dk('text-slate-300', 'text-slate-700')}`}>Village / Community</label>
                    <input type="text" value={editValues.targetVillage} onChange={(e) => handleEditChange('targetVillage', e.target.value)} className={inp} placeholder="Village name" />
                  </div>
                )}
                <div className="lg:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editValues.isEvent}
                      onChange={(e) => handleEditChange('isEvent', e.target.checked)}
                      className="w-4 h-4 text-green-500 rounded-lg bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
                    />
                    <span className={`text-xs font-bold ${dk('text-white', 'text-gray-900')}`}>Is this an Event?</span>
                  </label>
                </div>
                {renderEventDetailsFields()}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setEditingBroadcast(null)} className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="w-full sm:w-auto rounded-lg bg-[#0BAF2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0aa020] transition disabled:opacity-60 disabled:cursor-not-allowed">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50">
          <div className={`w-full max-w-[95vw] sm:max-w-md rounded-2xl border ${dk('border-slate-700 bg-slate-900', 'border-slate-200 bg-white')} p-5 shadow-2xl`}>
            <h3 className={`text-lg font-semibold ${dk('text-white', 'text-slate-900')}`}>Delete Broadcast</h3>
            <p className={`mt-2 text-sm ${dk('text-slate-400', 'text-slate-500')}`}>
              Are you sure you want to permanently delete &ldquo;{deleteTarget.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3 justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)} className={`rounded-lg border px-4 py-2 text-sm font-medium ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastHistory;
