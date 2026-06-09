import { useEffect, useState, useRef } from 'react';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiPhotograph, HiPhone, HiUser, HiCheckCircle, HiMap } from 'react-icons/hi';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import socket from '../../socket';
import { getMapLayer } from '../../shared/utils/mapLayers';
import MapLayerSwitcher from '../../shared/components/MapLayerSwitcher';
import RouteMapModal from '../../shared/components/RouteMapModal';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const fmtDt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const sevCls = (sev, dk) => {
  const map = {
    High: dk('bg-red-900/40 text-red-400 border-red-800', 'bg-red-100 text-red-700 border-red-200'),
    Medium: dk('bg-yellow-900/40 text-yellow-400 border-yellow-800', 'bg-yellow-100 text-yellow-800 border-yellow-200'),
    Low: dk('bg-green-900/40 text-green-400 border-green-800', 'bg-green-100 text-green-700 border-green-200'),
  };
  return map[sev] || map.Low;
};

const staCls = (st, dk) => {
  const map = {
    Submitted:   dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-800'),
    Assigned:    dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    'In Progress': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    Resolved:    dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
  };
  return map[st] || map.Submitted;
};

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DetailModal = ({ report, onClose, dk }) => {
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const value = dk('text-slate-100', 'text-slate-800');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`rounded-lg border w-full max-w-lg p-5 space-y-4 shadow-xl overflow-y-auto max-h-[90vh] ${panel}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Citizen Details</p>
          <button type="button" onClick={onClose} className={dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-800')}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          {report.reportId && (
            <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
              {report.reportId}
            </span>
          )}
          <div>
            <p className={`text-xs ${label}`}>Citizen</p>
            <div className={`flex items-center gap-2 ${value}`}>
              <HiUser className="h-4 w-4 text-green-500" />
              <span className="font-medium">{report.userId?.name || 'Unknown Citizen'}</span>
            </div>
          </div>
          {report.userId?.phone && (
            <div>
              <p className={`text-xs ${label}`}>Phone</p>
              <a
                href={`tel:${report.userId.phone}`}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:underline"
              >
                <HiPhone className="h-4 w-4" /> {report.userId.phone}
              </a>
            </div>
          )}
          {report.userId?.email && (
            <div>
              <p className={`text-xs ${label}`}>Email</p>
              <p className={`text-sm ${value}`}>{report.userId.email}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Pickup Address</p>
            <p className={`text-sm ${value}`}>
              {[report.houseNo, report.street, report.village, report.landmark].filter(Boolean).join(', ')}
            </p>
          </div>
          {report.location?.lat && report.location?.lng && (
            <div className={`flex items-center gap-2 ${dk('text-green-400', 'text-green-700')}`}>
              <HiCheckCircle className="h-4 w-4" />
              <span className={`text-xs font-semibold ${dk('text-green-400', 'text-green-700')}`}>GPS Verified Location</span>
              <div className={`text-[10px] font-mono ${dk('text-slate-500', 'text-slate-400')}`}>
                ({report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)})
              </div>
            </div>
          )}
          {report.location?.lat && report.location?.lng && (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <MapContainer
                key={`detail-${report._id}`}
                center={[report.location.lat, report.location.lng]}
                zoom={15}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                className="w-full h-full z-10"
              >
                {(() => {
                  const currentLayer = getMapLayer(mapLayer);
                  return (
                    <TileLayer
                      key={`tile-${mapLayer}`}
                      attribution={currentLayer.attribution}
                      url={currentLayer.url}
                      maxZoom={currentLayer.maxZoom}
                      minZoom={currentLayer.minZoom}
                    />
                  );
                })()}
                <MapLayerSwitcher currentLayer={mapLayer} onLayerChange={setMapLayer} position="top-right" />
                <Marker position={[report.location.lat, report.location.lng]} />
              </MapContainer>
            </div>
          )}
          {report.location?.address && (
            <p className={`text-xs ${value}`}>{report.location.address}</p>
          )}
          <div>
            <p className={`text-xs ${label}`}>Pickup Time</p>
            <p className={`text-sm font-medium ${value}`}>{report.pickupTime ? fmtDt(report.pickupTime) : 'Not scheduled'}</p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Waste Type</p>
            <p className={`text-sm font-medium ${value}`}>{report.wasteType || 'N/A'}</p>
          </div>
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
            <p className={`text-xs ${label}`}>Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(report.status, dk)}`}>{report.status}</span>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Created</p>
            <p className={`text-sm ${value}`}>{fmtDt(report.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RevokeConfirmModal = ({ report, onClose, onRevoke, dk, loading }) => {
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`rounded-lg border w-full max-w-sm p-5 space-y-4 shadow-xl ${panel}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Revoke Completion</p>
          <button type="button" onClick={onClose} className={dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-800')}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          <div className={`p-3 rounded-lg border ${dk('bg-red-900/10 border-red-800/30', 'bg-red-50 border-red-200')}`}>
            <p className={`text-sm font-medium ${dk('text-red-300', 'text-red-700')}`}>
              Are you sure you want to revoke this completed report?
            </p>
            <p className={`text-xs mt-1 ${dk('text-red-400/70', 'text-red-500/70')}`}>
              The report will be restored to active status and will not count as completed.
            </p>
          </div>
          <div className="space-y-1 text-xs">
            <p className={dk('text-slate-400', 'text-slate-500')}>
              Report: <span className="font-medium">{report.reportId || report._id?.slice(-6)}</span>
            </p>
            <p className={dk('text-slate-400', 'text-slate-500')}>
              Waste: <span className="font-medium">{report.wasteType}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${
              dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50')
            }`}>
            Cancel
          </button>
          <button type="button" onClick={onRevoke} disabled={loading}
            className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-500 transition disabled:opacity-60">
            {loading ? 'Revoking...' : 'Yes, Revoke'}
          </button>
        </div>
      </div>
    </div>
  );
};

