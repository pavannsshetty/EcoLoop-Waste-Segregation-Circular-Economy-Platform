import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Tooltip } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  HiLocationMarker, HiX, HiRefresh, HiCheckCircle, HiClock,
  HiHome, HiArrowRight
} from 'react-icons/hi';
import { getMapLayer } from '../utils/mapLayers';
import MapLayerSwitcher from './MapLayerSwitcher';
import { API } from '../constants';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const collectorIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;line-height:1;text-align:center;">🚛</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const destinationIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;line-height:1;text-align:center;">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const arrivedIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;line-height:1;text-align:center;">✅</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const statusCls = (st, dk) => {
  const map = {
    'On The Way': dk('bg-blue-900/40 text-blue-400 border-blue-800', 'bg-blue-100 text-blue-700 border-blue-200'),
    Arrived: dk('bg-green-900/40 text-green-400 border-green-800', 'bg-green-100 text-green-700 border-green-200'),
  };
  return map[st] || map['On The Way'];
};

const FitBounds = ({ positions, routeCoords }) => {
  const map = useMap();
  const hasRouted = useRef(false);

  useEffect(() => {
    const coords = routeCoords.length >= 2 ? routeCoords : positions;
    if (coords.length >= 2) {
      map.fitBounds(coords, { padding: [60, 60], maxZoom: 16 });
      if (routeCoords.length >= 2) hasRouted.current = true;
    } else if (coords.length === 1 && !hasRouted.current) {
      map.setView(coords[0], 15);
    }
  }, [map, positions, routeCoords]);

  return null;
};

const MapMarkers = ({ collectorPos, destCoords, arrived }) => {
  if (!collectorPos || !destCoords) return null;
  return (
    <>
      <Marker position={[collectorPos.lat, collectorPos.lng]} icon={arrived ? arrivedIcon : collectorIcon}>
        <Tooltip permanent direction="top" offset={[0, -18]}>
          {arrived ? '✓ You are here' : 'Your Location'}
        </Tooltip>
      </Marker>
      <Marker position={destCoords} icon={arrived ? arrivedIcon : destinationIcon}>
        <Tooltip permanent direction="top" offset={[0, -22]}>
          {arrived ? '✓ Destination' : 'Destination'}
        </Tooltip>
      </Marker>
    </>
  );
};

const RouteLine = ({ routeCoords }) => {
  if (routeCoords.length < 2) return null;
  return (
    <Polyline
      positions={routeCoords}
      pathOptions={{ color: '#0EB02D', weight: 4, opacity: 0.8 }}
    />
  );
};

const MapTileLayer = ({ mapLayer }) => {
  const layer = useMemo(() => getMapLayer(mapLayer), [mapLayer]);
  return (
    <TileLayer
      key={`tile-${mapLayer}`}
      attribution={layer.attribution}
      url={layer.url}
      maxZoom={layer.maxZoom}
      minZoom={layer.minZoom}
    />
  );
};

