import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { HiEye, HiX, HiExclamationCircle, HiLocationMarker, HiSearch } from 'react-icons/hi';
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

const Reports = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState(null);

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter((r) =>
      [r.reportId, r.wasteType, r.status, r.village, r.location?.address, r.userId?.name, r.userId?.phone]
        .some((f) => f?.toLowerCase().includes(q))
    );
  }, [reports, search]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        navigate('/admin/login');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error (${res.status})`);
      }
      const d = await res.json();
      setReports(d.reports || []);
    } catch (err) {
      console.error('[Reports] fetch error:', err);
      setError(err.message || 'Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return dk('bg-blue-900/50 text-blue-400', 'bg-blue-100 text-blue-800');
      case 'Assigned': return dk('bg-purple-900/50 text-purple-400', 'bg-purple-100 text-purple-800');
      case 'In Progress': return dk('bg-amber-900/50 text-amber-500', 'bg-amber-100 text-amber-800');
      case 'Resolved': return dk('bg-green-500/50 text-green-500', 'bg-green-500 text-green-500');
      case 'Cancelled': return dk('bg-slate-800 text-slate-400', 'bg-slate-200 text-slate-700');
      default: return dk('bg-gray-800 text-gray-400', 'bg-gray-100 text-gray-800');
    }
  };

  const getSeverityColor = (svr) => {
    switch (svr) {
      case 'High': return 'text-red-500';
      case 'Medium': return 'text-amber-500';
      case 'Low': return 'text-green-500';
      default: return dk('text-slate-400', 'text-slate-500');
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Citizen Reports</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Track and manage all waste reports across the platform</p>
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
          placeholder="Search by ID, citizen, waste type, status, village..."
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
            {search ? `No reports matching "${search}".` : 'No reports found.'}
          </div>
        ) : (
          <>
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Report ID</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Citizen</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Waste Details</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Location (Village)</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Assigned Collector</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-slate-50')}`}>
                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-green-600">
                      {r.reportId || 'ECO-PENDING'}
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>
                      {new Date(r.createdAt).toLocaleDateString()}<br/>
                      <span className="text-xs opacity-70">{new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {r.userId ? (
                        <>
                          <p className={`font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{r.userId.name}</p>
                          <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{r.userId.phone}</p>
                        </>
                      ) : <span className={dk('text-slate-500', 'text-slate-400')}>Unknown</span>}
                    </td>
                    <td className="px-5 py-4">
                      <p className={`font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{r.wasteType}</p>
                       <p className="text-xs mt-0.5 flex items-center gap-1">
                        <span className="font-medium">Severity:</span> <span className={`font-semibold ${getSeverityColor(r.severity)}`}>{r.severity}</span>
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className={`line-clamp-2 max-w-[200px] leading-tight ${dk('text-slate-300', 'text-slate-700')}`} title={r.location?.address}>
                        {r.village || r.location?.address || 'N/A'}
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {r.assignedCollector ? (
                         <>
                         <p className={`font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{r.assignedCollector.name}</p>
                         <p className={`text-xs mt-0.5 font-mono ${dk('text-green-500', 'text-green-500')}`}>{r.assignedCollector.collectorId}</p>
                       </>
                      ) : <span className={`text-xs italic ${dk('text-slate-500', 'text-slate-400')}`}>Unassigned</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button onClick={() => setViewModal(r)} className={`p-2 rounded-lg border transition flex items-center gap-1.5 ${dk('border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700', 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800')}`}>
                        <HiEye className="w-4 h-4" /> <span className="text-xs font-medium">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="xl:hidden divide-y divide-slate-100 dark:divide-gray-800">
            {filteredReports.map((r) => (
              <div key={r._id} className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-green-600">{r.reportId || 'ECO-PENDING'}</p>
                    <p className={`mt-1 font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{r.wasteType}</p>
                    <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(r.status)}`}>{r.status}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Citizen</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{r.userId?.name || 'Unknown'}</p>
                    <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{r.userId?.phone || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Village</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{r.village || r.location?.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Severity</p>
                    <p className={`font-semibold ${getSeverityColor(r.severity)}`}>{r.severity}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Collector</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{r.assignedCollector?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setViewModal(r)} className={`p-2.5 sm:p-2 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200', 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700')}`} title="View">
                    <HiEye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {viewModal && (
        <ModalWrapper onClose={() => setViewModal(null)} title={`Report Details — ${viewModal.reportId || 'ECO-PENDING'}`} dk={dk}>
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
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Report & Location</h4>
                <div className="space-y-2 text-sm">
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Type:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.wasteType}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Quantity:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.quantity || 'N/A'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Severity:</span> <span className={`font-semibold ${getSeverityColor(viewModal.severity)}`}>{viewModal.severity}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Created:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{new Date(viewModal.createdAt).toLocaleString()}</span></p>
                  <p className="flex items-start gap-1">
                    <span className={`inline-block w-20 sm:w-24 shrink-0 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Village:</span> 
                    <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.village || 'Not specified'}</span>
                  </p>
                  <div className={`mt-2 p-3 rounded-lg border flex gap-3 ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                     <HiLocationMarker className={`w-5 h-5 shrink-0 ${dk('text-red-400', 'text-red-500')}`} />
                     <div>
                       <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{viewModal.location?.address || 'N/A'}</p>
                       <p className={`text-xs mt-1 font-mono ${dk('text-slate-500', 'text-slate-500')}`}>Lat: {viewModal.location?.lat}, Lng: {viewModal.location?.lng}</p>
                     </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Additional Context</h4>
                <div className="space-y-2 text-sm mb-4">
                  <p><span className={`inline-block w-24 sm:w-32 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>House/Building:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.houseNo || '—'}</span></p>
                  <p><span className={`inline-block w-24 sm:w-32 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Landmark:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.landmark || '—'}</span></p>
                  <p><span className={`inline-block w-24 sm:w-32 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Seen:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.wasteSeenAt}</span></p>
                  <p><span className={`inline-block w-24 sm:w-32 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Report Upvotes:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.upvotes?.length || 0}</span></p>
                  {viewModal.escalated && (
                    <p className="flex items-center gap-1.5 text-red-500 font-semibold"><HiExclamationCircle /> Escalated</p>
                  )}
                </div>

                <div className={`p-3 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                  <p className={`text-xs font-medium mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Description</p>
                  <p className={`text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{viewModal.description || 'No description provided.'}</p>
                </div>
              </div>

            </div>
            
            <div className="space-y-6">
               <div>
                 <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Operational Details</h4>
                 <div className="space-y-4 text-sm">
                   <div className="flex items-center gap-3">
                     <span className={`font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Current Status:</span>
                     <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${getStatusColor(viewModal.status)}`}>{viewModal.status}</span>
                   </div>
                   
                   <div className={`p-4 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-white border-slate-200 shadow-sm')}`}>
                     <p className={`text-xs uppercase font-semibold mb-2 ${dk('text-slate-500', 'text-slate-400')}`}>Assigned Task Force</p>
                     {viewModal.assignedCollector ? (
                        <div>
                          <p className={`font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{viewModal.assignedCollector.name}</p>
                          <p className={`text-sm mt-0.5 ${dk('text-slate-400', 'text-slate-600')}`}>Contact: {viewModal.assignedCollector.phone}</p>
                          <p className={`text-xs mt-1 font-mono px-2 py-0.5 rounded-lg inline-block ${dk('bg-green-500/40 text-green-500', 'bg-green-500/50 text-green-500')}`}>ID: {viewModal.assignedCollector.collectorId}</p>
                        </div>
                     ) : (
                       <p className={`text-sm italic ${dk('text-slate-500', 'text-slate-400')}`}>Not assigned to any collector yet.</p>
                     )}
                   </div>
                 </div>
               </div>

               <div>
                 <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>AI Verification & Fraud Detection</h4>
                 <div className={`p-4 rounded-lg border space-y-4 ${dk('bg-slate-800/50 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                   <div className="flex items-center justify-between">
                     <span className={`text-sm font-medium ${dk('text-slate-400', 'text-slate-500')}`}>AI Status:</span>
                     <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                       viewModal.aiStatus === 'APPROVED' ? 'bg-green-500 text-green-500' :
                       viewModal.aiStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                       viewModal.aiStatus === 'SUSPICIOUS' ? 'bg-amber-100 text-amber-800' :
                       'bg-blue-100 text-blue-800'
                     }`}>
                       {viewModal.aiStatus || 'PENDING'}
                     </span>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className={`text-[10px] uppercase font-bold ${dk('text-slate-500', 'text-slate-400')}`}>Confidence Score</p>
                       <p className={`text-lg font-bold ${viewModal.aiConfidenceScore > 80 ? 'text-green-500' : 'text-amber-500'}`}>
                         {viewModal.aiConfidenceScore || 0}%
                       </p>
                     </div>
                     <div>
                       <p className={`text-[10px] uppercase font-bold ${dk('text-slate-500', 'text-slate-400')}`}>Fake Probability</p>
                       <p className={`text-lg font-bold ${viewModal.fakeProbabilityScore > 60 ? 'text-red-500' : 'text-slate-400'}`}>
                         {viewModal.fakeProbabilityScore || 0}%
                       </p>
                     </div>
                   </div>

                   {viewModal.aiDetectedLabels && viewModal.aiDetectedLabels.length > 0 && (
                     <div>
                       <p className={`text-[10px] uppercase font-bold mb-1.5 ${dk('text-slate-500', 'text-slate-400')}`}>AI Detected Labels</p>
                       <div className="flex flex-wrap gap-1.5">
                         {viewModal.aiDetectedLabels.map((l, i) => (
                           <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${dk('bg-slate-900 border-slate-700 text-slate-400', 'bg-white border-slate-200 text-slate-500')}`}>
                             {l}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   {(viewModal.duplicateImage || viewModal.aiGeneratedDetected) && (
                     <div className="space-y-2">
                       {viewModal.duplicateImage && (
                         <p className="text-xs text-red-500 flex items-center gap-1.5 font-semibold">
                           <HiExclamationCircle /> Duplicate/Internet Image Detected
                         </p>
                       )}
                       {viewModal.aiGeneratedDetected && (
                         <p className="text-xs text-amber-500 flex items-center gap-1.5 font-semibold">
                           <HiExclamationCircle /> AI Generated/Edited Suspicion
                         </p>
                       )}
                     </div>
                   )}

                   {viewModal.rejectionReason && (
                     <div className={`p-2.5 rounded-lg border text-xs ${dk('bg-red-900/20 border-red-900/30 text-red-400', 'bg-red-50 border-red-100 text-red-700')}`}>
                       <strong>Reason:</strong> {viewModal.rejectionReason}
                     </div>
                   )}
                 </div>
               </div>

               <div>
                 <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Evidence Image</h4>
                 {viewModal.image ? (
                   <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                     <img src={viewModal.image} alt="Waste evidence" className="w-full h-auto object-cover max-h-72" />
                   </div>
                 ) : (
                   <div className={`h-40 rounded-lg flex items-center justify-center border border-dashed ${dk('border-slate-700 bg-slate-800', 'border-slate-300 bg-slate-50')}`}>
                      <p className={`text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No image uploaded</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </ModalWrapper>
      )}

    </div>
  );
};

export default Reports;