const HomePickupTasks = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [detail, setDetail] = useState(null);
  const [collectorPos, setCollectorPos] = useState(null);
  const [distances, setDistances] = useState({});
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [routeMapTarget, setRouteMapTarget] = useState(null);
  const [mapLayer, setMapLayer] = useState('osm');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCollectorPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (!collectorPos) return;
    const map = {};
    reports.forEach((r) => {
      if (r.location?.lat != null && r.location?.lng != null) {
        const d = haversine(collectorPos.lat, collectorPos.lng, r.location.lat, r.location.lng);
        map[r._id] = { distance: d, duration: Math.ceil(d / 30 * 60) };
      }
    });
    setDistances(map);
  }, [reports, collectorPos]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/reports/home-pickup?filter=${filter}&sort=${sort}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } else {
        // parse server message when available and surface a helpful error
        let data = null;
        try { data = await res.json(); } catch (e) { /* ignore JSON parse */ }
        const msg = data?.message || data?.error || `Failed to load reports (${res.status})`;
        console.error('[HomePickupTasks] fetchReports error', res.status, msg, data);
        setError(msg);
        // if unauthorized/forbidden, clear token to surface login flow
        if (res.status === 401 || res.status === 403) {
          try { localStorage.removeItem('token'); } catch (e) {}
        }
      }
    } catch {
      console.error('[HomePickupTasks] fetchReports network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter, sort]);

  useEffect(() => {
    const handler = (updated) => {
      setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));
    };
    socket.on('report_updated', handler);
    return () => socket.off('report_updated', handler);
  }, []);

  const updateStatus = async (item, status) => {
    try {
      const res = await fetch(`${API}/api/collector/report/${item._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setReports((rs) => rs.map((r) => (r._id === item._id ? data.report : r)));
      }
    } catch {}
  };

  const revokeCompletion = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/report/${revokeTarget._id}/revoke`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setReports((rs) => rs.map((r) => (r._id === revokeTarget._id ? data.report : r)));
        setRevokeTarget(null);
      }
    } catch {} finally { setRevokeLoading(false); }
  };

  const onDone = (updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));

  const goToDestination = (r) => {
    setRouteMapTarget(r);
  };

  const selectCls = dk(
    'rounded-lg border border-gray-700 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500',
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm'
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">
      {detail && <DetailModal report={detail} onClose={() => setDetail(null)} dk={dk} />}
      {revokeTarget && (
        <RevokeConfirmModal
          report={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onRevoke={revokeCompletion}
          dk={dk}
          loading={revokeLoading}
        />
      )}
      {routeMapTarget && (
        <RouteMapModal
          report={routeMapTarget}
          onClose={() => setRouteMapTarget(null)}
          dk={dk}
          onArrived={(updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)))}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Home Pickup Tasks</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage home pickup collection tasks</p>
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
          {['all', 'Submitted', 'Assigned', 'In Progress', 'Resolved'].map((v) => (
            <option key={v} value={v}>
              {v === 'all' ? 'All' : v}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          <option value="date">Newest First</option>
          <option value="schedule">Schedule</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No home pickup reports found.</div>
      ) : (
        reports.map((r) => (
          <div
            key={r._id}
            className={`rounded-lg border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-700 text-white">Home Pickup</span>
                  {r.reportId && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
                      {r.reportId}
                    </span>
                  )}
                  <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{r.wasteType}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(r.status, dk)}`}>{r.status}</span>
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${dk('text-slate-200', 'text-slate-700')}`}>
                  <HiUser className="h-3 w-3 text-green-500 shrink-0" />
                  {r.userId?.name || 'Unknown Citizen'}
                  {r.userId?.phone && (
                    <span className={`font-normal ${dk('text-slate-400', 'text-slate-500')}`}>
                      · {r.userId.phone}
                    </span>
                  )}
                </p>

                <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                  <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                  <span className="truncate">
                    {[r.houseNo, r.street, r.village].filter(Boolean).join(', ')}
                  </span>
                  {distances[r._id] && (
                    <span className="shrink-0">
                      · {distances[r._id].distance < 1
                        ? `${Math.round(distances[r._id].distance * 1000)}m`
                        : `${distances[r._id].distance.toFixed(1)}km`} · {distances[r._id].duration} mins away
                    </span>
                  )}
                </p>

                {r.pickupTime && (
                  <p className={`text-xs flex items-center gap-1 mt-0.5 font-medium ${dk('text-green-400', 'text-green-700')}`}>
                    <HiClock className="h-3 w-3 shrink-0" />
                    Scheduled: {fmtDt(r.pickupTime)}
                  </p>
                )}

                <p className={`text-xs flex items-center gap-1 mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>
                  <HiClock className="h-3 w-3 shrink-0" /> Created: {fmt(r.createdAt)}
                </p>

                {r.quantity && (
                  <p className={`text-xs font-medium mt-1 ${dk('text-slate-300', 'text-slate-700')}`}>Quantity: {r.quantity}</p>
                )}
                {r.description && (
                  <p className={`text-xs mt-1 line-clamp-2 ${dk('text-slate-400', 'text-slate-600')}`}>{r.description}</p>
                )}
              </div>
              <div className="flex items-start gap-2 shrink-0">
                {r.userId?.phone && (
                  <a
                    href={`tel:${r.userId.phone}`}
                    className={`flex items-center justify-center h-8 w-8 rounded-full border transition ${dk('border-green-700 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')}`}
                    title={`Call ${r.userId.phone}`}
                  >
                    <HiPhone className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setDetail(r)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}
                >
                  View
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {r.location?.lat != null && r.location?.lng != null && r.status !== 'Resolved' && (
                <button
                  type="button"
                  onClick={() => goToDestination(r)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                    dk('border-green-800/50 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')
                  }`}
                >
                  <HiMap className="h-3.5 w-3.5" /> Navigate
                </button>
              )}
              {r.status === 'Submitted' && (
                <button
                  type="button"
                  onClick={() => updateStatus(r, 'Assigned')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
                >
                  Accept Pickup
                </button>
              )}
              {r.status === 'Assigned' && (
                <button
                  type="button"
                  onClick={() => updateStatus(r, 'In Progress')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-500 transition"
                >
                  Start Pickup
                </button>
              )}
              {r.status === 'In Progress' && (
                <button
                  type="button"
                  onClick={() => updateStatus(r, 'Resolved')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
                >
                  Mark Picked Up
                </button>
              )}
              {r.status === 'Resolved' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
                    <HiCheckCircle className="h-3.5 w-3.5" /> Completed {fmt(r.completedAt || r.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRevokeTarget(r)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                      dk('border-red-800/50 text-red-400 hover:bg-red-900/30', 'border-red-200 text-red-600 hover:bg-red-50')
                    }`}
                  >
                    <HiX className="h-3.5 w-3.5" /> Revoke Completion
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default HomePickupTasks;
