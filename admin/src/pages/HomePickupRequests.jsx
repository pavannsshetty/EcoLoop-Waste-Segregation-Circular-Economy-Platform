import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiEye, HiX, HiSearch, HiCalendar, HiPhone, HiClock, HiCheckCircle, HiXCircle, HiExclamationCircle } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const ModalWrapper = ({ children, onClose, title, dk }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex p-4 sm:p-6 bg-black/60 overflow-y-auto" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className={`relative m-auto w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl max-h-full flex flex-col rounded-lg border shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex justify-between items-center shrink-0 rounded-t-lg sticky top-0 z-10 ${dk('border-slate-800 bg-slate-900', 'border-slate-100 bg-white')}`}>
          <h2 className={`text-lg font-bold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{title}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition shrink-0 ${dk('text-slate-400 hover:bg-slate-800 hover:text-white', 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const HomePickupRequests = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState(null);

  const getDayGroup = (dateStr) => {
    if (!dateStr) return 'Later';
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (d <= endOfWeek) return 'This Week';
    return 'Later';
  };

  const scheduleGroup = (r) => {
    const schedule = r.pickupTime || r.createdAt;
    return getDayGroup(schedule);
  };

  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(r =>
      [r.reportId, r.requestId, r.wasteType, r.status, r.village, r.userId?.name, r.userId?.phone]
        .some(f => f?.toLowerCase().includes(q))
    );
  }, [requests, search]);

  const grouped = useMemo(() => {
    const groups = {};
    const order = ['Today', 'Tomorrow', 'This Week', 'Later'];
    order.forEach(g => { groups[g] = []; });
    filteredRequests.forEach(r => {
      const g = scheduleGroup(r);
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    });
    return order.filter(g => groups[g]?.length > 0).map(g => ({ label: g, items: groups[g] }));
  }, [filteredRequests]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/reports/home-pickup', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error (${res.status})`);
      }
      const d = await res.json();
      setRequests(d.requests || d.reports || []);
    } catch (err) {
      console.error('[HomePickup] fetch error:', err);
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Requested': return dk('bg-blue-900/50 text-blue-400', 'bg-blue-100 text-blue-800');
      case 'Scheduled': return dk('bg-purple-900/50 text-purple-400', 'bg-purple-100 text-purple-800');
      case 'Picked Up': return dk('bg-amber-900/50 text-amber-500', 'bg-amber-100 text-amber-800');
      case 'Completed': return dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800');
      case 'Cancelled': return dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800');
      default: return dk('bg-gray-800 text-gray-400', 'bg-gray-100 text-gray-800');
    }
  };

  const getDayGroupColor = (label) => {
    switch (label) {
      case 'Today': return dk('bg-blue-900/30 text-blue-400 border-blue-800', 'bg-blue-50 text-blue-700 border-blue-200');
      case 'Tomorrow': return dk('bg-teal-900/30 text-teal-400 border-teal-800', 'bg-teal-50 text-teal-700 border-teal-200');
      case 'This Week': return dk('bg-green-900/30 text-green-400 border-green-800', 'bg-green-50 text-green-700 border-green-200');
      default: return dk('bg-slate-800 text-slate-400 border-slate-700', 'bg-slate-100 text-slate-600 border-slate-200');
    }
  };

  const formatSchedule = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return val;
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Home Pickup Requests</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage household waste pickup requests from citizens</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm flex items-center gap-3"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderColor: 'rgba(220, 38, 38, 0.3)',
            color: 'var(--error-text)'
          }}>
          <HiExclamationCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group max-w-md ${
        dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'
      }`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, citizen, mobile, waste type, status, village..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>Pickup Requests</h2>
          <span className={`text-xs font-medium ${dk('text-slate-500', 'text-slate-500')}`}>
            {search ? `${filteredRequests.length} of ${requests.length}` : `${requests.length} requests`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            {search ? 'No requests matching your search.' : 'No pickup requests found.'}
          </div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Request ID</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Citizen</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Mobile Number</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Village</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Waste Type</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Pickup Schedule</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Collector</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Date & Time</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => (
                    <tr key={r._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-slate-50')}`}>
                      <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-green-600">
                        {r.reportId || r.requestId || 'ECO-PENDING'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {r.userId ? (
                          <>
                            <p className={`font-semibold text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{r.userId.name}</p>
                            <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{r.userId.phone}</p>
                          </>
                        ) : <span className={`text-sm ${dk('text-slate-500', 'text-slate-400')}`}>Unknown</span>}
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap font-mono text-sm ${dk('text-slate-300', 'text-slate-700')}`}>
                        {r.userId?.phone || r.mobile || '—'}
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap text-sm ${dk('text-slate-300', 'text-slate-700')}`}>
                        {r.village || '—'}
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap font-medium text-sm ${dk('text-slate-200', 'text-slate-800')}`}>
                        {r.wasteType || '—'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <HiCalendar className={`w-3.5 h-3.5 shrink-0 ${dk('text-teal-400', 'text-teal-500')}`} />
                          <span className={`text-xs ${dk('text-slate-300', 'text-slate-700')}`}>{formatSchedule(r.pickupTime)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {r.assignedCollector ? (
                          <div>
                            <p className={`font-medium text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{r.assignedCollector.name}</p>
                            <p className={`text-xs mt-0.5 font-mono ${dk('text-green-500', 'text-green-600')}`}>{r.assignedCollector.collectorId}</p>
                          </div>
                        ) : (
                          <span className={`text-xs italic ${dk('text-slate-500', 'text-slate-400')}`}>Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap text-xs ${dk('text-slate-400', 'text-slate-600')}`}>
                        <div>{new Date(r.createdAt).toLocaleDateString()}</div>
                        <div className="opacity-70">{new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button onClick={() => setViewModal(r)} className={`p-2 rounded-lg border transition flex items-center gap-1.5 text-xs font-medium ${dk('border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700', 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800')}`}>
                          <HiEye className="w-4 h-4" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="xl:hidden divide-y divide-slate-100 dark:divide-gray-800">
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  <div className={`sticky top-0 z-10 px-4 py-2 border-b text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${getDayGroupColor(label)}`}>
                    <HiClock className="w-3.5 h-3.5" />
                    {label}
                    <span className="ml-auto font-normal opacity-70">{items.length} request{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  {items.map((r) => (
                    <div key={r._id} className="p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-green-600">{r.reportId || r.requestId || 'ECO-PENDING'}</p>
                          <p className={`mt-1 font-semibold text-sm truncate ${dk('text-slate-200', 'text-slate-800')}`}>{r.userId?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <HiPhone className={`w-3 h-3 ${dk('text-slate-500', 'text-slate-400')}`} />
                            <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{r.userId?.phone || r.mobile || '—'}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(r.status)}`}>{r.status}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <HiCalendar className={`w-3.5 h-3.5 ${dk('text-teal-400', 'text-teal-500')}`} />
                        <span className={`text-xs ${dk('text-slate-300', 'text-slate-600')}`}>{formatSchedule(r.pickupTime)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Waste Type</p>
                          <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{r.wasteType || '—'}</p>
                        </div>
                        <div>
                          <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Village</p>
                          <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{r.village || '—'}</p>
                        </div>
                        <div>
                          <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Collector</p>
                          <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{r.assignedCollector?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                          <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Date</p>
                          <p className={`text-sm ${dk('text-slate-300', 'text-slate-600')}`}>{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button onClick={() => setViewModal(r)} className={`p-2 rounded-lg border transition text-xs font-medium flex items-center gap-1.5 ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200', 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700')}`} title="View">
                          <HiEye className="w-4 h-4" /> View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {viewModal && (
        <ModalWrapper onClose={() => setViewModal(null)} title={`Pickup Request — ${viewModal.reportId || viewModal.requestId || 'ECO-PENDING'}`} dk={dk}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Citizen Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Name:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.userId?.name || 'N/A'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Phone:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.userId?.phone || 'N/A'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Email:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.userId?.email || 'N/A'}</span></p>
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Address & Location</h4>
                <div className="space-y-2 text-sm">
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Address:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.location?.address || viewModal.address || 'N/A'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Village:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.village || 'Not specified'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>House No:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.houseNo || '—'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Landmark:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.landmark || '—'}</span></p>
                  {viewModal.location?.lat && (
                    <p className={`text-xs font-mono ${dk('text-slate-500', 'text-slate-500')}`}>Lat: {viewModal.location.lat}, Lng: {viewModal.location.lng}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Waste Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Type:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.wasteType || 'N/A'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Quantity:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.quantity || 'N/A'}</span></p>
                  {viewModal.description && (
                    <div className={`mt-2 p-3 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                      <p className={`text-xs font-medium mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Description</p>
                      <p className={`text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{viewModal.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Pickup Schedule</h4>
                <div className={`p-4 rounded-lg border space-y-3 ${dk('bg-slate-800 border-slate-700', 'bg-white border-slate-200 shadow-sm')}`}>
                  <div className="flex items-center gap-2.5">
                    <HiCalendar className={`w-5 h-5 ${dk('text-teal-400', 'text-teal-500')}`} />
                    <div>
                      <p className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>
                        {formatSchedule(viewModal.pickupTime)}
                      </p>
                      <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>Scheduled Pickup Time</p>
                    </div>
                  </div>
                  {viewModal.pickupNotes && (
                    <div className={`text-xs p-2 rounded ${dk('bg-slate-700 text-slate-300', 'bg-slate-100 text-slate-600')}`}>
                      {viewModal.pickupNotes}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Status Timeline</h4>
                <div className="space-y-0">
                  {['Requested', 'Scheduled', 'Picked Up', 'Completed'].map((s, i) => {
                    const idx = ['Requested', 'Scheduled', 'Picked Up', 'Completed'].indexOf(viewModal.status);
                    const done = i <= (viewModal.status === 'Cancelled' ? -1 : idx);
                    return (
                      <div key={s} className="flex items-start gap-3 pb-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            done ? 'bg-green-500 text-white' : dk('bg-slate-700 text-slate-500', 'bg-slate-200 text-slate-400')
                          }`}>
                            {done ? <HiCheckCircle className="w-4 h-4" /> : i + 1}
                          </div>
                          {i < 3 && <div className={`w-0.5 h-6 ${done ? 'bg-green-500' : dk('bg-slate-700', 'bg-slate-200')}`} />}
                        </div>
                        <div className="pt-0.5">
                          <p className={`text-sm font-medium ${done ? dk('text-slate-200', 'text-slate-800') : dk('text-slate-500', 'text-slate-400')}`}>{s}</p>
                        </div>
                      </div>
                    );
                  })}
                  {viewModal.status === 'Cancelled' && (
                    <div className="flex items-start gap-3 pb-3">
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white">
                          <HiXCircle className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-sm font-medium text-red-500">Cancelled</p>
                        {viewModal.cancellationReason && (
                          <p className={`text-xs mt-1 ${dk('text-slate-400', 'text-slate-500')}`}>Reason: {viewModal.cancellationReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Assigned Collector</h4>
                <div className={`p-4 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-white border-slate-200 shadow-sm')}`}>
                  {viewModal.assignedCollector ? (
                    <div className="space-y-1">
                      <p className={`font-medium text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{viewModal.assignedCollector.name}</p>
                      <p className={`text-xs font-mono ${dk('text-green-500', 'text-green-600')}`}>ID: {viewModal.assignedCollector.collectorId}</p>
                      <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Contact: {viewModal.assignedCollector.phone}</p>
                    </div>
                  ) : (
                    <p className={`text-sm italic ${dk('text-slate-500', 'text-slate-400')}`}>Not assigned to any collector yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};

export default HomePickupRequests;
