import { useEffect, useState } from 'react';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiPhotograph, HiCheckCircle, HiExclamation } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const fmtDt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const staCls = (st, dk) => {
  const map = {
    Resolved:    dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Collected:   dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
  };
  return map[st] || dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-800');
};

const typeBadge = (type, dk) => {
  if (type === 'public') return 'bg-orange-600 text-white';
  if (type === 'home-pickup') return 'bg-green-700 text-white';
  return dk('bg-slate-700 text-slate-300', 'bg-slate-100 text-slate-700');
};

const typeIcon = (type) => {
  if (type === 'public') return <HiExclamation className="h-3.5 w-3.5" />;
  return <HiLocationMarker className="h-3.5 w-3.5" />;
};

const DetailModal = ({ report, onClose, dk }) => {
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const value = dk('text-slate-100', 'text-slate-800');

  const rptType = report.reportType || 'public';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`rounded-lg border w-full max-w-lg p-5 space-y-4 shadow-xl overflow-y-auto max-h-[90vh] ${panel}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Completed Task Details</p>
          <button type="button" onClick={onClose} className={dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-800')}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${typeBadge(rptType, dk)}`}>
              {rptType === 'public' ? 'Public Waste' : 'Home Pickup'}
            </span>
            {report.reportId && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
                {report.reportId}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(report.status, dk)}`}>{report.status}</span>
          </div>

          {report.completionPhoto && (
            <div>
              <p className={`text-xs ${label}`}>Completion Photo</p>
              <img src={report.completionPhoto} alt="Completed" className="h-40 rounded-lg object-cover mt-1" />
            </div>
          )}

          {report.completionNotes && (
            <div>
              <p className={`text-xs ${label}`}>Completion Notes</p>
              <p className={`text-sm ${value}`}>{report.completionNotes}</p>
            </div>
          )}

          <div>
            <p className={`text-xs ${label}`}>Completed At</p>
            <p className={`text-sm font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
              <HiCheckCircle className="h-4 w-4" />
              {fmtDt(report.completedAt || report.updatedAt)}
            </p>
          </div>

          <hr className={dk('border-slate-700', 'border-slate-200')} />

          <div>
            <p className={`text-xs ${label}`}>Waste Type</p>
            <p className={`text-sm font-medium ${value}`}>{report.wasteType || 'N/A'}</p>
          </div>

          {report.location?.address && (
            <div>
              <p className={`text-xs ${label}`}>Location</p>
              <p className={`text-sm flex items-center gap-1 ${value}`}>
                <HiLocationMarker className="h-3.5 w-3.5 text-green-500 shrink-0" />
                {report.location.address}
              </p>
            </div>
          )}

          {report.village && (
            <div>
              <p className={`text-xs ${label}`}>Village</p>
              <p className={`text-sm font-medium ${value}`}>{report.village}</p>
            </div>
          )}

          {report.quantity && (
            <div>
              <p className={`text-xs ${label}`}>Quantity</p>
              <p className={`text-sm font-medium ${value}`}>{report.quantity}</p>
            </div>
          )}

          {report.description && (
            <div>
              <p className={`text-xs ${label}`}>Description</p>
              <p className={`text-sm ${value}`}>{report.description}</p>
            </div>
          )}

          <div>
            <p className={`text-xs ${label}`}>Created At</p>
            <p className={`text-sm ${value}`}>{fmtDt(report.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompletedTasks = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const token = localStorage.getItem('token');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/reports?filter=Resolved&sort=date`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const resolved = (Array.isArray(data) ? data : []).filter(
          (r) => r.status === 'Resolved'
        );
        resolved.sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));
        setReports(resolved);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = filter === 'all'
    ? reports
    : reports.filter((r) => (r.reportType || 'public') === filter);

  const selectCls = dk(
    'rounded-lg border border-gray-700 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500',
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm'
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">
      {detail && <DetailModal report={detail} onClose={() => setDetail(null)} dk={dk} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Completed Tasks</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>
            {reports.length} task{reports.length !== 1 ? 's' : ''} completed
          </p>
        </div>
        <button
          type="button"
          onClick={fetchReports}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')}
          aria-label="Refresh"
        >
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
          <option value="all">All Types</option>
          <option value="public">Public Waste</option>
          <option value="home-pickup">Home Pickup</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No completed tasks found.</div>
      ) : (
        filtered.map((r) => {
          const rptType = r.reportType || 'public';
          return (
            <div
              key={r._id}
              className={`rounded-lg border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${typeBadge(rptType, dk)}`}>
                      {rptType === 'public' ? 'Public Waste' : 'Home Pickup'}
                    </span>
                    {r.reportId && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
                        {r.reportId}
                      </span>
                    )}
                    <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{r.wasteType}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(r.status, dk)}`}>{r.status}</span>
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                    <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="truncate">{r.location?.address || r.village || 'N/A'}</span>
                  </p>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 font-medium ${dk('text-green-400', 'text-green-700')}`}>
                    <HiCheckCircle className="h-3 w-3 shrink-0" />
                    Completed {fmt(r.completedAt || r.updatedAt)}
                  </p>
                  {r.quantity && (
                    <p className={`text-xs font-medium mt-1 ${dk('text-slate-300', 'text-slate-700')}`}>Quantity: {r.quantity}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(r)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}
                >
                  View
                </button>
              </div>

              {r.completionPhoto && (
                <img src={r.completionPhoto} alt="Completion" className="h-20 w-20 rounded-lg object-cover" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default CompletedTasks;
