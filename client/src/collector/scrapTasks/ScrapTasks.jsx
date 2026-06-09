import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiUser, HiCheckCircle, HiPhone, HiMap } from 'react-icons/hi';
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

const staCls = (st, dk) => {
  const map = {
    Requested:   dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-800'),
    Assigned:    dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    'In Progress': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    Collected:   dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
  };
  return map[st] || map.Requested;
};

const ScrapTasks = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const token = localStorage.getItem('token');
  const [mapLayer, setMapLayer] = useState('osm');
  const [routeMapTarget, setRouteMapTarget] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? `${API}/api/scrap/collector`
        : `${API}/api/scrap/collector?status=${filter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [filter]);

  useEffect(() => {
    const handler = (updated) => {
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    };
    socket.on('scrap_updated', handler);
    return () => socket.off('scrap_updated', handler);
  }, []);

  const assignTask = async (id) => {
    try {
      const res = await fetch(`${API}/api/scrap/assign/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) fetchTasks();
    } catch {}
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API}/api/scrap/update-status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchTasks();
    } catch {}
  };

  const goToDestination = (t) => {
    setRouteMapTarget(t);
  };

  const selectCls = dk(
    'rounded-lg border border-gray-700 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500',
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm'
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">
      {routeMapTarget && (
        <RouteMapModal
          report={routeMapTarget}
          onClose={() => setRouteMapTarget(null)}
          dk={dk}
        />
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Scrap Requests</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage scrap pickup requests</p>
        </div>
        <button type="button" onClick={fetchTasks}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')} aria-label="Refresh">
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
          <option value="all">All</option>
          <option value="Requested">Requested</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Collected">Collected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No scrap requests found.</div>
      ) : (
        tasks.map((t) => {
          const hasCoords = t.latitude && t.longitude;
          const lat = t.latitude || t.location?.lat;
          const lng = t.longitude || t.location?.lng;
          return (
            <div key={t._id}
              className={`rounded-lg border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-700 text-white">Scrap</span>
                    <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{t.scrapType}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(t.status, dk)}`}>{t.status}</span>
                  </div>
                  {t.userName && (
                    <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${dk('text-slate-200', 'text-slate-700')}`}>
                      <HiUser className="h-3 w-3 text-green-500 shrink-0" /> {t.userName}
                    </p>
                  )}
                  <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                    <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="truncate">{t.location?.address || t.address || `${t.addressDetails?.houseNo || ''} ${t.addressDetails?.streetArea || ''} ${t.addressDetails?.village || ''}`}</span>
                  </p>
                  <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>
                    {t.quantity} · {t.pickupTime}
                  </p>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>
                    <HiClock className="h-3 w-3 shrink-0" /> {fmt(t.createdAt)}
                  </p>
                  {t.description && (
                    <p className={`text-xs mt-1 line-clamp-2 ${dk('text-slate-400', 'text-slate-600')}`}>{t.description}</p>
                  )}
                </div>
              </div>

              {hasCoords && (
                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} className="w-full h-full z-10">
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
                    <Marker position={[lat, lng]} />
                  </MapContainer>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {hasCoords && t.status !== 'Collected' && (
                  <button type="button" onClick={() => goToDestination(t)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${dk('border-green-800/50 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')}`}>
                    <HiMap className="h-3.5 w-3.5" /> Navigate
                  </button>
                )}
                {t.status === 'Requested' && (
                  <button type="button" onClick={() => assignTask(t._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
                    Accept Request
                  </button>
                )}
                {t.status === 'Assigned' && (
                  <button type="button" onClick={() => updateStatus(t._id, 'In Progress')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-500 transition">
                    On The Way
                  </button>
                )}
                {t.status === 'In Progress' && (
                  <button type="button" onClick={() => updateStatus(t._id, 'Collected')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                    Mark Collected
                  </button>
                )}
                {t.status === 'Collected' && (
                  <span className={`text-xs font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
                    <HiCheckCircle className="h-3.5 w-3.5" /> Collected {fmt(t.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ScrapTasks;