import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLocationMarker, HiClock, HiRefresh, HiThumbUp } from 'react-icons/hi';
import { MdWaterDrop, MdRecycling, MdDevices, MdWarning } from 'react-icons/md';
import CleanupTimeBadge from '../../shared/components/CleanupTimeBadge';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';

const STATUS_STYLES = {
  Submitted:   'bg-yellow-100 text-yellow-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Resolved:    'bg-green-100 text-green-700',
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
  'Wet Waste': 'bg-green-100 text-green-600', 'Dry Waste': 'bg-blue-100 text-blue-600',
  'E-Waste': 'bg-purple-100 text-purple-600', 'Plastic Waste': 'bg-cyan-100 text-cyan-600',
  'Mixed Waste': 'bg-orange-100 text-orange-600',
};

const MyReports = () => {
  const navigate = useNavigate();
  const { user: ctxUser } = useUser();
  const user = ctxUser || JSON.parse(localStorage.getItem('user') || '{}');
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchReports = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch('/api/waste/my-reports', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch reports.');
      setReports(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleUpvote = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/waste/upvote/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (res.ok) {
        setReports(rs => rs.map(r => r._id === id ? { ...r, upvotes: Array(data.upvotes).fill(null) } : r));
      }
    } catch { }
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`p-4 sm:p-6 space-y-4 max-w-4xl mx-auto`}>
      <div className="flex items-center justify-between">
        <h1 className={`text-base font-medium ${dk('text-slate-200','text-slate-800')}`}>My Reports</h1>
        <button onClick={fetchReports} className={`flex items-center gap-1.5 text-sm transition ${dk('text-slate-400 hover:text-green-400','text-slate-500 hover:text-green-600')}`}>
          <HiRefresh className="h-5 w-5" /><span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          </div>
        )}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <MdWarning className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-medium">No reports yet.</p>
            <button onClick={() => navigate('/citizen/dashboard')}
              className="mt-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition">
              Go to Dashboard
            </button>
          </div>
        )}

        {!loading && reports.map((r) => {
          const Icon    = WASTE_ICONS[r.wasteType] || MdWarning;
          const iconCls = WASTE_COLORS[r.wasteType] || 'bg-slate-100 text-slate-500';
          const upvoted = r.upvotes?.some(u => u === user._id || u?._id === user._id);
          return (
            <div key={r._id} className={`rounded-sm border p-4 sm:p-5 space-y-3 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm ${iconCls}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${dk('text-slate-200','text-slate-900')}`}>{r.wasteType}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                    {r.severity && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_STYLES[r.severity] || ''}`}>{r.severity}</span>}
                    {r.anonymous && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Anonymous</span>}
                    <CleanupTimeBadge report={r} />
                  </div>
                  <p className={`text-xs line-clamp-2 ${dk('text-slate-400','text-slate-500')}`}>{r.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <HiLocationMarker className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">{r.location?.displayAddress || r.location?.address || 'N/A'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <HiClock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      {fmt(r.pickupTime)} at {fmtTime(r.pickupTime)}
                    </span>
                  </div>
                  {r.wasteSeenAt && (
                    <p className="text-xs text-slate-400">Seen: <span className="font-medium text-slate-600">{r.wasteSeenAt}</span></p>
                  )}
                  {r.landmarkType && (
                    <p className="text-xs text-slate-400">Near: <span className="font-medium text-slate-600">{r.landmarkType}{r.landmark ? ` — ${r.landmark}` : ''}</span></p>
                  )}
                  {r.expectedCleanupHours && r.status !== 'Resolved' && (
                    <p className="text-xs text-green-600 font-medium">Expected cleanup: {r.expectedCleanupHours}h</p>
                  )}
                </div>
                <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                  <p className="text-xs text-slate-400">Reported</p>
                  <p className="text-xs font-medium text-slate-600">{fmt(r.createdAt)}</p>
                  <button onClick={() => handleUpvote(r._id)}
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-sm border transition ${
                      upvoted ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-green-400 hover:text-green-600'
                    }`}>
                    <HiThumbUp className="h-3.5 w-3.5" />
                    {r.upvotes?.length || 0}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default MyReports;
