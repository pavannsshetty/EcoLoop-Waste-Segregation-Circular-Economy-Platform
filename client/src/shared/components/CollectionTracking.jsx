import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiLocationMarker, HiClock, HiCheckCircle, HiTruck, HiUser } from 'react-icons/hi';
import { getMapLayer } from '../utils/mapLayers';
import MapLayerSwitcher from './MapLayerSwitcher';
import { API } from '../constants';
import socket from '../../socket';

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

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [50, 50] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 15);
    }
  }, [map, JSON.stringify(positions)]);
  return null;
};

const STATUS_STEPS = ['Submitted', 'Assigned', 'On The Way', 'Arrived', 'Completed'];

const statusToStepIndex = (status) => {
  const map = {
    Submitted: 0,
    Verified: 0,
    Assigned: 1,
    'In Progress': 3,
    Resolved: 4,
    Delayed: 3,
  };
  return map[status] ?? 0;
};

const CollectionTracking = ({ report, dk }) => {
  const [collectorLoc, setCollectorLoc] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapLayer, setMapLayer] = useState('osm');
  const intervalRef = useRef(null);

  const destLat = report?.location?.lat;
  const destLng = report?.location?.lng;
  const collectorId = report?.assignedCollector?._id;
  const collectorName = report?.assignedCollector?.name || '';
  const status = report?.status || '';

  const hasLocation = collectorLoc != null;
  const statusIdx = statusToStepIndex(status);
  const stepIndex = (statusIdx === 1 && hasLocation) ? 2 : statusIdx;
  const arrived = status === 'In Progress' || status === 'Resolved';

  const fetchCollectorLocation = useCallback(async () => {
    if (!collectorId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/collector/${collectorId}/location`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lat != null && data.lng != null) {
          setCollectorLoc({ lat: data.lat, lng: data.lng });
        }
      }
    } catch { /* silent */ }
  }, [collectorId]);

  const fetchRoute = useCallback(async (origin, dLat, dLng) => {
    try {
      const url = `${OSRM_URL}/${origin.lng},${origin.lat};${dLng},${dLat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        setRouteCoords(coords);
        setDistance((route.distance / 1000).toFixed(1));
        setDuration(Math.ceil(route.duration / 60));
      } else {
        setRouteCoords([[origin.lat, origin.lng], [dLat, dLng]]);
        const d = haversine(origin.lat, origin.lng, dLat, dLng);
        setDistance(d.toFixed(1));
        setDuration(Math.ceil(d / 30 * 60));
      }
    } catch {
      setRouteCoords([[origin.lat, origin.lng], [dLat, dLng]]);
      const d = haversine(origin.lat, origin.lng, dLat, dLng);
      setDistance(d.toFixed(1));
      setDuration(Math.ceil(d / 30 * 60));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCollectorLocation().then(() => setLoading(false));

    // Poll for location updates every 15s
    intervalRef.current = setInterval(fetchCollectorLocation, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCollectorLocation]);

  useEffect(() => {
    if (collectorLoc && destLat != null && destLng != null) {
      fetchRoute(collectorLoc, destLat, destLng);
    }
  }, [collectorLoc, destLat, destLng, fetchRoute]);

  // Socket listener for live location updates
  useEffect(() => {
    if (!collectorId) return;
    const handler = (data) => {
      if (data.collectorId === collectorId && data.lat != null && data.lng != null) {
        setCollectorLoc({ lat: data.lat, lng: data.lng });
      }
    };
    socket.on('collector_location_updated', handler);
    return () => socket.off('collector_location_updated', handler);
  }, [collectorId]);

  const text = dk('text-slate-200', 'text-slate-800');
  const sub = dk('text-slate-400', 'text-slate-500');
  const label = dk('text-slate-500', 'text-slate-400');
  const panel = dk('bg-slate-800 border-slate-700', 'bg-white border-slate-200');

  const positions = [];
  if (collectorLoc) positions.push([collectorLoc.lat, collectorLoc.lng]);
  if (destLat != null && destLng != null) positions.push([destLat, destLng]);

  return (
    <div className={`rounded-xl border overflow-hidden ${panel}`}>
      <div className="px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <HiTruck className={`h-5 w-5 ${dk('text-green-400', 'text-green-600')}`} />
          <p className={`text-sm font-bold ${text}`}>Collection Tracking</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {collectorName && (
          <div className="flex items-center gap-2 text-sm">
            <HiUser className={`h-4 w-4 ${dk('text-green-400', 'text-green-600')}`} />
            <span className={`font-medium ${text}`}>{collectorName}</span>
            <span className={`text-xs ${sub}`}>· Collector</span>
          </div>
        )}

        <div className={`flex items-center gap-1 text-xs font-medium ${sub}`}>
          <span className={dk('text-slate-300', 'text-slate-600')}>Status:</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status === 'Resolved' ? dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700') : status === 'In Progress' || status === 'Assigned' ? dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700') : dk('bg-yellow-900/40 text-yellow-400', 'bg-yellow-100 text-yellow-800')}`}>
            {status}
          </span>
        </div>

        {distance != null && !arrived && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <HiLocationMarker className={`h-4 w-4 ${dk('text-green-400', 'text-green-600')}`} />
              <span className={`font-semibold ${text}`}>{distance} km</span>
              <span className={`text-xs ${sub}`}>away</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HiClock className={`h-4 w-4 ${dk('text-blue-400', 'text-blue-600')}`} />
              <span className={`font-semibold ${text}`}>~{duration} min</span>
              <span className={`text-xs ${sub}`}>ETA</span>
            </div>
          </div>
        )}

        {arrived && (
          <div className={`flex items-center gap-1.5 text-sm font-semibold ${dk('text-green-400', 'text-green-700')}`}>
            <HiCheckCircle className="h-4 w-4" />
            Collector has arrived at your location
          </div>
        )}
      </div>

      {error && (
        <div className={`mx-4 mb-2 px-3 py-2 rounded-lg text-xs font-medium ${dk('bg-red-900/40 text-red-400', 'bg-red-50 text-red-600')}`}>
          {error}
        </div>
      )}

      <div className="h-48 sm:h-52 relative border-t border-inherit">
        {loading ? (
          <div className={`absolute inset-0 flex items-center justify-center ${dk('bg-slate-800', 'bg-gray-50')}`}>
            <div className="h-6 w-6 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : collectorLoc && destLat != null && destLng != null ? (
          <MapContainer center={[collectorLoc.lat, collectorLoc.lng]} zoom={14} className="w-full h-full z-10" scrollWheelZoom={true}>
            {(() => {
              const layer = getMapLayer(mapLayer);
              return <TileLayer key={`tile-${mapLayer}`} attribution={layer.attribution} url={layer.url} maxZoom={layer.maxZoom} minZoom={layer.minZoom} />;
            })()}
            <MapLayerSwitcher currentLayer={mapLayer} onLayerChange={setMapLayer} position="top-right" />
            <FitBounds positions={positions} />
            <Marker position={[collectorLoc.lat, collectorLoc.lng]} icon={collectorIcon} />
            <Marker position={[destLat, destLng]} icon={arrived ? L.divIcon({ className: '', html: '<div style="font-size:28px;line-height:1;text-align:center;">✅</div>', iconSize: [32, 32], iconAnchor: [16, 32] }) : destinationIcon} />
            {routeCoords.length >= 2 && (
              <Polyline positions={routeCoords} pathOptions={{ color: '#0EB02D', weight: 3, opacity: 0.7 }} />
            )}
          </MapContainer>
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${dk('bg-slate-800', 'bg-gray-50')}`}>
            <p className={`text-xs ${sub}`}>Collector location not available yet.</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-inherit">
        <p className={`text-[10px] font-semibold mb-2 ${label}`}>Status Timeline</p>
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((step, i) => {
            const isActive = i <= stepIndex;
            const isCurrent = i === stepIndex;
            return (
              <div key={step} className="flex-1 flex flex-col items-center">
                <div className={`w-full h-0.5 ${i === 0 ? '' : ''} ${isActive ? dk('bg-green-500', 'bg-green-500') : dk('bg-slate-700', 'bg-slate-200')}`} />
                <div className={`w-3 h-3 rounded-full -mt-1.5 z-10 ${isActive ? dk('bg-green-500', 'bg-green-500') : dk('bg-slate-700', 'bg-slate-200')} ${isCurrent ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-slate-800' : ''}`} />
                <p className={`text-[8px] mt-1 text-center leading-tight ${isActive ? dk('text-green-400', 'text-green-700') : label}`}>
                  {step}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CollectionTracking;