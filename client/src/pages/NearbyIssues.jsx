import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLocationMarker, HiRefresh, HiThumbUp, HiViewList, HiMap } from 'react-icons/hi';
import CleanupTimeBadge from '../components/CleanupTimeBadge';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let _mapsPromise = null;
const loadMaps = () => {
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    s.async = true; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return _mapsPromise;
};

const SEVERITY_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
const STATUS_STYLES = {
  Submitted:    'bg-yellow-100 text-yellow-700',
  'In Progress':'bg-blue-100 text-blue-700',
  Resolved:     'bg-green-100 text-green-700',
};
const SEVERITY_STYLES = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };

const RADIUS_OPTIONS  = [{ label: '1 km', value: 1 }, { label: '3 km', value: 3 }, { label: '5 km', value: 5 }];
const FILTER_OPTIONS  = [
  { label: 'All Reports',   value: 'all'         },
  { label: 'High Priority', value: 'High'        },
  { label: 'In Progress',   value: 'In Progress' },
  { label: 'Resolved',      value: 'Resolved'    },
];

const NearbyIssues = () => {
  const navigate  = useNavigate();
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const markers   = useRef([]);
  const infoWin   = useRef(null);

  const [userPos,   setUserPos]   = useState(null);
  const [reports,   setReports]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [mapReady,  setMapReady]  = useState(false);
  const [view,      setView]      = useState('map');
  const [radius,    setRadius]    = useState(3);
  const [filter,    setFilter]    = useState('all');
  const [error,     setError]     = useState('');

  const fetchReports = useCallback(async (lat, lng, rad, fil) => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const sev   = ['High', 'Medium', 'Low'].includes(fil) ? `&severity=${fil}` : '';
      const sta   = fil === 'In Progress' || fil === 'Resolved' ? `&status=${fil}` : '';
      const res   = await fetch(`/api/waste/nearby?lat=${lat}&lng=${lng}&radius=${rad}${sev}${sta}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch nearby reports.');
      setReports(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadMaps();
      const defaultCenter = { lat: 13.3409, lng: 74.7421 };

      navigator.geolocation?.getCurrentPosition(
        async (pos) => {
          const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(center);
          initMap(center);
          await fetchReports(center.lat, center.lng, radius, filter);
        },
        async () => {
          setUserPos(defaultCenter);
          initMap(defaultCenter);
          await fetchReports(defaultCenter.lat, defaultCenter.lng, radius, filter);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };
    init();
  }, []);

  const initMap = (center) => {
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center, zoom: 13,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    });
    new window.google.maps.Marker({
      position: center, map: mapObj.current,
      title: 'Your Location',
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    });
    infoWin.current = new window.google.maps.InfoWindow();
    setMapReady(true);
  };

  useEffect(() => {
    if (!mapReady || !mapObj.current) return;
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];

    reports.forEach(r => {
      if (!r.location?.lat || !r.location?.lng) return;
      const color = SEVERITY_COLORS[r.severity] || '#6b7280';
      const marker = new window.google.maps.Marker({
        position: { lat: r.location.lat, lng: r.location.lng },
        map: mapObj.current,
        title: r.wasteType,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color, fillOpacity: 0.9,
          strokeColor: '#fff', strokeWeight: 2,
        },
      });
      marker.addListener('click', () => {
        setSelected(r);
        infoWin.current.setContent(`
          <div style="font-family:Inter,sans-serif;padding:4px;min-width:160px">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">${r.wasteType}</p>
            <p style="font-size:11px;color:#6b7280;margin:0 0 2px">${r.location.displayAddress || r.location.address || ''}</p>
            <span style="font-size:11px;background:${color}22;color:${color};padding:2px 8px;border-radius:99px;font-weight:600">${r.severity || 'N/A'}</span>
          </div>
        `);
        infoWin.current.open(mapObj.current, marker);
      });
      markers.current.push(marker);
    });
  }, [reports, mapReady]);

  const handleRefresh = async () => {
    if (!userPos) return;
    await fetchReports(userPos.lat, userPos.lng, radius, filter);
  };

  const handleFilterChange = async (val) => {
    setFilter(val);
    if (userPos) await fetchReports(userPos.lat, userPos.lng, radius, val);
  };

  const handleRadiusChange = async (val) => {
    setRadius(val);
    if (userPos) await fetchReports(userPos.lat, userPos.lng, val, filter);
  };

  const handleUpvote = async (id) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/waste/upvote/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (res.ok) {
        setReports(rs => rs.map(r => r._id === id
          ? { ...r, upvotes: Array(data.upvotes).fill(null), severity: data.severity }
          : r
        ));
        if (selected?._id === id) setSelected(s => ({ ...s, upvotes: Array(data.upvotes).fill(null), severity: data.severity }));
      }
    } catch { }
  };

  const isUpvoted = (r) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return r.upvotes?.some(u => (u?._id || u) === user._id);
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="flex flex-col h-full">

      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-100 flex-wrap">
        <select value={filter} onChange={e => handleFilterChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm">
          {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {RADIUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => handleRadiusChange(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${radius === o.value ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 ml-auto">
          <button onClick={() => setView('map')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === 'map' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}>
            <HiMap className="h-3.5 w-3.5" /> Map
          </button>
          <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === 'list' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}>
            <HiViewList className="h-3.5 w-3.5" /> List
          </button>
        </div>

        <button onClick={handleRefresh} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-green-600 transition disabled:opacity-50">
          <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{error}</div>}

      <div className="flex flex-1 overflow-hidden">

        {view === 'map' && (
          <div className="flex flex-1 overflow-hidden relative">
            <div ref={mapRef} className="flex-1 h-full min-h-[400px]" />

            {selected && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-10">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">{selected.wasteType}</p>
                        {selected.severity && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[selected.severity]}`}>{selected.severity}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selected.status] || 'bg-slate-100 text-slate-600'}`}>{selected.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{selected.location?.displayAddress || selected.location?.address}</p>
                      <p className="text-xs text-slate-400">{fmt(selected.createdAt)}</p>
                      <CleanupTimeBadge report={selected} />
                    </div>
                    <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none shrink-0">✕</button>
                  </div>
                  {selected.description && <p className="text-xs text-slate-500 line-clamp-2">{selected.description}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => handleUpvote(selected._id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                        isUpvoted(selected)
                          ? 'border-green-500 bg-green-600 text-white cursor-default'
                          : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                      }`}>
                      <HiThumbUp className="h-3.5 w-3.5" />
                      {isUpvoted(selected) ? 'Supported' : 'Support'} ({selected.upvotes?.length || 0})
                    </button>
                    <button onClick={() => navigate('/citizen/my-reports')}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="absolute top-3 right-3 bg-white rounded-xl shadow-md border border-slate-100 p-3 space-y-1.5 text-xs">
              {[['High', '#ef4444'], ['Medium', '#f59e0b'], ['Low', '#22c55e']].map(([label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">No reports found in this area.</div>
            ) : (
              reports.map(r => (
                <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{r.wasteType}</p>
                        {r.severity && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[r.severity]}`}>{r.severity}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate">{r.location?.displayAddress || r.location?.address}</span>
                      </p>
                      <p className="text-xs text-slate-400">{fmt(r.createdAt)}</p>
                      <CleanupTimeBadge report={r} />
                    </div>
                    <button onClick={() => handleUpvote(r._id)}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition shrink-0 ${
                        isUpvoted(r)
                          ? 'border-green-500 bg-green-600 text-white'
                          : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                      }`}>
                      <HiThumbUp className="h-3 w-3" /> {r.upvotes?.length || 0}
                    </button>
                  </div>
                  {r.description && <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyIssues;
