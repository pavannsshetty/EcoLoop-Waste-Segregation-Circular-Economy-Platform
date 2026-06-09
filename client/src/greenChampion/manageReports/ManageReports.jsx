import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HiSearch, HiEye, HiX, HiExclamationCircle, HiLocationMarker, HiClipboardCheck, HiCheckCircle, HiClock, HiXCircle } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import { useToast } from '../../shared/components/Toast';
import socket from '../../socket';

const STATUS_BADGE = {
  'Submitted': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Assigned': 'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-orange-100 text-orange-700 border-orange-200',
  'Resolved': 'bg-green-100 text-green-700 border-green-200',
  'Picked Up': 'bg-teal-100 text-teal-700 border-teal-200',
  'Cancelled': 'bg-slate-100 text-slate-600 border-slate-200',
  'Rejected': 'bg-red-100 text-red-700 border-red-200',
};

const ModalShell = ({ title, children, onClose, dark, width = 'max-w-4xl' }) => (
  createPortal(
    <div className="fixed inset-0 z-[9999] flex p-4 sm:p-6 bg-black/60 overflow-y-auto" onClick={(e) => { if (e.target === e.target.currentTarget) onClose(); }}>
      <div className={`relative m-auto w-full sm:max-w-[90vw] md:max-w-4xl max-h-full flex flex-col rounded-lg border shadow-2xl ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex justify-between items-center shrink-0 rounded-t-lg sticky top-0 z-10 ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <h2 className={`text-lg font-bold truncate ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition shrink-0 ${dark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  )
);

const StatCard = ({ label, value, icon: Icon, gradient }) => (
  <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: gradient }}>
    <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-medium tracking-wider text-white/70">{label}</p>
      <p className="text-lg font-semibold text-white truncate">{value}</p>
    </div>
  </div>
);

