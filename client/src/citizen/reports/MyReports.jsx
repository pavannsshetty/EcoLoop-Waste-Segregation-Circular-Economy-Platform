import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLocationMarker, HiRefresh, HiCheckCircle, HiX, HiFlag, HiEye, HiPencil } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { MdWaterDrop, MdRecycling, MdDevices, MdWarning } from 'react-icons/md';
import CleanupTimeBadge from '../../shared/components/CleanupTimeBadge';
import EditReportModal from '../../shared/components/EditReportModal';
import ClarificationResubmitModal from '../../shared/components/ClarificationResubmitModal';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser, parseStoredUser } from '../../shared/context/UserContext';
import socket from '../../socket';

const STATUS_STYLES = {
  Submitted:     'bg-yellow-100 text-yellow-700',
  Verified:      'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Resolved:      'bg-green-100 text-green-700',
  Reopened:      'bg-orange-100 text-orange-700',
  Delayed:       'bg-red-100 text-red-700',
  'Clarification Requested': 'bg-purple-100 text-purple-700',
  Resubmitted:   'bg-indigo-100 text-indigo-700',
  'Clarification Expired': 'bg-gray-100 text-gray-600',
};

const SEVERITY_STYLES = {
  Low:    'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High:   'bg-red-100 text-red-700',
};

const WASTE_ICONS = {
  'Wet Waste': MdWaterDrop, 'Dry Waste': MdRecycling,
  'E-Waste': MdDevices, 'Plastic Waste': MdRecycling, 'Mixed Waste': MdWarning,
};

const WASTE_COLORS = {
  'Plastic Waste': 'bg-cyan-100 text-cyan-600',
  'Organic Waste': 'bg-green-100 text-green-600',
  'Food Waste': 'bg-lime-100 text-lime-600',
  'E-Waste': 'bg-purple-100 text-purple-600',
  'Construction Waste': 'bg-orange-100 text-orange-600',
  'Medical Waste': 'bg-red-100 text-red-600',
  'Mixed Waste': 'bg-slate-100 text-slate-600',
  'Glass Waste': 'bg-blue-100 text-blue-600',
  'Paper Waste': 'bg-yellow-100 text-yellow-600',
  'Sewage / Drainage': 'bg-emerald-100 text-emerald-600',
  'Dead Animal Waste': 'bg-rose-100 text-rose-600',
};

const LOCKED_STATUSES = ['In Progress', 'Resolved', 'Delayed', 'Clarification Expired'];

