import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { HiUser, HiMail, HiPhone, HiLocationMarker, HiBadgeCheck, HiShieldExclamation, HiTrash, HiBan, HiRefresh, HiSearch, HiX, HiPaperAirplane, HiExclamationCircle, HiCalendar, HiClock, HiHome, HiIdentification } from 'react-icons/hi';
import { API } from '../../shared/constants';

const STATUS_BADGE = {
  Active:    { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  Suspended: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  Deleted:   { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  Inactive:  { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
};

const SUSPEND_REASONS = [
  'Fake reporting activity',
  'Spam activity',
  'Misuse of platform',
  'Policy violation',
  'Suspicious behavior',
];

const DELETE_REASONS = [
  'Duplicate account',
  'Fake identity',
  'Severe policy violation',
  'Requested by citizen',
  'Permanent misuse',
];

const SUSPEND_DURATIONS = [
  { label: '1 Day', value: '1' },
  { label: '3 Days', value: '3' },
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Custom', value: 'Custom' },
];

const token = () => localStorage.getItem('adminToken');

const ManageCitizens = () => {
  const { toast, dark } = useOutletContext();
  const dk = (d, l) => dark ? d : l;

  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [detailCitizen, setDetailCitizen] = useState(null);
  const [notifyCitizen, setNotifyCitizen] = useState(null);
  const [suspendCitizen, setSuspendCitizen] = useState(null);
  const [deleteCitizen, setDeleteCitizen] = useState(null);

  const fetchCitizens = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res = await fetch(`${API}/api/admin/citizens?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCitizens(data.citizens);
      }
    } catch {}
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchCitizens(); }, [fetchCitizens]);

  const handleNotify = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`${API}/api/admin/citizen/${notifyCitizen._id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title: fd.get('title'), message: fd.get('message'), type: fd.get('type') }),
      });
      if (res.ok) {
        toast.success('Notification sent!');
        setNotifyCitizen(null);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to send');
      }
    } catch { toast.error('Network error'); }
  };

  const handleSuspend = async () => {
    if (!suspendCitizen) return;
    try {
      const res = await fetch(`${API}/api/admin/citizen/${suspendCitizen._id}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          reason: suspendCitizen.reason,
          duration: suspendCitizen.duration,
          customDays: suspendCitizen.customDays,
        }),
      });
      if (res.ok) {
        toast.success('Citizen suspended.');
        setSuspendCitizen(null);
        fetchCitizens();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to suspend');
      }
    } catch { toast.error('Network error'); }
  };

  const handleUnsuspend = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/citizen/${id}/unsuspend`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        toast.success('Citizen unsuspended.');
        fetchCitizens();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed');
      }
    } catch { toast.error('Network error'); }
  };

  const handleDelete = async () => {
    if (!deleteCitizen) return;
    try {
      const res = await fetch(`${API}/api/admin/citizen/${deleteCitizen._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ reason: deleteCitizen.reason }),
      });
      if (res.ok) {
        toast.success('Citizen deleted.');
        setDeleteCitizen(null);
        setDetailCitizen(null);
        fetchCitizens();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to delete');
      }
    } catch { toast.error('Network error'); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200', 'text-slate-800')}`}>Manage Citizens</h1>
          <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>
            {citizens.length} citizen{citizens.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={fetchCitizens}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ${dk('border-gray-700 text-slate-400 hover:text-green-400 hover:border-green-700', 'border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-300')}`}>
          <HiRefresh className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dk('text-slate-500', 'text-slate-400')}`} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, village..."
            className={`w-full h-10 pl-9 pr-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
              dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')
            }`} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className={`h-10 rounded-xl border text-sm px-3 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
            dk('bg-white/5 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-700')
          }`}>
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Deleted">Deleted</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className={`rounded-xl border p-4 animate-pulse ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${dk('bg-slate-700', 'bg-slate-200')}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 w-32 rounded ${dk('bg-slate-700', 'bg-slate-200')}`} />
                  <div className={`h-3 w-48 rounded ${dk('bg-slate-700', 'bg-slate-200')}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Citizens List */}
      {!loading && citizens.length === 0 && (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
          <HiUserGroupIcon className="mx-auto h-12 w-12 mb-3 opacity-30" />
          No citizens found.
        </div>
      )}

      <div className="space-y-2">
        {citizens.map(c => {
          const sb = STATUS_BADGE[c.accountStatus] || STATUS_BADGE.Inactive;
          return (
            <div key={c._id}
              className={`rounded-xl border p-4 transition hover:shadow-md cursor-pointer ${
                dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')
              }`}
              onClick={() => setDetailCitizen(c)}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(c.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{c.name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sb.bg} ${sb.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sb.dot}`} />
                      {c.accountStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {c.email && <span className={`text-xs flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}><HiMail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className={`text-xs flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}><HiPhone className="h-3 w-3" />{c.phone}</span>}
                    {c.village && <span className={`text-xs flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}><HiLocationMarker className="h-3 w-3" />{c.village}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {c.accountStatus === 'Active' && (
                    <>
                      <button onClick={() => setNotifyCitizen(c)}
                        className={`p-2 rounded-lg transition text-xs ${dk('text-slate-400 hover:text-blue-400 hover:bg-blue-900/20', 'text-slate-400 hover:text-blue-600 hover:bg-blue-50')}`}
                        title="Send Notification">
                        <HiPaperAirplane className="h-4 w-4" />
                      </button>
                      <button onClick={() => setSuspendCitizen({ ...c, reason: SUSPEND_REASONS[0], duration: '1', customDays: '' })}
                        className={`p-2 rounded-lg transition text-xs ${dk('text-slate-400 hover:text-orange-400 hover:bg-orange-900/20', 'text-slate-400 hover:text-orange-600 hover:bg-orange-50')}`}
                        title="Suspend Account">
                        <HiBan className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteCitizen({ ...c, reason: DELETE_REASONS[0] })}
                        className={`p-2 rounded-lg transition text-xs ${dk('text-slate-400 hover:text-red-400 hover:bg-red-900/20', 'text-slate-400 hover:text-red-600 hover:bg-red-50')}`}
                        title="Delete Account">
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {c.accountStatus === 'Suspended' && (
                    <button onClick={() => handleUnsuspend(c._id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                        dk('border-green-800/50 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')
                      }`}>
                      Unsuspend
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {detailCitizen && <DetailModal citizen={detailCitizen} onClose={() => setDetailCitizen(null)} dk={dk}
        onNotify={() => { const c = detailCitizen; setDetailCitizen(null); setNotifyCitizen(c); }}
        onSuspend={() => { const c = detailCitizen; setDetailCitizen(null); setSuspendCitizen({ ...c, reason: SUSPEND_REASONS[0], duration: '1', customDays: '' }); }}
        onDelete={() => { const c = detailCitizen; setDetailCitizen(null); setDeleteCitizen({ ...c, reason: DELETE_REASONS[0] }); }}
        onUnsuspend={() => { handleUnsuspend(detailCitizen._id); setDetailCitizen(null); }}
      />}

      {/* Notification Modal */}
      {notifyCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setNotifyCitizen(null)}>
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${dk('bg-[#0d0d0d] border-white/[0.08]', 'bg-white border-slate-200')}`}
            onClick={e => e.stopPropagation()}>
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-blue-400" />
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-bold ${dk('text-white', 'text-slate-900')}`}>
                  Send Notification
                </h3>
                <button onClick={() => setNotifyCitizen(null)}
                  className={`p-1.5 rounded-lg transition ${dk('text-slate-500 hover:bg-white/5', 'text-slate-400 hover:bg-slate-100')}`}>
                  <HiX className="h-5 w-5" />
                </button>
              </div>
              <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${dk('bg-white/5', 'bg-slate-50')}`}>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(notifyCitizen.name || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{notifyCitizen.name}</p>
                  <p className={`text-xs truncate ${dk('text-slate-500', 'text-slate-400')}`}>{notifyCitizen.email || notifyCitizen.phone}</p>
                </div>
              </div>
              <form onSubmit={handleNotify} className="space-y-3">
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Type</label>
                  <select name="type" defaultValue="warning"
                    className={`w-full h-9 rounded-lg border text-sm px-3 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                      dk('bg-white/5 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-700')
                    }`}>
                    <option value="warning">Warning</option>
                    <option value="Information">Information</option>
                    <option value="System">System</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Title</label>
                  <input name="title" required
                    className={`w-full h-9 rounded-lg border text-sm px-3 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                      dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')
                    }`}
                    placeholder="Notification title" />
                </div>
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Message</label>
                  <textarea name="message" required rows={3}
                    className={`w-full rounded-lg border text-sm px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none ${
                      dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')
                    }`}
                    placeholder="Notification message" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setNotifyCitizen(null)}
                    className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition ${
                      dk('border-gray-700 text-slate-300 hover:bg-white/5', 'border-slate-200 text-slate-600 hover:bg-slate-50')
                    }`}>
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 h-9 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition shadow-lg flex items-center justify-center gap-1.5">
                    <HiPaperAirplane className="h-3.5 w-3.5" /> Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setSuspendCitizen(null)}>
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${dk('bg-[#0d0d0d] border-white/[0.08]', 'bg-white border-slate-200')}`}
            onClick={e => e.stopPropagation()}>
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-red-500" />
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-bold ${dk('text-white', 'text-slate-900')}`}>
                  Suspend Account
                </h3>
                <button onClick={() => setSuspendCitizen(null)}
                  className={`p-1.5 rounded-lg transition ${dk('text-slate-500 hover:bg-white/5', 'text-slate-400 hover:bg-slate-100')}`}>
                  <HiX className="h-5 w-5" />
                </button>
              </div>
              <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${dk('bg-white/5', 'bg-slate-50')}`}>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(suspendCitizen.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{suspendCitizen.name}</p>
                  <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{suspendCitizen.email || suspendCitizen.phone}</p>
                </div>
              </div>
              <div className={`p-3 rounded-xl mb-4 flex items-start gap-2 ${dk('bg-orange-900/20 text-orange-400', 'bg-orange-50 text-orange-700')}`}>
                <HiExclamationCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">This will restrict the citizen from accessing their account until the suspension period ends.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Reason</label>
                  <select value={suspendCitizen.reason} onChange={e => setSuspendCitizen(p => ({ ...p, reason: e.target.value }))}
                    className={`w-full h-9 rounded-lg border text-sm px-3 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                      dk('bg-white/5 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-700')
                    }`}>
                    {SUSPEND_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="__custom__">Custom reason...</option>
                  </select>
                </div>
                {suspendCitizen.reason === '__custom__' && (
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Custom Reason</label>
                    <textarea value={suspendCitizen.customReason || ''} onChange={e => setSuspendCitizen(p => ({ ...p, customReason: e.target.value }))}
                      rows={2}
                      className={`w-full rounded-lg border text-sm px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none ${
                        dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')
                      }`}
                      placeholder="Enter custom reason..." />
                  </div>
                )}
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Duration</label>
                  <select value={suspendCitizen.duration} onChange={e => setSuspendCitizen(p => ({ ...p, duration: e.target.value }))}
                    className={`w-full h-9 rounded-lg border text-sm px-3 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                      dk('bg-white/5 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-700')
                    }`}>
                    {SUSPEND_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                {suspendCitizen.duration === 'Custom' && (
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Custom Days</label>
                    <input type="number" min="1" value={suspendCitizen.customDays} onChange={e => setSuspendCitizen(p => ({ ...p, customDays: e.target.value }))}
                      className={`w-full h-9 rounded-lg border text-sm px-3 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                        dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')
                      }`}
                      placeholder="Number of days" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setSuspendCitizen(null)}
                  className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition ${
                    dk('border-gray-700 text-slate-300 hover:bg-white/5', 'border-slate-200 text-slate-600 hover:bg-slate-50')
                  }`}>
                  Cancel
                </button>
                <button onClick={handleSuspend}
                  className="flex-1 h-9 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition shadow-lg flex items-center justify-center gap-1.5">
                  <HiBan className="h-3.5 w-3.5" /> Suspend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setDeleteCitizen(null)}>
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${dk('bg-[#0d0d0d] border-white/[0.08]', 'bg-white border-slate-200')}`}
            onClick={e => e.stopPropagation()}>
            <div className="h-1.5 w-full bg-gradient-to-r from-red-600 to-red-400" />
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-bold ${dk('text-white', 'text-slate-900')}`}>
                  Delete Account
                </h3>
                <button onClick={() => setDeleteCitizen(null)}
                  className={`p-1.5 rounded-lg transition ${dk('text-slate-500 hover:bg-white/5', 'text-slate-400 hover:bg-slate-100')}`}>
                  <HiX className="h-5 w-5" />
                </button>
              </div>
              <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${dk('bg-white/5', 'bg-slate-50')}`}>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(deleteCitizen.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{deleteCitizen.name}</p>
                  <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{deleteCitizen.email || deleteCitizen.phone}</p>
                </div>
              </div>
              <div className={`p-3 rounded-xl mb-4 flex items-start gap-2 ${dk('bg-red-900/20 text-red-400', 'bg-red-50 text-red-700')}`}>
                <HiExclamationCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">This action is irreversible. The citizen will permanently lose access to their account.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Reason</label>
                  <select value={deleteCitizen.reason} onChange={e => setDeleteCitizen(p => ({ ...p, reason: e.target.value }))}
                    className={`w-full h-9 rounded-lg border text-sm px-3 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                      dk('bg-white/5 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-700')
                    }`}>
                    {DELETE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="__custom__">Custom reason...</option>
                  </select>
                </div>
                {deleteCitizen.reason === '__custom__' && (
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${dk('text-slate-400', 'text-slate-600')}`}>Custom Reason</label>
                    <textarea value={deleteCitizen.customReason || ''} onChange={e => setDeleteCitizen(p => ({ ...p, customReason: e.target.value }))}
                      rows={2}
                      className={`w-full rounded-lg border text-sm px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none ${
                        dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')
                      }`}
                      placeholder="Enter custom reason..." />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setDeleteCitizen(null)}
                  className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition ${
                    dk('border-gray-700 text-slate-300 hover:bg-white/5', 'border-slate-200 text-slate-600 hover:bg-slate-50')
                  }`}>
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 h-9 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition shadow-lg flex items-center justify-center gap-1.5">
                  <HiTrash className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HiUserGroupIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const DetailModal = ({ citizen, onClose, dk, onNotify, onSuspend, onDelete, onUnsuspend }) => {
  const sb = STATUS_BADGE[citizen.accountStatus] || STATUS_BADGE.Inactive;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={onClose}>
      <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${dk('bg-[#0d0d0d] border-white/[0.08]', 'bg-white border-slate-200')}`}
        onClick={e => e.stopPropagation()}>
        <div className="h-1.5 w-full bg-gradient-to-r from-green-500 to-green-400" />
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-base font-bold ${dk('text-white', 'text-slate-900')}`}>
              Citizen Details
            </h3>
            <button onClick={onClose}
              className={`p-1.5 rounded-lg transition ${dk('text-slate-500 hover:bg-white/5', 'text-slate-400 hover:bg-slate-100')}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>

          {/* Avatar + Name */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {(citizen.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className={`text-base font-bold ${dk('text-slate-100', 'text-slate-900')}`}>{citizen.name}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sb.bg} ${sb.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sb.dot}`} />
                {citizen.accountStatus}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5`}>
            <DetailField icon={<HiMail />} label="Email" value={citizen.email || '—'} dk={dk} />
            <DetailField icon={<HiPhone />} label="Phone" value={citizen.phone || '—'} dk={dk} />
            <DetailField icon={<HiLocationMarker />} label="Village" value={citizen.village || '—'} dk={dk} />
            <DetailField icon={<HiHome />} label="Home Address" value={citizen.homeAddress || '—'} dk={dk} />
            <DetailField icon={<HiIdentification />} label="House No" value={citizen.houseNo || '—'} dk={dk} />
            <DetailField icon={<HiLocationMarker />} label="Street / Area" value={citizen.streetArea || '—'} dk={dk} />
            <DetailField icon={<HiBadgeCheck />} label="Address Type" value={citizen.addressType || '—'} dk={dk} />
            <DetailField icon={<HiLocationMarker />} label="Landmark" value={citizen.landmark || '—'} dk={dk} />
            <DetailField icon={<HiCalendar />} label="Joined" value={citizen.createdAt ? new Date(citizen.createdAt).toLocaleDateString('en-IN') : '—'} dk={dk} />
            <DetailField icon={<HiClock />} label="Last Active" value={citizen.lastActiveDate ? new Date(citizen.lastActiveDate).toLocaleDateString('en-IN') : '—'} dk={dk} />
            <DetailField icon={<HiBadgeCheck />} label="Verified" value={citizen.isVerified ? 'Yes' : 'No'} dk={dk} />
            <DetailField icon={<HiUser />} label="Locality" value={citizen.locality || '—'} dk={dk} />
          </div>

          {/* Suspension Info */}
          {citizen.accountStatus === 'Suspended' && citizen.suspensionReason && (
            <div className={`p-3 rounded-xl mb-4 flex items-start gap-2 ${dk('bg-orange-900/20 text-orange-400', 'bg-orange-50 text-orange-700')}`}>
              <HiBan className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold">Suspended</p>
                <p className="text-xs mt-0.5">Reason: {citizen.suspensionReason}</p>
                {citizen.suspendedUntil && (
                  <p className="text-xs">Until: {new Date(citizen.suspendedUntil).toLocaleDateString('en-IN')}</p>
                )}
              </div>
            </div>
          )}

          {citizen.accountStatus === 'Deleted' && citizen.deletionReason && (
            <div className={`p-3 rounded-xl mb-4 flex items-start gap-2 ${dk('bg-red-900/20 text-red-400', 'bg-red-50 text-red-700')}`}>
              <HiTrash className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold">Deleted</p>
                <p className="text-xs mt-0.5">Reason: {citizen.deletionReason}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {citizen.accountStatus === 'Active' && (
              <>
                <button onClick={onNotify}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition flex items-center gap-1.5 ${
                    dk('border-blue-800/50 text-blue-400 hover:bg-blue-900/30', 'border-blue-200 text-blue-600 hover:bg-blue-50')
                  }`}>
                  <HiPaperAirplane className="h-3.5 w-3.5" /> Send Notification
                </button>
                <button onClick={onSuspend}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition flex items-center gap-1.5 ${
                    dk('border-orange-800/50 text-orange-400 hover:bg-orange-900/30', 'border-orange-200 text-orange-600 hover:bg-orange-50')
                  }`}>
                  <HiBan className="h-3.5 w-3.5" /> Suspend
                </button>
                <button onClick={onDelete}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition flex items-center gap-1.5 ${
                    dk('border-red-800/50 text-red-400 hover:bg-red-900/30', 'border-red-200 text-red-600 hover:bg-red-50')
                  }`}>
                  <HiTrash className="h-3.5 w-3.5" /> Delete
                </button>
              </>
            )}
            {citizen.accountStatus === 'Suspended' && (
              <button onClick={onUnsuspend}
                className={`text-xs font-semibold px-3 py-2 rounded-lg border transition flex items-center gap-1.5 ${
                  dk('border-green-800/50 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')
                }`}>
                <HiBadgeCheck className="h-3.5 w-3.5" /> Unsuspend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailField = ({ icon, label, value, dk }) => (
  <div className={`flex items-start gap-2 p-2.5 rounded-lg ${dk('bg-white/5', 'bg-slate-50')}`}>
    <span className={`mt-0.5 ${dk('text-green-400', 'text-green-600')}`}>{icon}</span>
    <div className="min-w-0">
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${dk('text-slate-500', 'text-slate-400')}`}>{label}</p>
      <p className={`text-xs mt-0.5 break-words ${dk('text-slate-200', 'text-slate-800')}`}>{value}</p>
    </div>
  </div>
);

export default ManageCitizens;