const ManageReports = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ pendingReports: 0, resolvedReports: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const token = localStorage.getItem('token');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/green-champion/reports/manage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error (${res.status})`);
      }
      const data = await res.json();
      setReports(data.reports || []);
      setStats(data.stats || { pendingReports: 0, resolvedReports: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchReports();
    ['report_updated', 'report_created', 'WASTE_REPORT_UPDATED'].forEach((e) => socket.on(e, refresh));
    return () => { ['report_updated', 'report_created', 'WASTE_REPORT_UPDATED'].forEach((e) => socket.off(e, refresh)); };
  }, [socket, fetchReports]);

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter((r) =>
      [r.reportId, r.wasteType, r.status, r.citizenName, r.village, r.location?.address]
        .some((f) => f?.toLowerCase().includes(q))
    );
  }, [reports, search]);

  const handleVerify = async (reportId, status, commentText) => {
    setVerifying(true);
    try {
      const res = await fetch(`${API}/api/green-champion/report/${reportId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, comment: commentText || `Marked as ${status} by Green Champion` }),
      });
      if (res.ok) {
        toast.success(`Report ${status} successfully!`);
        setViewModal(null);
        setRejectModal(null);
        setRejectReason('');
        fetchReports();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Verification failed.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return dk('bg-blue-900/50 text-blue-400', 'bg-blue-100 text-blue-800');
      case 'Assigned': return dk('bg-purple-900/50 text-purple-400', 'bg-purple-100 text-purple-800');
      case 'In Progress': return dk('bg-amber-900/50 text-amber-500', 'bg-amber-100 text-amber-800');
      case 'Resolved': return dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800');
      case 'Cancelled': return dk('bg-slate-800 text-slate-400', 'bg-slate-200 text-slate-700');
      case 'Rejected': return dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800');
      default: return dk('bg-gray-800 text-gray-400', 'bg-gray-100 text-gray-800');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Manage Reports</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Monitor and verify waste reports in your village</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Pending Reports"
          value={stats.pendingReports}
          icon={HiClock}
          gradient={dark ? 'linear-gradient(135deg, #b85a00 0%, #d9730a 100%)' : 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)'}
        />
        <StatCard
          label="Resolved Reports"
          value={stats.resolvedReports}
          icon={HiCheckCircle}
          gradient={dark ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)' : 'linear-gradient(135deg, #22C55E 0%, #059669 100%)'}
        />
      </div>

      {error && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-3 ${dk('bg-red-900/20 border-red-800', 'bg-red-50 border-red-200')}`}>
          <HiExclamationCircle className={`h-5 w-5 shrink-0 ${dk('text-red-400', 'text-red-500')}`} />
          <span className={dk('text-red-400', 'text-red-700')}>{error}</span>
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
          placeholder="Search by ID, citizen, waste type, status..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>All Reports</h2>
          <span className={`text-xs font-medium ${dk('text-slate-500', 'text-slate-500')}`}>
            {search ? `${filteredReports.length} of ${reports.length}` : `${reports.length} reports`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            {search ? `No reports matching "${search}".` : 'No reports found in your village.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Report ID</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Citizen Name</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Waste Type</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 text-right font-semibold whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r) => (
                    <tr key={r._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-slate-50')}`}>
                      <td className={`px-5 py-4 whitespace-nowrap font-mono font-bold ${dk('text-green-400', 'text-green-600')}`}>
                        {r.reportId || r._id.slice(-8)}
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>
                        {r.citizenName}
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap ${dk('text-slate-300', 'text-slate-700')}`}>
                        {r.wasteType}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap text-xs ${dk('text-slate-400', 'text-slate-500')}`}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setViewModal(r)}
                          className={`p-2 rounded-lg border transition inline-flex items-center gap-1.5 ${dk('border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700', 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800')}`}
                        >
                          <HiEye className="w-4 h-4" /> <span className="text-xs font-medium">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`md:hidden divide-y ${dk('divide-gray-800', 'divide-slate-100')}`}>
              {filteredReports.map((r) => (
                <div key={r._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-green-600">{r.reportId || 'ECO-PENDING'}</p>
                      <p className={`mt-1 font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{r.wasteType}</p>
                      <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{r.citizenName}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(r.status)}`}>{r.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{new Date(r.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => setViewModal(r)}
                      className={`p-2 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200', 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700')}`}
                    >
                      <HiEye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={() => setRejectModal(null)}>
          <div className={`w-full max-w-md rounded-lg border shadow-2xl p-5 space-y-4 ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-sm font-bold ${dark ? 'text-slate-100' : 'text-slate-800'}`}>Reject Report</h2>
            <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Provide a reason for rejecting this report.
            </p>
            <div>
              <label className={`text-xs font-semibold block mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Rejection Reason</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                rows={3} placeholder="Explain why this report is being rejected..."
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${dark ? 'bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button onClick={() => setRejectModal(null)}
                className={`flex-1 rounded-lg border text-sm font-semibold px-4 py-2.5 ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
              <button onClick={() => handleVerify(rejectModal._id, 'Rejected', rejectReason.trim() || 'Rejected by Green Champion')} disabled={verifying}
                className="flex-1 rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-red-500 disabled:opacity-50">
                {verifying ? 'Rejecting...' : 'Reject Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModal && (
        <ModalShell
          onClose={() => setViewModal(null)}
          title={`Report Details — ${viewModal.reportId || 'ECO-PENDING'}`}
          dark={dark}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Report Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className={`inline-block w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Report ID:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.reportId || '-'}</span></p>
                  <p><span className={`inline-block w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Waste Type:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.wasteType}</span></p>
                  <p><span className={`inline-block w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Citizen:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.citizenName}</span></p>
                  <p><span className={`inline-block w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Report Type:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.reportType || 'Public'}</span></p>
                  <p><span className={`inline-block w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Severity:</span> <span className={`font-semibold ${
                    viewModal.severity === 'High' ? 'text-red-500' : viewModal.severity === 'Medium' ? 'text-amber-500' : 'text-green-500'
                  }`}>{viewModal.severity}</span></p>
                  <p><span className={`inline-block w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Submitted:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{new Date(viewModal.createdAt).toLocaleString()}</span></p>
                  <p><span className={`inline-block w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Status:</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ml-2 ${getStatusColor(viewModal.status)}`}>{viewModal.status}</span>
                  </p>
                </div>
              </div>

              {viewModal.description && (
                <div>
                  <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Description</h4>
                  <div className={`p-3 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                    <p className={`text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{viewModal.description}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Location</h4>
                <div className={`p-3 rounded-lg border flex gap-3 ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                  <HiLocationMarker className={`w-5 h-5 shrink-0 ${dk('text-red-400', 'text-red-500')}`} />
                  <div>
                    <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{viewModal.location?.address || 'N/A'}</p>
                    <p className={`text-xs mt-1 font-mono ${dk('text-slate-500', 'text-slate-500')}`}>Lat: {viewModal.location?.lat}, Lng: {viewModal.location?.lng}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Evidence Photo</h4>
                {viewModal.image ? (
                  <div className={`rounded-lg overflow-hidden border shadow-sm ${dk('border-gray-700', 'border-slate-200')}`}>
                    <img src={viewModal.image} alt="Waste evidence" className="w-full h-auto object-cover max-h-72" />
                  </div>
                ) : (
                  <div className={`h-40 rounded-lg flex items-center justify-center border border-dashed ${dk('border-slate-700 bg-slate-800', 'border-slate-300 bg-slate-50')}`}>
                    <p className={`text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No image uploaded</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>GC Verification</h4>
                <div className={`p-4 rounded-lg border space-y-3 ${dk('bg-slate-800/50 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Verification Status:</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      viewModal.gcVerification?.status === 'Verified' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800') :
                      viewModal.gcVerification?.status === 'Rejected' ? dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800') :
                      dk('bg-yellow-900/50 text-yellow-400', 'bg-yellow-100 text-yellow-800')
                    }`}>
                      {viewModal.gcVerification?.status || 'Pending'}
                    </span>
                  </div>
                  {viewModal.gcVerification?.comment && (
                    <p className={`text-xs ${dk('text-slate-400', 'text-slate-600')}`}>{viewModal.gcVerification.comment}</p>
                  )}
                </div>
              </div>

              {viewModal.status !== 'Resolved' && viewModal.status !== 'Cancelled' && viewModal.status !== 'Rejected' && (
                <div>
                  <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Actions</h4>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleVerify(viewModal._id, 'Verified', '')}
                      disabled={verifying}
                      className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <HiCheckCircle className="h-4 w-4" />
                      {verifying ? 'Verifying...' : 'Verify Report'}
                    </button>
                    <button
                      onClick={() => { setRejectModal(viewModal); setRejectReason(''); }}
                      className="w-full py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2"
                    >
                      <HiXCircle className="h-4 w-4" />
                      Reject Report
                    </button>
                  </div>
                </div>
              )}

              {viewModal.gcVerification?.status === 'Verified' && (
                <div className={`p-4 rounded-lg border ${dk('bg-green-900/20 border-green-800', 'bg-green-50 border-green-200')}`}>
                  <p className={`text-xs font-semibold ${dk('text-green-400', 'text-green-700')}`}>
                    <HiCheckCircle className="inline h-4 w-4 mr-1" /> Verified
                  </p>
                  {viewModal.gcVerification?.comment && (
                    <p className={`text-xs mt-1 ${dk('text-green-300', 'text-green-600')}`}>{viewModal.gcVerification.comment}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default ManageReports;