const MyReports = () => {
  const navigate = useNavigate();
  const { user: ctxUser } = useUser();
  const user = ctxUser || parseStoredUser();
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [editReport, setEditReport] = useState(null);
  const [resubmitReport, setResubmitReport] = useState(null);

  const fetchReports = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/'); return; }
      const res   = await fetch(`${API}/api/waste/my-reports`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); return; }
      if (!res.ok) throw new Error('Failed to fetch reports.');
      setReports(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  useEffect(() => {
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;
    const handler = (updated) => {
      if (updated.userId !== currentUserId) return;
      setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));
    };
    socket.on('report_updated', handler);
    return () => socket.off('report_updated', handler);
  }, []);

  const handleVerify = async (id, verified) => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/waste/report/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verified }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message);
        return;
      }
      const data = await res.json();
      setReports(rs => rs.map(r => r._id === id ? { ...r, ...data.report } : r));
    } catch { }
  };

  const handleUpdated = (updated) => {
    setReports(rs => rs.map(r => r._id === updated._id ? updated : r));
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200','text-slate-800')}`}>My Reports</h1>
        <button onClick={fetchReports} className={`flex items-center gap-1.5 text-sm transition ${dk('text-slate-400 hover:text-green-400','text-slate-500 hover:text-green-600')}`}>
          <HiRefresh className="h-5 w-5" /><span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          </div>
        )}
        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <MdWarning className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500">No reports yet.</p>
            <button onClick={() => navigate('/citizen/dashboard')}
              className="mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-500 transition">
              Go to Dashboard
            </button>
          </div>
        )}

        {selectedReport && (
          <ReportDetailModal report={selectedReport} dark={dark} onClose={() => setSelectedReport(null)} fmt={fmt} fmtTime={fmtTime} dk={dk} />
        )}
        <EditReportModal isOpen={!!editReport} onClose={() => setEditReport(null)} report={editReport} onUpdated={handleUpdated} />
        <ClarificationResubmitModal isOpen={!!resubmitReport} onClose={() => setResubmitReport(null)} report={resubmitReport} onUpdated={handleUpdated} />

        {!loading && reports.map((r) => {
          const Icon    = WASTE_ICONS[r.wasteType] || MdWarning;
          const iconCls = WASTE_COLORS[r.wasteType] || 'bg-slate-100 text-slate-500';
          return (
            <div key={r._id} className={`rounded-lg border p-4 sm:p-5 space-y-3 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono tracking-tighter bg-green-50 text-green-600 px-1.5 py-0.5 rounded-lg border border-green-100 font-bold">{r.reportId || 'ECO-PENDING'}</span>
                    <span className={`text-sm font-bold ${dk('text-slate-200','text-slate-900')}`}>{r.wasteType}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${r.reportType === 'Home Pickup' ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                      {r.reportType || 'Public'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                    {r.severity && <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[r.severity] || ''}`}>{r.severity}</span>}
                    {r.quantity && <span className={`text-[10px] px-2 py-0.5 rounded-full border border-slate-200 ${dk('bg-slate-800 text-slate-300','bg-white text-slate-500')}`}>{r.quantity}</span>}
                    <CleanupTimeBadge report={r} />
                  </div>
                  <p className={`text-xs line-clamp-2 ${dk('text-slate-400','text-slate-500')}`}>{r.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <HiLocationMarker className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-xs">{r.location?.displayAddress || r.location?.address || 'N/A'}</span>
                    </span>
                    {r.priorityLevel && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.priorityLevel === 'Urgent'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        <HiFlag className="h-3 w-3" /> {r.priorityLevel}
                      </span>
                    )}
                  </div>
                  {r.wasteSeenAt && (
                    <p className="text-xs text-slate-400">Seen: <span className="text-slate-600">{r.wasteSeenAt}</span></p>
                  )}
                  {r.landmarkType && (
                    <p className="text-xs text-slate-400">Near: <span className="text-slate-600">{r.landmarkType}{r.landmark ? ` — ${r.landmark}` : ''}</span></p>
                  )}
                  {r.expectedCleanupHours && r.status !== 'Resolved' && (
                    <p className="text-xs text-green-600">Expected cleanup: {r.expectedCleanupHours}h</p>
                  )}
                  {r.status === 'Resolved' && r.completionNotes && (
                    <div className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>
                      <span className={`font-semibold ${dk('text-slate-300', 'text-slate-600')}`}>Collector notes:</span> {r.completionNotes}
                    </div>
                  )}
                  {r.status === 'Resolved' && r.completionPhoto && (
                    <div>
                      <span className={`text-xs font-semibold ${dk('text-slate-300', 'text-slate-600')}`}>Completion photo:</span>
                      <img src={r.completionPhoto} alt="Completion" className="mt-1 h-24 w-24 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition" onClick={() => window.open(r.completionPhoto, '_blank')} />
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                  <p className="text-xs text-slate-400">Reported</p>
                  <p className="text-xs text-slate-600">{fmt(r.createdAt)}</p>
                  <button onClick={() => setSelectedReport(r)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition mt-1">
                    <HiEye className="h-3.5 w-3.5" /> View
                  </button>

                  {!LOCKED_STATUSES.includes(r.status) && !r.assignedCollector && !r.collectorId && (
                    <button onClick={() => setEditReport(r)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition mt-1">
                      <HiPencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}

                  {r.status === 'Clarification Requested' && (
                    <button onClick={() => setResubmitReport(r)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 transition mt-1">
                      <HiPencil className="h-3.5 w-3.5" /> Resubmit
                    </button>
                  )}
                  {r.supportedBy?.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700`}>
                      {r.supportedBy.length} supporter{r.supportedBy.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {r.status === 'Resolved' && r.citizenVerified === 'pending' && (
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-[10px] text-slate-500">Was this resolved?</p>
                      <div className="flex gap-1">
                        <button onClick={() => handleVerify(r._id, 'yes')}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 min-h-[36px] rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                          <HiCheckCircle className="h-3.5 w-3.5" /> Yes
                        </button>
                        <button onClick={() => handleVerify(r._id, 'no')}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 min-h-[36px] rounded-lg bg-red-500 text-white hover:bg-red-400 transition">
                          <HiX className="h-3.5 w-3.5" /> No
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

/* ── Report Detail Modal ── */
const ReportDetailModal = ({ report, dark, onClose, fmt, fmtTime, dk }) => {
  if (!report) return null;
  const textPrimary = dark ? 'text-[#f3f4f6]' : 'text-slate-900';
  const textMuted   = dark ? 'text-[#8b95a7]' : 'text-slate-500';
  const cardBg      = dark ? 'bg-[#11151c] border-white/10' : 'bg-white border-slate-200';
  const fieldBg     = dark ? 'bg-[#1a2029]' : 'bg-slate-50';
  const statusStyle = STATUS_STYLES[report.status] || 'bg-slate-100 text-slate-600';
  const collectorLabel = (c) => c ? `${c.name || ''} (${c.collectorType || 'Collector'})` : 'Not assigned';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border ${cardBg}`} onClick={e => e.stopPropagation()}>
        <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${dark ? 'border-white/10 bg-[#11151c]' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2">
            <HiEye className="h-5 w-5 text-green-500" />
            <h2 className={`font-bold text-lg ${textPrimary}`}>Report Details</h2>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition ${dark ? 'text-[#8b95a7] hover:bg-[#1a2029]' : 'text-slate-400 hover:bg-slate-100'}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status Badge Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-mono tracking-tighter bg-green-50 text-green-600 px-1.5 py-0.5 rounded-lg border border-green-100 font-bold`}>{report.reportId || 'ECO-PENDING'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle}`}>{report.status}</span>
            {report.priorityLevel && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                report.priorityLevel === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <HiFlag className="h-3 w-3" /> {report.priorityLevel}
              </span>
            )}
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${report.reportType === 'Home Pickup' ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
              {report.reportType || 'Public'}
            </span>
          </div>

          {/* Type & Severity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Waste Type</p>
              <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{report.wasteType}</p>
            </div>
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Severity</p>
              <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{report.severity || 'N/A'}</p>
            </div>
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Quantity</p>
              <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{report.quantity || 'N/A'}</p>
            </div>
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Waste Seen</p>
              <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{report.wasteSeenAt || 'N/A'}</p>
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Description</p>
              <p className={`text-sm mt-1 ${textPrimary}`}>{report.description}</p>
            </div>
          )}

          {/* Location */}
          <div className={`rounded-lg p-3 ${fieldBg}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Location</p>
            <p className={`text-sm mt-1 ${textPrimary}`}>{report.location?.displayAddress || report.location?.address || 'Address not provided'}</p>
            {report.location?.lat && report.location?.lng && (
              <p className={`text-xs mt-0.5 ${textMuted}`}>Lat: {report.location.lat.toFixed(6)}, Lng: {report.location.lng.toFixed(6)}</p>
            )}
          </div>

          {/* Landmark & Area Details */}
          {(report.landmarkType || report.landmark || report.houseNo || report.street || report.wardNumber || report.village) && (
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Area Details</p>
              <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                {report.houseNo && <p className={textPrimary}><span className={textMuted}>House:</span> {report.houseNo}</p>}
                {report.street && <p className={textPrimary}><span className={textMuted}>Street:</span> {report.street}</p>}
                {report.landmarkType && <p className={textPrimary}><span className={textMuted}>Landmark:</span> {report.landmarkType}{report.landmark ? ` — ${report.landmark}` : ''}</p>}
                {report.wardNumber && <p className={textPrimary}><span className={textMuted}>Ward:</span> {report.wardNumber}</p>}
                {report.village && <p className={textPrimary}><span className={textMuted}>Village:</span> {report.village}</p>}
              </div>
            </div>
          )}

          {/* Assigned Collector */}
          {report.assignedCollector && (
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Assigned Collector</p>
              <p className={`text-sm mt-1 ${textPrimary}`}>{collectorLabel(report.assignedCollector)}</p>
            </div>
          )}

          {/* Expected Cleanup */}
          {report.expectedCleanupHours && report.status !== 'Resolved' && (
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Expected Cleanup</p>
              <p className={`text-sm mt-1 text-green-600`}>Within {report.expectedCleanupHours} hours</p>
              {report.deadline && <p className={`text-xs mt-0.5 ${textMuted}`}>Deadline: {fmt(report.deadline)}</p>}
            </div>
          )}

          {/* Timelines */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Reported</p>
              <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{fmt(report.createdAt)}</p>
              <p className={`text-xs ${textMuted}`}>{fmtTime(report.createdAt)}</p>
            </div>
            {report.completedAt && (
              <div className={`rounded-lg p-3 ${fieldBg}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Completed</p>
                <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{fmt(report.completedAt)}</p>
                <p className={`text-xs ${textMuted}`}>{fmtTime(report.completedAt)}</p>
              </div>
            )}
            {report.resubmittedAt && (
              <div className={`rounded-lg p-3 ${fieldBg}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Resubmitted</p>
                <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{fmt(report.resubmittedAt)}</p>
                <p className={`text-xs ${textMuted}`}>{fmtTime(report.resubmittedAt)}</p>
              </div>
            )}
          </div>

          {/* Report Image */}
          {report.image && (
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>Report Image</p>
              <img src={report.image} alt="Report" className="max-h-64 w-full rounded-xl object-contain border cursor-pointer hover:opacity-90 transition" onClick={() => window.open(report.image, '_blank')} />
            </div>
          )}

          {/* Completion Details */}
          {report.status === 'Resolved' && (
            <div className={`rounded-lg p-3 border ${dark ? 'border-green-800 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider text-green-600`}>Resolution Details</p>
              {report.completionNotes && <p className={`text-sm mt-1 ${textPrimary}`}>{report.completionNotes}</p>}
              {report.completionPhoto && (
                <img src={report.completionPhoto} alt="Completion" className="mt-2 max-h-48 rounded-xl object-contain border cursor-pointer hover:opacity-90 transition" onClick={() => window.open(report.completionPhoto, '_blank')} />
              )}
            </div>
          )}

          {/* Verification / Clarification */}
          {report.status === 'Clarification Requested' && report.clarificationRequests?.length > 0 && (
            <div className={`rounded-lg p-3 border ${dark ? 'border-purple-800 bg-purple-900/20' : 'border-purple-200 bg-purple-50'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider text-purple-600`}>Clarification Request</p>
              {report.clarificationRequests.map((cr, i) => (
                <div key={i} className="mt-2">
                  <p className={`text-sm font-semibold ${textPrimary}`}>{cr.reason}</p>
                  {cr.notes && <p className={`text-xs mt-0.5 ${textMuted}`}>{cr.notes}</p>}
                  <p className={`text-[10px] mt-0.5 ${textMuted}`}>Requested: {fmt(cr.requestedAt)}</p>
                </div>
              ))}
            </div>
          )}

          {/* AI Verification Status */}
          {report.aiStatus && report.aiStatus !== 'PENDING_VERIFICATION' && (
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>AI Verification</p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold mt-1 ${
                report.aiStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                report.aiStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{report.aiStatus}</span>
              {report.aiConfidenceScore > 0 && <p className={`text-xs mt-1 ${textMuted}`}>Confidence: {(report.aiConfidenceScore * 100).toFixed(0)}%</p>}
            </div>
          )}

          {/* Supporters */}
          {report.supportedBy?.length > 0 && (
            <div className={`rounded-lg p-3 ${fieldBg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Supported By</p>
              <p className={`text-sm mt-1 ${textPrimary}`}>{report.supportedBy.length} {report.supportedBy.length === 1 ? 'person' : 'people'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyReports;
