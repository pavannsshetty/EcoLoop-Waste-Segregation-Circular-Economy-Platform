import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiEye, HiX, HiExclamationCircle, HiLocationMarker, HiSearch, HiThumbUp, HiPhotograph, HiClock } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import ModalOverlay from '../components/ModalOverlay';

const ModalWrapper = ({ children, onClose, title, dk }) => {
  return (
    <ModalOverlay onClose={onClose} className="flex p-4 sm:p-6 overflow-y-auto">
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
    </ModalOverlay>
  );
};

const PublicWasteReports = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [showReverifyConfirm, setShowReverifyConfirm] = useState(false);
  const [reverifyLoading, setReverifyLoading] = useState(false);

  const getDayGroup = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay());
    if (d >= today) return 'Today';
    if (d >= yesterday) return 'Yesterday';
    if (d >= weekStart) return 'This Week';
    return 'Earlier';
  };

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter((r) =>
      [r.reportId, r.wasteType, r.village, r.userId?.name, r.userId?.phone]
        .some((f) => f?.toLowerCase().includes(q))
    );
  }, [reports, search]);

  const groupedReports = useMemo(() => {
    const groups = {};
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    filteredReports.forEach((r) => {
      const g = getDayGroup(r.createdAt);
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    });
    return order.filter((g) => groups[g]?.length).map((g) => ({ group: g, items: groups[g] }));
  }, [filteredReports]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/reports/public', { headers: { Authorization: `Bearer ${token}` } });
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
      console.error('[PublicWasteReports] fetch error:', err);
      setError(err.message || 'Failed to load public waste reports.');
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
      case 'Resolved': return dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800');
      case 'Rejected': return dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800');
      case 'Under Re-Verification': return dk('bg-yellow-900/50 text-yellow-300', 'bg-yellow-100 text-yellow-700');
      default: return dk('bg-gray-800 text-gray-400', 'bg-gray-100 text-gray-800');
    }
  };

  const handleReverify = async () => {
    if (!viewModal) return;
    setReverifyLoading(true);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`/api/admin/report/${viewModal._id}/reverify`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setViewModal(data.report);
        setReports((rs) => rs.map((r) => (r._id === data.report._id ? data.report : r)));
        setShowReverifyConfirm(false);
      } else {
        console.error('Reverify failed:', data.message || data);
      }
    } catch (err) {
      console.error('Reverify error:', err);
    } finally {
      setReverifyLoading(false);
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

  const getSeverityBadge = (svr) => {
    switch (svr) {
      case 'High': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400';
      case 'Medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400';
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400';
      default: return dk('bg-slate-800 text-slate-400', 'bg-slate-100 text-slate-500');
    }
  };

  const getDuplicateStatusColor = (reportOrFlag) => {
    const duplicate = typeof reportOrFlag === 'boolean'
      ? reportOrFlag
      : reportOrFlag?.duplicateOf || reportOrFlag?.duplicateImage || reportOrFlag?.isDuplicate;
    return duplicate
      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
      : dk('bg-slate-800 text-slate-400', 'bg-slate-100 text-slate-500');
  };

  const isDuplicateReport = (reportOrFlag) => {
    if (typeof reportOrFlag === 'boolean') return reportOrFlag;
    return !!(reportOrFlag?.duplicateOf || reportOrFlag?.duplicateImage || reportOrFlag?.isDuplicate);
  };

  const haversineMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getRelatedReports = (report) => {
    if (!report || !report.location?.lat || !report.location?.lng) return [];
    return reports
      .filter((r) => r._id !== report._id && r.location?.lat && r.location?.lng && r.wasteType === report.wasteType)
      .map((r) => ({
        ...r,
        distance: haversineMeters(report.location.lat, report.location.lng, r.location.lat, r.location.lng),
      }))
      .filter((r) => r.distance <= 100)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>
            Public Waste Reports
          </h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>
            Manage community waste issues — roadside garbage, illegal dumping, drainage overflow & more
          </p>
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

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-orange-500/20 group max-w-md ${
        dark ? 'bg-slate-800 border-slate-600 focus-within:border-orange-500' : 'bg-white border-slate-200 focus-within:border-orange-500 shadow-sm'
      }`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, citizen, waste type, status, village, phone..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>All Public Reports</h2>
          <span className={`text-xs font-medium ${dk('text-slate-500', 'text-slate-500')}`}>
            {search ? `${filteredReports.length} of ${reports.length}` : `${reports.length} reports`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            {search ? 'No reports matching your search.' : 'No public waste reports found.'}
          </div>
        ) : (
          <>
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Report ID</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Citizen</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Waste Type</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Severity</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Village</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Collector</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Date & Time</th>
                  <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {filteredReports.map((r) => (
                  <tr key={r._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-slate-50')}`}>
                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-orange-600">
                      {r.reportId || 'ECO-PENDING'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {r.userId ? (
                        <>
                          <p className={`font-semibold text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{r.userId.name}</p>
                          <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{r.userId.phone}</p>
                        </>
                      ) : <span className={`text-sm ${dk('text-slate-500', 'text-slate-400')}`}>Unknown</span>}
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap font-medium text-sm ${dk('text-slate-200', 'text-slate-800')}`}>
                      {r.wasteType}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getSeverityBadge(r.severity)}`}>
                        {r.severity || 'N/A'}
                      </span>
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap text-sm ${dk('text-slate-300', 'text-slate-700')}`}>
                      {r.village || 'N/A'}
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
            {groupedReports.map(({ group, items }) => (
              <div key={group}>
                <div className={`sticky top-0 z-10 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b flex items-center gap-2 ${
                  dark ? 'bg-slate-800 border-slate-700 text-orange-400' : 'bg-orange-50 border-slate-200 text-orange-700'
                }`}>
                  <HiClock className="w-3.5 h-3.5" />
                  {group}
                  <span className="ml-auto font-normal opacity-70">{items.length} report{items.length !== 1 ? 's' : ''}</span>
                </div>
                {items.map((r) => (
                  <div key={r._id} className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-orange-600">{r.reportId || 'ECO-PENDING'}</p>
                        <p className={`mt-1 font-semibold text-sm truncate ${dk('text-slate-200', 'text-slate-800')}`}>{r.wasteType}</p>
                        <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-500')}`}>{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(r.status)}`}>{r.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Citizen</p>
                        <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{r.userId?.name || 'Unknown'}</p>
                        <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{r.userId?.phone || '-'}</p>
                      </div>
                      <div>
                        <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Severity</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg inline-block mt-0.5 ${getSeverityBadge(r.severity)}`}>
                          {r.severity || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Village</p>
                        <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{r.village || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Collector</p>
                        <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{r.assignedCollector?.name || 'Unassigned'}</p>
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
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Report Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Type:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.wasteType}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Quantity:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.quantity || 'N/A'}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Severity:</span> <span className={`font-semibold ${getSeverityColor(viewModal.severity)}`}>{viewModal.severity}</span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Created:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{new Date(viewModal.createdAt).toLocaleString()}</span></p>
                  <p className="flex items-start gap-1">
                    <span className={`inline-block w-20 sm:w-24 shrink-0 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Village:</span>
                    <span className={dk('text-slate-200', 'text-slate-800')}>{viewModal.village || 'Not specified'}</span>
                  </p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Supports:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{(viewModal.supportedBy?.length ?? viewModal.upvotes?.length) || 0} <HiThumbUp className="inline w-3.5 h-3.5 text-blue-500" /></span></p>
                  <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Duplicate:</span> <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${getDuplicateStatusColor(viewModal)}`}>{isDuplicateReport(viewModal) ? 'Yes' : 'No'}</span></p>
                  {viewModal.duplicateOf && (
                    <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Linked to report {viewModal.duplicateOf}</p>
                  )}
                  {viewModal.escalated && (
                    <p className="flex items-center gap-1.5 text-red-500 font-semibold"><HiExclamationCircle /> Escalated</p>
                  )}
                  {(viewModal.location?.lat && viewModal.location?.lng) && (
                    <div className={`mt-2 p-3 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                      <div className="flex items-start gap-2">
                        <HiLocationMarker className={`w-5 h-5 shrink-0 mt-0.5 ${dk('text-red-400', 'text-red-500')}`} />
                        <div className="min-w-0">
                          <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{viewModal.location?.address || 'N/A'}</p>
                          <p className={`text-xs mt-1 font-mono ${dk('text-slate-500', 'text-slate-500')}`}>
                            Lat: {viewModal.location.lat}, Lng: {viewModal.location.lng}
                          </p>
                          <a href={`https://www.google.com/maps?q=${viewModal.location.lat},${viewModal.location.lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs font-medium mt-2 px-2.5 py-1 rounded-lg border transition ${
                              dark ? 'border-slate-700 bg-slate-700 text-orange-400 hover:bg-slate-600' : 'border-slate-200 bg-white text-orange-600 hover:bg-orange-50'
                            }`}>
                            <HiLocationMarker className="w-3.5 h-3.5" /> Open in Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                <p className={`text-xs font-medium mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Description</p>
                <p className={`text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{viewModal.description || 'No description provided.'}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Operational Details</h4>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Status:</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(viewModal.status)}`}>{viewModal.status}</span>
                  </div>
                  <div className={`p-4 rounded-lg border ${dk('bg-slate-800 border-slate-700', 'bg-white border-slate-200 shadow-sm')}`}>
                    <p className={`text-xs uppercase font-semibold mb-2 ${dk('text-slate-500', 'text-slate-400')}`}>Assigned Collector</p>
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


              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Verification & Clarification</h4>
                <div className={`p-4 rounded-lg border space-y-4 ${dk('bg-slate-800/50 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs uppercase font-semibold ${dk('text-slate-400', 'text-slate-500')}`}>Verification Status:</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getStatusColor(viewModal.status)}`}>{viewModal.status}</span>
                    </div>
                      {viewModal.verifiedBy?.name && viewModal.verifiedAt && (
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`uppercase font-semibold ${dk('text-slate-400', 'text-slate-500')}`}>Verified by:</span>
                            <span className={`font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{viewModal.verifiedBy.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`uppercase font-semibold ${dk('text-slate-400', 'text-slate-500')}`}>Verified on:</span>
                            <span className={`font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{new Date(viewModal.verifiedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {viewModal.verificationChecklist && Object.entries(viewModal.verificationChecklist).map(([key, value]) => (
                        <div key={key} className={`rounded-lg border p-2 text-xs ${value ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                          <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}:</strong> {value ? 'Yes' : 'No'}
                        </div>
                      ))}
                    </div>
                    {viewModal.verificationNotes && (
                      <div className="text-xs text-slate-400">
                        <strong>Verifier notes:</strong> {viewModal.verificationNotes}
                      </div>
                    )}
                    {viewModal.clarificationRequests?.length > 0 && (
                      <div className={`rounded-lg border p-3 ${dk('bg-purple-900/10 border-purple-700/30', 'bg-purple-50 border-purple-200')}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">Clarification History</p>
                        {viewModal.clarificationRequests.map((cr, index) => (
                          <div key={index} className="mt-2 text-xs space-y-1">
                            <p className="font-semibold">{cr.reason}</p>
                            {cr.notes && <p>{cr.notes}</p>}
                            <p className="text-[10px] text-slate-500">Requested: {new Date(cr.requestedAt).toLocaleString()}</p>
                          </div>
                        ))}
                        {viewModal.clarificationExpiresAt && (
                          <p className="text-[10px] opacity-80">Expires: {new Date(viewModal.clarificationExpiresAt).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    {viewModal.status === 'Verified' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowReverifyConfirm(true)}
                          className="rounded-lg border border-yellow-500 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-700 hover:bg-yellow-500/20 transition"
                        >
                          Re-Check Verification
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Related Reports</h4>
                <div className={`rounded-lg border p-4 ${dk('bg-slate-800 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                  {getRelatedReports(viewModal).length > 0 ? (
                    <div className="space-y-3 text-sm">
                      {getRelatedReports(viewModal).map((related) => (
                        <div key={related._id} className="rounded-lg border p-3 bg-white/5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{related.reportId || related._id.slice(-6)}</span>
                            <span className="text-[10px] text-slate-400">{Math.round(related.distance)}m away</span>
                          </div>
                          <p className="text-xs text-slate-400">{related.wasteType} · {related.status}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>No related reports found within 100 meters for the same waste type.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Report Images</h4>
                {(viewModal.images && viewModal.images.length > 0) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {viewModal.images.map((img, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <img src={img} alt={`Evidence ${i+1}`} className="w-full h-28 sm:h-36 object-cover" />
                      </div>
                    ))}
                  </div>
                ) : viewModal.image ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <img src={viewModal.image} alt="Waste evidence" className="w-full h-auto object-cover max-h-72" />
                  </div>
                ) : (
                  <div className={`h-40 rounded-lg flex items-center justify-center border border-dashed ${dk('border-slate-700 bg-slate-800', 'border-slate-300 bg-slate-50')}`}>
                    <div className="text-center">
                      <HiPhotograph className={`w-8 h-8 mx-auto ${dk('text-slate-600', 'text-slate-400')}`} />
                      <p className={`text-sm mt-1 ${dk('text-slate-500', 'text-slate-400')}`}>No images uploaded</p>
                    </div>
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

export default PublicWasteReports;
