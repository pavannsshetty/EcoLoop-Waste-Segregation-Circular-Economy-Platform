import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLocationMarker, HiRefresh, HiThumbUp, HiExclamation } from 'react-icons/hi';
import CleanupTimeBadge from '../components/CleanupTimeBadge';
import { useTheme } from '../context/ThemeContext';

const STATUS_STYLES = {
  Submitted:     'bg-yellow-100 text-yellow-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Resolved:      'bg-green-100 text-green-700',
};
const SEVERITY_STYLES = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low:    'bg-green-100 text-green-700',
};

const RADIUS_OPTIONS = [{ label: '1 km', value: 1 }, { label: '3 km', value: 3 }, { label: '5 km', value: 5 }];
const FILTER_OPTIONS = [
  { label: 'All Reports',   value: 'all'         },
  { label: 'High Priority', value: 'High'        },
  { label: 'In Progress',   value: 'In Progress' },
  { label: 'Resolved',      value: 'Resolved'    },
];

const NearbyIssues = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;

  const [userPos,  setUserPos]  = useState(null);
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [radius,   setRadius]   = useState(3);
  const [filter,   setFilter]   = useState('all');
  const [locError, setLocError] = useState('');

  const fetchReports = useCallback(async (lat, lng, rad, fil) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const sev   = ['High', 'Medium', 'Low'].includes(fil) ? `&severity=${fil}` : '';
      const sta   = (fil === 'In Progress' || fil === 'Resolved') ? `&status=${fil}` : '';
      const res   = await fetch(`/api/waste/nearby?lat=${lat}&lng=${lng}&radius=${rad}${sev}${sta}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setReports(await res.json());
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setLocError('');
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setUserPos(pos);
        fetchReports(pos.lat, pos.lng, radius, filter);
      },
      () => {
        const fallback = { lat: 13.3409, lng: 74.7421 };
        setUserPos(fallback);
        setLocError('Using default location (Kundapura). Enable location for accurate results.');
        fetchReports(fallback.lat, fallback.lng, radius, filter);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleRefresh = () => {
    if (userPos) fetchReports(userPos.lat, userPos.lng, radius, filter);
  };

  const handleFilterChange = (val) => {
    setFilter(val);
    if (userPos) fetchReports(userPos.lat, userPos.lng, radius, val);
  };

  const handleRadiusChange = (val) => {
    setRadius(val);
    if (userPos) fetchReports(userPos.lat, userPos.lng, val, filter);
  };

  const handleUpvote = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/waste/upvote/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (res.ok) {
        setReports(rs => rs.map(r => r._id === id
          ? { ...r, upvotes: Array(data.upvotes).fill(null), severity: data.severity }
          : r
        ));
      }
    } catch { }
  };

  const isUpvoted = (r) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return r.upvotes?.some(u => (u?._id || u) === user._id);
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const card    = dk('bg-white/5 border-gray-700', 'bg-white border-slate-100');
  const textPri = dk('text-slate-200', 'text-slate-900');
  const textSec = dk('text-slate-400', 'text-slate-500');

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-bold ${textPri}`}>Nearby Waste Issues</h1>
          <p className={`text-sm mt-0.5 ${textSec}`}>
            {userPos ? `Showing reports within ${radius} km` : 'Detecting location...'}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={loading}
          className={`flex items-center gap-1.5 text-sm transition ${dk('text-slate-400 hover:text-green-400','text-slate-500 hover:text-green-600')} disabled:opacity-50`}>
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {locError && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-2.5 text-xs ${dk('bg-yellow-900/20 border-yellow-700 text-yellow-400','bg-yellow-50 border-yellow-200 text-yellow-700')}`}>
          <HiExclamation className="h-4 w-4 shrink-0 mt-0.5" />
          {locError}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <select value={filter} onChange={e => handleFilterChange(e.target.value)}
          className={`rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${dk('bg-slate-800 border-slate-600 text-slate-200','bg-white border-slate-200 text-slate-700')}`}>
          {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className={`flex items-center gap-1 rounded-xl p-1 ${dk('bg-white/5','bg-slate-100')}`}>
          {RADIUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => handleRadiusChange(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${radius === o.value ? 'bg-white text-green-700 shadow-sm' : dk('text-slate-400 hover:text-slate-200','text-slate-500 hover:text-slate-700')}`}>
              {o.label}
            </button>
          ))}
        </div>

        <span className={`text-xs ml-auto ${textSec}`}>{reports.length} report{reports.length !== 1 ? 's' : ''} found</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className={`text-center py-20 text-sm ${textSec}`}>No reports found in this area.</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r._id} className={`rounded-2xl border shadow-sm p-4 space-y-2 hover:shadow-md transition ${card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${textPri}`}>{r.wasteType}</p>
                    {r.severity && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[r.severity]}`}>{r.severity}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                  </div>
                  <p className={`text-xs mt-0.5 flex items-center gap-1 ${textSec}`}>
                    <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="truncate">{r.location?.displayAddress || r.location?.address}</span>
                  </p>
                  <p className={`text-xs mt-0.5 ${textSec}`}>{fmt(r.createdAt)}</p>
                  <CleanupTimeBadge report={r} />
                </div>
                <button onClick={() => handleUpvote(r._id)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition shrink-0 ${
                    isUpvoted(r)
                      ? 'border-green-500 bg-green-600 text-white'
                      : dk('border-gray-600 text-slate-400 hover:border-green-500 hover:text-green-400','border-green-200 text-green-700 bg-green-50 hover:bg-green-100')
                  }`}>
                  <HiThumbUp className="h-3 w-3" />
                  {r.upvotes?.length || 0}
                </button>
              </div>
              {r.description && (
                <p className={`text-xs line-clamp-2 ${textSec}`}>{r.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NearbyIssues;
