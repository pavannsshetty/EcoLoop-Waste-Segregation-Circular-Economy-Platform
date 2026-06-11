import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiCheckCircle, HiUser, HiMap } from 'react-icons/hi';
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

const staCls = (st, dk) => {
  const map = {
    Requested:   dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-800'),
    Assigned:    dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    'In Progress': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    Collected:   dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
  };
  return map[st] || map.Requested;
};

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DetailModal = ({ task, onClose, dk }) => {
  const [dmMapLayer, setDmMapLayer] = useState('osm');
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const value = dk('text-slate-100', 'text-slate-800');
  const lat = task.latitude || task.location?.lat;
  const lng = task.longitude || task.location?.lng;
  const hasCoords = lat && lng;
  const addressStr = task.location?.address || task.address ||
    `${task.addressDetails?.houseNo || ''} ${task.addressDetails?.streetArea || ''} ${task.addressDetails?.village || ''}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-lg max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl ${panel}`}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Scrap Request Details</p>
          <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-5 space-y-3 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
              Scrap
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(task.status, dk)}`}>{task.status}</span>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Scrap Type</p>
            <p className={`text-sm font-medium ${value}`}>{task.scrapType}</p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Citizen</p>
            <p className={`text-sm font-medium ${value}`}>
              {task.userName || 'Unknown Citizen'}
              {task.userEmail && <span className={`ml-2 text-xs font-normal ${label}`}>· {task.userEmail}</span>}
            </p>
          </div>
          {task.description && (
            <div>
              <p className={`text-xs ${label}`}>Description</p>
              <p className={`text-sm ${value}`}>{task.description}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Quantity</p>
            <p className={`text-sm font-medium ${value}`}>{task.quantity} {task.quantityType || ''}</p>
          </div>
          {task.pickupTime && (
            <div>
              <p className={`text-xs ${label}`}>Pickup Time</p>
              <p className={`text-sm font-medium ${value}`}>{task.pickupTime}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Location</p>
            <p className={`text-sm ${value}`}>{addressStr}</p>
            {hasCoords && (
              <div className="mt-2 space-y-2">
                <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <MapContainer
                    key={`detail-${task._id}`}
                    center={[lat, lng]}
                    zoom={15}
                    scrollWheelZoom={false}
                    dragging={false}
                    zoomControl={false}
                    className="w-full h-full z-10"
                  >
                    {(() => {
                      const currentLayer = getMapLayer(dmMapLayer);
                      return (
                        <TileLayer
                          key={`tile-${dmMapLayer}`}
                          attribution={currentLayer.attribution}
                          url={currentLayer.url}
                          maxZoom={currentLayer.maxZoom}
                          minZoom={currentLayer.minZoom}
                        />
                      );
                    })()}
                    <MapLayerSwitcher currentLayer={dmMapLayer} onLayerChange={setDmMapLayer} position="top-right" />
                    <Marker position={[lat, lng]} />
                  </MapContainer>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${dk('bg-green-900/30 text-green-400', 'bg-green-50 text-green-700')}`}>
                  <HiCheckCircle className="h-3 w-3" /> GPS Location
                </span>
              </div>
            )}
          </div>
          <div>
            <p className={`text-xs ${label}`}>Created</p>
            <p className={`text-sm ${value}`}>{fmtDt(task.createdAt)}</p>
          </div>
          {task.updatedAt && task.updatedAt !== task.createdAt && (
            <div>
              <p className={`text-xs ${label}`}>Last Updated</p>
              <p className={`text-sm ${value}`}>{fmtDt(task.updatedAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ScrapTasks = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [detail, setDetail] = useState(null);
  const [collectorPos, setCollectorPos] = useState(null);
  const [distances, setDistances] = useState({});
  const token = localStorage.getItem('token');
  const [mapLayer, setMapLayer] = useState('osm');
  const [routeMapTarget, setRouteMapTarget] = useState(null);

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
    tasks.forEach((t) => {
      const lat = t.latitude || t.location?.lat;
      const lng = t.longitude || t.location?.lng;
      if (lat != null && lng != null) {
        const d = haversine(collectorPos.lat, collectorPos.lng, lat, lng);
        map[t._id] = { distance: d, duration: Math.ceil(d / 30 * 60) };
      }
    });
    setDistances(map);
  }, [tasks, collectorPos]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? `${API}/api/scrap/collector?sort=${sort}`
        : `${API}/api/scrap/collector?status=${filter}&sort=${sort}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [filter, sort]);

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
      {detail && <DetailModal task={detail} onClose={() => setDetail(null)} dk={dk} />}
      {routeMapTarget && (
        <RouteMapModal
          report={routeMapTarget}
          onClose={() => setRouteMapTarget(null)}
          dk={dk}
          onArrived={(updated) => setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Scrap Requests</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage scrap pickup requests</p>
        </div>
        <button
          type="button"
          onClick={fetchTasks}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')}
          aria-label="Refresh"
        >
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
          {['all', 'Requested', 'Assigned', 'In Progress', 'Collected'].map((v) => (
            <option key={v} value={v}>
              {v === 'all' ? 'All' : v}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          <option value="date">Newest First</option>
          <option value="oldest">Oldest First</option>
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
          const lat = t.latitude || t.location?.lat;
          const lng = t.longitude || t.location?.lng;
          const hasCoords = lat && lng;
          const addressStr = t.location?.address || t.address ||
            `${t.addressDetails?.houseNo || ''} ${t.addressDetails?.streetArea || ''} ${t.addressDetails?.village || ''}`.trim();

          return (
            <div
              key={t._id}
              className={`rounded-lg border p-4 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* LEFT: Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-700 text-white">Scrap</span>
                      <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{t.scrapType}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(t.status, dk)}`}>{t.status}</span>
                    </div>

                    {t.userName && (
                      <p className={`text-xs flex items-center gap-1 font-medium ${dk('text-slate-200', 'text-slate-700')}`}>
                        <HiUser className="h-3 w-3 text-green-500 shrink-0" />
                        {t.userName}
                        {t.userEmail && (
                          <span className={`font-normal ${dk('text-slate-400', 'text-slate-500')}`}>· {t.userEmail}</span>
                        )}
                      </p>
                    )}

                    <p className={`text-xs flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                      <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="truncate">{addressStr}</span>
                      {distances[t._id] && (
                        <span className="shrink-0">
                          · {distances[t._id].distance < 1
                            ? `${Math.round(distances[t._id].distance * 1000)}m`
                            : `${distances[t._id].distance.toFixed(1)}km`} · {distances[t._id].duration} mins away
                        </span>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className={`flex items-center gap-1 ${dk('text-slate-500', 'text-slate-400')}`}>
                        <HiClock className="h-3 w-3 shrink-0" /> {fmt(t.createdAt)}
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold ${
                      dk('bg-white/[0.02] border-slate-700/50', 'bg-slate-50 border-slate-200/60')
                    }`}>
                      <div className="flex items-center gap-1">
                        <span className={dk('text-slate-400', 'text-slate-500')}>Quantity:</span>
                        <span className={dk('text-slate-200', 'text-slate-800')}>{t.quantity} {t.quantityType || ''}</span>
                      </div>
                      {t.pickupTime && (
                        <div className="flex items-center gap-1">
                          <span className={dk('text-slate-400', 'text-slate-500')}>Pickup:</span>
                          <span className={dk('text-slate-200', 'text-slate-800')}>{t.pickupTime}</span>
                        </div>
                      )}
                    </div>

                    {t.description && <p className={`text-xs line-clamp-2 ${dk('text-slate-400', 'text-slate-600')}`}>{t.description}</p>}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {hasCoords && t.status !== 'Collected' && (
                        <button type="button" onClick={() => goToDestination(t)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                            dk('border-green-800/50 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')
                          }`}>
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

                  {/* RIGHT: Map thumbnail */}
                  {hasCoords && (
                    <button type="button" onClick={() => setDetail(t)}
                      className="w-full sm:w-[28%] sm:min-w-[140px] shrink-0">
                      <div className="w-full h-36 sm:h-40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <MapContainer
                          key={`thumb-${t._id}`}
                          center={[lat, lng]}
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
                          <Marker position={[lat, lng]} />
                        </MapContainer>
                      </div>
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => setDetail(t)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-lg border font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                  View
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ScrapTasks;
