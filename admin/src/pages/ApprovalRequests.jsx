import { useEffect, useState, useCallback } from 'react';
import { HiCheckCircle, HiXCircle, HiEye, HiRefresh } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';

const ApprovalRequests = () => {
  const { dark } = useTheme();
  const { socket } = useSocket();
  const dk = (d, l) => (dark ? d : l);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!socket) return;
    socket.on('approval_request_created', fetchRequests);
    socket.on('approval_request_updated', fetchRequests);
    return () => {
      socket.off('approval_request_created', fetchRequests);
      socket.off('approval_request_updated', fetchRequests);
    };
  }, [socket, fetchRequests]);

  const review = async (request, action) => {
    setMessage('');
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`/api/admin/approval-requests/${request._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to update request.');
      setMessage(data.message);
      setSelected(null);
      fetchRequests();
    } catch (err) {
      setMessage(err.message || 'Unable to update request.');
    }
  };

  const rows = requests.map((r) => ({
    ...r,
    citizenName: r.citizen?.name || 'Unknown Citizen',
    phone: r.citizen?.phone || '-',
    currentVillage: r.type === 'village_change' ? r.currentVillage : r.citizen?.village || '-',
    requestedVillage: r.type === 'village_change' ? r.requestedVillage : '-',
    reason: r.reason || (r.type === 'email_change' ? `Email change to ${r.requestedEmail}` : '-'),
  }));

  const statusClass = (status) => {
    if (status === 'Approved') return dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700');
    if (status === 'Rejected') return dk('bg-red-900/40 text-red-400', 'bg-red-100 text-red-700');
    return dk('bg-amber-900/40 text-amber-300', 'bg-amber-100 text-amber-700');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Approval Requests</h1>
          <p className={`text-sm mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>
            Manage village changes and verified sensitive profile updates.
          </p>
        </div>
        <button type="button" onClick={fetchRequests}
          className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-green-500 transition">
          <HiRefresh className="h-4 w-4" /> Refresh
        </button>
      </div>

      {message && (
        <div className={`rounded-sm border px-4 py-2 text-sm ${message.includes('Unable') ? dk('bg-red-900/20 border-red-800 text-red-300', 'bg-red-50 border-red-200 text-red-700') : dk('bg-green-900/20 border-green-800 text-green-300', 'bg-green-50 border-green-200 text-green-700')}`}>
          {message}
        </div>
      )}

      <div className={`rounded-sm border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className={`text-center py-12 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            No approval requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('border-gray-800 text-slate-500', 'border-slate-100 text-slate-500')}`}>
                  {['Citizen Name', 'Phone Number', 'Current Village', 'Requested Village', 'Request Reason', 'Request Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className={`border-b align-top ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                    <td className={`px-4 py-3 font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{r.citizenName}</td>
                    <td className={`px-4 py-3 ${dk('text-slate-400', 'text-slate-600')}`}>{r.phone}</td>
                    <td className={`px-4 py-3 ${dk('text-slate-400', 'text-slate-600')}`}>{r.currentVillage || '-'}</td>
                    <td className={`px-4 py-3 ${dk('text-slate-400', 'text-slate-600')}`}>{r.requestedVillage || '-'}</td>
                    <td className={`px-4 py-3 max-w-xs ${dk('text-slate-400', 'text-slate-600')}`}>{r.reason}</td>
                    <td className={`px-4 py-3 text-xs ${dk('text-slate-500', 'text-slate-400')}`}>
                      {new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${statusClass(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setSelected(r)} title="View Details"
                          className={`h-8 w-8 rounded-sm flex items-center justify-center ${dk('bg-white/10 text-slate-300 hover:bg-white/20', 'bg-white border text-slate-600 hover:bg-slate-50')}`}>
                          <HiEye className="h-4 w-4" />
                        </button>
                        {r.status === 'Pending' && (
                          <>
                            <button type="button" onClick={() => review(r, 'approve')} title="Approve"
                              className="h-8 w-8 rounded-sm flex items-center justify-center bg-green-600 text-white hover:bg-green-500">
                              <HiCheckCircle className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => review(r, 'reject')} title="Reject"
                              className="h-8 w-8 rounded-sm flex items-center justify-center bg-red-600 text-white hover:bg-red-500">
                              <HiXCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-sm border shadow-2xl p-5 space-y-4 ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={`text-sm font-bold ${dk('text-slate-100', 'text-slate-800')}`}>Request Details</h2>
              <button type="button" onClick={() => setSelected(null)} className={dk('text-slate-400 hover:text-white', 'text-slate-400 hover:text-slate-700')}>x</button>
            </div>
            {[
              ['Citizen Name', selected.citizenName],
              ['Phone Number', selected.phone],
              ['Current Village', selected.currentVillage || '-'],
              ['Requested Village', selected.requestedVillage || '-'],
              ['Requested Email', selected.requestedEmail || '-'],
              ['Request Reason', selected.reason],
              ['Status', selected.status],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-3 text-sm">
                <span className={dk('text-slate-500', 'text-slate-400')}>{label}</span>
                <span className={`col-span-2 ${dk('text-slate-200', 'text-slate-700')}`}>{value}</span>
              </div>
            ))}
            {selected.status === 'Pending' && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button type="button" onClick={() => review(selected, 'reject')} className="flex-1 rounded-sm bg-red-600 text-white text-sm font-bold px-4 py-2.5 hover:bg-red-500">Reject</button>
                <button type="button" onClick={() => review(selected, 'approve')} className="flex-1 rounded-sm bg-green-600 text-white text-sm font-bold px-4 py-2.5 hover:bg-green-500">Approve</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRequests;