const StatItem = ({ icon: Icon, label, value, color, dk }) => {
  const colorMap = {
    green: dk('text-green-400', 'text-green-600'),
    blue: dk('text-blue-400', 'text-blue-600'),
  };
  const iconColor = colorMap[color] || dk('text-slate-400', 'text-slate-500');
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${dk('text-slate-500', 'text-slate-400')}`}>
          {label}
        </p>
        <p className={`text-sm font-bold mt-0.5 truncate ${dk('text-slate-200', 'text-slate-800')}`}>
          {value}
        </p>
      </div>
    </div>
  );
};

const RouteMapModal = ({ report, onClose, dk, onArrived }) => {
  const [collectorPos, setCollectorPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arriving, setArriving] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [error, setError] = useState('');
  const [mapLayer, setMapLayer] = useState('osm');
  const watchIdRef = useRef(null);
  const token = localStorage.getItem('token');

  const destLat = report?.location?.lat ?? report?.latitude ?? report?.deliveryLatitude ?? report?.location?.coordinates?.[1];
  const destLng = report?.location?.lng ?? report?.longitude ?? report?.deliveryLongitude ?? report?.location?.coordinates?.[0];
  const rawId = report?.reportId || report?._id?.slice(-6) || '';
  const address = report?.location?.displayAddress || report?.location?.address || report?.address || report?.deliveryAddress || '';

  const fetchRoute = useCallback(async (origin, destLat, destLng) => {
    try {
      const url = `${OSRM_URL}/${origin.lng},${origin.lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        setRouteCoords(coords);
        setDistance((route.distance / 1000).toFixed(1));
        setDuration(Math.ceil(route.duration / 60));
      } else {
        setRouteCoords([[origin.lat, origin.lng], [destLat, destLng]]);
        const d = haversine(origin.lat, origin.lng, destLat, destLng);
        setDistance(d.toFixed(1));
        setDuration(Math.ceil(d / 30 * 60));
      }
    } catch {
      setRouteCoords([[origin.lat, origin.lng], [destLat, destLng]]);
      const d = haversine(origin.lat, origin.lng, destLat, destLng);
      setDistance(d.toFixed(1));
      setDuration(Math.ceil(d / 30 * 60));
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCollectorPos(origin);
        fetchRoute(origin, destLat, destLng);
        setLoading(false);

        fetch(`${API}/api/collector/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: origin.lat, lng: origin.lng }),
        }).catch(() => {});

        watchIdRef.current = navigator.geolocation.watchPosition(
          (newPos) => {
            const updated = { lat: newPos.coords.latitude, lng: newPos.coords.longitude };
            setCollectorPos(updated);
            fetchRoute(updated, destLat, destLng);

            fetch(`${API}/api/collector/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ lat: updated.lat, lng: updated.lng }),
            }).catch(() => {});
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      },
      () => {
        setError('Could not get your location. Please enable GPS.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destLat, destLng, fetchRoute, token]);

  const handleRecenter = useCallback(() => {
    if (collectorPos) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const updated = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCollectorPos(updated);
          fetchRoute(updated, destLat, destLng);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [collectorPos, fetchRoute, destLat, destLng]);

  const handleArrived = async () => {
    if (!report?._id) return;
    setArriving(true);
    try {
      const res = await fetch(`${API}/api/collector/report/${report._id}/arrived`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setArrived(true);
        if (onArrived) onArrived(data.report);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.message || 'Failed to mark arrived.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setArriving(false);
    }
  };

  const destCoords = useMemo(() => {
    return (destLat != null && destLng != null) ? [destLat, destLng] : null;
  }, [destLat, destLng]);

  const positions = useMemo(() => {
    const arr = [];
    if (collectorPos) arr.push([collectorPos.lat, collectorPos.lng]);
    if (destCoords) arr.push(destCoords);
    return arr;
  }, [collectorPos, destCoords]);

  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const text = dk('text-slate-200', 'text-slate-800');
  const sub = dk('text-slate-400', 'text-slate-500');
  const label = dk('text-slate-500', 'text-slate-400');
  const cardCls = dk('bg-white/5 border-gray-700', 'bg-white border-slate-100');
  const ghostBtn = dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50');
  const errorCls = dk('bg-red-900/40 text-red-400 border border-red-800', 'bg-red-50 text-red-600 border border-red-200');
  const arrivedCls = dk('text-green-400', 'text-green-700');
  const spinnerCls = dk('bg-slate-900', 'bg-white');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col sm:rounded-xl border shadow-2xl overflow-hidden ${panel}`}>

        <div className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight ${text}`}>
                Route Navigation
              </h1>
              {rawId && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg border ${
                  dk('bg-green-900/30 text-green-400 border-green-800', 'bg-green-50 text-green-600 border-green-100')
                }`}>
                  {rawId}
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCls(arrived ? 'Arrived' : 'On The Way', dk)}`}>
                {arrived ? 'Arrived' : 'On The Way'}
              </span>
            </div>
            {address && (
              <p className={`text-xs sm:text-sm mt-1 truncate flex items-center gap-1 ${sub}`}>
                <HiLocationMarker className="h-3.5 w-3.5 shrink-0" />
                {address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {!arrived && (
              <button type="button" onClick={handleRecenter}
                className={`p-2 rounded-lg border transition ${ghostBtn}`}
                title="Recenter map">
                <HiRefresh className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={onClose}
              className={`p-2 rounded-lg border transition ${ghostBtn}`}
              title="Close">
              <HiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className={`mx-4 sm:mx-6 mt-3 px-3 py-2 rounded-lg text-xs font-medium ${errorCls}`}>
            {error}
          </div>
        )}

        <div className="relative h-[350px] sm:h-[50vh] lg:h-[60vh]">
          {loading ? (
            <div className={`absolute inset-0 z-20 flex items-center justify-center ${spinnerCls}`}>
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
                <p className={`text-sm font-medium ${sub}`}>Getting your location...</p>
              </div>
            </div>
          ) : collectorPos && destCoords ? (
            <MapContainer
              center={[collectorPos.lat, collectorPos.lng]}
              zoom={14}
              className="w-full h-full z-10"
              zoomControl={true}
              key="route-map"
            >
              <MapTileLayer mapLayer={mapLayer} />
              <MapLayerSwitcher currentLayer={mapLayer} onLayerChange={setMapLayer} position="top-right" />
              <FitBounds positions={positions} routeCoords={routeCoords} />
              <MapMarkers collectorPos={collectorPos} destCoords={destCoords} arrived={arrived} />
              <RouteLine routeCoords={routeCoords} />
            </MapContainer>
          ) : (
            <div className={`absolute inset-0 z-20 flex items-center justify-center ${spinnerCls}`}>
              <p className={`text-sm ${sub}`}>Location data unavailable.</p>
            </div>
          )}
        </div>

        <div className="border-t shrink-0">
          <div className="p-4 sm:p-5 space-y-3">

            {!arrived && distance != null && (
              <div className={`rounded-lg border shadow-sm ${cardCls}`}>
                <div className="p-3 sm:p-4 space-y-3">
                  <h2 className={`text-[10px] font-bold uppercase tracking-wider ${label}`}>
                    Route Details
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatItem icon={HiLocationMarker} label="Distance" value={`${distance} km`} color="green" dk={dk} />
                    <StatItem icon={HiClock} label="Est. Time" value={`${duration} min`} color="blue" dk={dk} />
                    <StatItem icon={HiCheckCircle} label="Status" value={arrived ? 'Arrived' : 'Active'} dk={dk} />
                    <StatItem icon={HiHome} label="Report ID" value={rawId || '---'} dk={dk} />
                  </div>
                  {address && (
                    <div className={`pt-3 border-t ${dk('border-slate-700', 'border-slate-200')}`}>
                      <div className="flex items-start gap-2.5">
                        <HiLocationMarker className={`h-4 w-4 mt-0.5 shrink-0 ${label}`} />
                        <div className="min-w-0">
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${label}`}>Destination Area</p>
                          <p className={`text-sm font-medium mt-0.5 ${text}`}>{address}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {arrived && (
              <div className={`flex items-center justify-center gap-2 py-3 ${arrivedCls}`}>
                <HiCheckCircle className="h-6 w-6" />
                <span className="text-base font-bold">Arrived at destination</span>
              </div>
            )}

            {!arrived && collectorPos && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button type="button" onClick={handleRecenter}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition w-full sm:flex-1 ${ghostBtn}`}>
                  <HiRefresh className="h-4 w-4" /> Recenter
                </button>
                <button type="button" onClick={handleArrived} disabled={arriving}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-2.5 text-sm font-semibold hover:bg-green-500 active:scale-[0.98] transition disabled:opacity-60 w-full sm:flex-[2]">
                  {arriving ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <><HiCheckCircle className="h-4 w-4" /> Mark Arrived</>
                  )}
                </button>
                <button type="button" onClick={onClose}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition w-full sm:flex-1 ${ghostBtn}`}>
                  <HiX className="h-4 w-4" /> Close
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default RouteMapModal;
