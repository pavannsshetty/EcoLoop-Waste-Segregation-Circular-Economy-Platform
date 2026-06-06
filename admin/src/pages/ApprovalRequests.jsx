import { useEffect, useState, useCallback, useMemo } from 'react';
import { HiCheckCircle, HiXCircle, HiEye } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';

const CITIZEN_TYPES = ['village_change', 'email_change', 'account_deletion'];

const fmtDate = (d) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtTime = (d) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const groupLabel = (dateStr) => {
  const today = fmtDate(new Date());
  const yesterday = fmtDate(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return dateStr;
};

const ApprovalRequests = () => {
  const { dark } = useTheme();
  const { socket } = useSocket();
  const dk = (d, l) => (dark ? d : l);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [reviewAction, setReviewAction] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/approval-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => { fetchRequests(); };
    socket.on('approval_request_created', handler);
    socket.on('approval_request_updated', handler);
    return () => {
      socket.off('approval_request_created', handler);
      socket.off('approval_request_updated', handler);
    };
  }, [socket, fetchRequests]);

  const rows = useMemo(() => {
    const citizenRequests = requests.filter((r) => CITIZEN_TYPES.includes(r.type));
    return citizenRequests.map((r) => {
      const created = new Date(r.createdAt);
      const dateStr = fmtDate(created);
      let detail = '';
      if (r.type === 'village_change') {
        detail = `Village change: ${r.currentVillage || r.citizen?.village || '-'} → ${r.requestedVillage || '-'}`;
      } else if (r.type === 'email_change') {
        detail = `Email change to ${r.requestedEmail}`;
      } else if (r.type === 'account_deletion') {
        detail = 'Account deletion request';
      }
      return { ...r, citizenName: r.citizen?.name || 'Unknown', phone: r.citizen?.phone || '-', dateStr, timeStr: fmtTime(created), detail };
    });
  }, [requests]);

  const grouped = useMemo(() => {
    const groups = {};
    rows.forEach((r) => {
      const label = groupLabel(r.dateStr);
      if (!groups[label]) groups[label] = [];
      groups[label].push(r);
    });
    const order = ['Today', 'Yesterday'];
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return new Date(b) - new Date(a);
    });
  }, [rows]);

  const statusClass = (status) => {
    if (status === 'Approved') return dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700');
    if (status === 'Rejected') return dk('bg-red-900/40 text-red-400', 'bg-red-100 text-red-700');
    return dk('bg-amber-900/40 text-amber-300', 'bg-amber-100 text-amber-700');
  };

  const typeLabel = (type) => {
    if (type === 'village_change') return 'Village Change';
    if (type === 'email_change') return 'Email Change';
    if (type === 'account_deletion') return 'Account Deletion';
    return type;
  };

  const typeColor = (type) => {
    if (type === 'village_change') return dk('bg-blue-900/40 text-blue-300', 'bg-blue-100 text-blue-700');
    if (type === 'email_change') return dk('bg-purple-900/40 text-purple-300', 'bg-purple-100 text-purple-700');
    if (type === 'account_deletion') return dk('bg-red-900/40 text-red-300', 'bg-red-100 text-red-700');
    return '';
  };

  const countPending = rows.filter((r) => r.status === 'Pending').length;

  const openReview = (r, action) => {
    setSelected(r);
    setReviewAction(action);
    setAdminNote('');
  };

  const confirmReview = async () => {
    if (!selected || !reviewAction) return;
    setMessage('');
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`/api/admin/approval-requests/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: reviewAction, adminNote: adminNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to update request.');
      setMessage(data.message);
      setSelected(null);
      setReviewAction(null);
      setAdminNote('');
      fetchRequests();
    } catch (err) {
      setMessage(err.message || 'Unable to update request.');
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Approval Requests</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>
            Manage village changes, email changes, and account deletion requests.
          </p>
        </div>
        {!loading && <span className={`text-xs font-medium px-3 py-1 rounded-full ${dk('bg-amber-900/30 text-amber-300', 'bg-amber-50 text-amber-700')}`}>{countPending} pending</span>}
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-2 text-sm ${message.includes('Unable') ? dk('bg-red-900/20 border-red-800 text-red-300', 'bg-red-50 border-red-200 text-red-700') : dk('bg-green-900/20 border-green-800 text-green-300', 'bg-green-50 border-green-200 text-green-700')}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className={`text-center py-12 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
          No citizen approval requests found.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, items]) => (
            <div key={label}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                {label} <span className="font-normal normal-case">({items.length})</span>
              </h3>
              <div className="space-y-3">
                {items.map((r) => (
                  <div key={r._id} className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${dk('border-gray-800', 'border-slate-100')}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-sm font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{r.citizenName}</p>
                        <span className="hidden sm:inline text-xs text-slate-500">•</span>
                        <span className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{r.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${typeColor(r.type)}`}>{typeLabel(r.type)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusClass(r.status)}`}>{r.status}</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                        <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{r.detail}</p>
                        <span className={`text-[11px] whitespace-nowrap ${dk('text-slate-500', 'text-slate-400')}`}>{r.timeStr}</span>
                      </div>
                      {r.status === 'Rejected' && r.adminNote && (
                        <p className={`text-xs italic ${dk('text-slate-500', 'text-slate-400')}`}>Admin note: {r.adminNote}</p>
                      )}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setSelected(r); setReviewAction(null); setAdminNote(''); }} title="View Details"
                          className={`h-9 w-9 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center ${dk('bg-white/10 text-slate-300 hover:bg-white/20', 'bg-white border text-slate-600 hover:bg-slate-50')}`}>
                          <HiEye className="h-4 w-4" />
                        </button>
                        {r.status === 'Pending' && (
                          <>
                            <button type="button" onClick={() => openReview(r, 'approve')} title="Approve"
                              className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center bg-green-600 text-white hover:bg-green-500">
                              <HiCheckCircle className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => openReview(r, 'reject')} title="Reject"
                              className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center bg-red-600 text-white hover:bg-red-500">
                              <HiXCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && !reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-[95vw] sm:max-w-lg rounded-lg border shadow-2xl p-4 sm:p-5 space-y-4 ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={`text-sm font-bold ${dk('text-slate-100', 'text-slate-800')}`}>Request Details</h2>
              <button type="button" onClick={() => setSelected(null)} className={dk('text-slate-400 hover:text-white', 'text-slate-400 hover:text-slate-700')}>x</button>
            </div>
            {[
              ['Citizen Name', selected.citizenName],
              ['Phone Number', selected.phone],
              ['Type', typeLabel(selected.type)],
              ...(selected.type === 'village_change' ? [['Current Village', selected.currentVillage || selected.citizen?.village || '-'], ['Requested Village', selected.requestedVillage || '-']] : []),
              ...(selected.type === 'email_change' ? [['Requested Email', selected.requestedEmail || '-']] : []),
              ['Reason', selected.reason || (selected.type === 'account_deletion' ? 'Citizen requested account deletion.' : '-')],
              ['Status', selected.status],
              ['Submitted', `${selected.dateStr} at ${selected.timeStr}`],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 text-sm">
                <span className={dk('text-slate-500', 'text-slate-400')}>{label}</span>
                <span className={`col-span-2 ${dk('text-slate-200', 'text-slate-700')}`}>{value}</span>
              </div>
            ))}
            {selected.status === 'Pending' && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button type="button" onClick={() => openReview(selected, 'reject')} className="flex-1 rounded-lg bg-red-600 text-white text-sm font-bold px-4 py-2.5 hover:bg-red-500">Reject</button>
                <button type="button" onClick={() => openReview(selected, 'approve')} className="flex-1 rounded-lg bg-green-600 text-white text-sm font-bold px-4 py-2.5 hover:bg-green-500">Approve</button>
              </div>
            )}
          </div>
        </div>
      )}

      {selected && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-[95vw] sm:max-w-sm rounded-lg border shadow-2xl p-4 sm:p-5 space-y-4 ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={`text-sm font-bold ${dk('text-slate-100', 'text-slate-800')}`}>{reviewAction === 'approve' ? 'Approve' : 'Reject'} Request</h2>
              <button type="button" onClick={() => { setSelected(null); setReviewAction(null); }} className={dk('text-slate-400 hover:text-white', 'text-slate-400 hover:text-slate-700')}>x</button>
            </div>
            <p className={`text-sm ${dk('text-slate-300', 'text-slate-600')}`}>
              {reviewAction === 'approve' ? 'Confirm approval of this request.' : 'Confirm rejection of this request.'}
            </p>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Admin Note (optional)</label>
              <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} placeholder="Add a note..."
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none ${dk('bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')}`} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => { setSelected(null); setReviewAction(null); }}
                className={`flex-1 rounded-lg border text-sm font-semibold px-4 py-2.5 ${dk('border-slate-600 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>Cancel</button>
              <button type="button" onClick={confirmReview}
                className={`flex-1 rounded-lg text-white text-sm font-bold px-4 py-2.5 ${reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>{reviewAction === 'approve' ? 'Approve' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRequests;