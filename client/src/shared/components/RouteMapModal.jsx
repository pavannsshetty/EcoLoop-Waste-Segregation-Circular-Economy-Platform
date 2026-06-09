import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiLocationMarker, HiX, HiRefresh, HiCheckCircle, HiTruck, HiClock, HiMap } from 'react-icons/hi';
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

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [50, 50] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 15);
    }
  }, [map, positions]);
  return null;
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
  const reportId = report?.reportId || report?.scrapType || report?.itemId?.itemName || '';
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
        const mins = Math.ceil(route.duration / 60);
        setDuration(mins);
      } else {
        // Fallback: straight-line
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

        // Send location to server
        fetch(`${API}/api/collector/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: origin.lat, lng: origin.lng }),
        }).catch(() => {});

        // Start watching position
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
  }, []);

  const handleRecenter = () => {
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
  };

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

  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const text = dk('text-slate-200', 'text-slate-800');
  const sub = dk('text-slate-400', 'text-slate-500');
  const label = dk('text-slate-500', 'text-slate-400');

  const destCoords = (destLat != null && destLng != null) ? [destLat, destLng] : null;
  const positions = [];
  if (collectorPos) positions.push([collectorPos.lat, collectorPos.lng]);
  if (destCoords) positions.push(destCoords);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${panel}`}>
        <div className="flex items-center gap-2 min-w-0">
          <HiMap className={`h-5 w-5 shrink-0 ${dk('text-green-400', 'text-green-600')}`} />
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate ${text}`}>{reportId || 'Route Map'}</p>
            <p className={`text-[10px] truncate ${sub}`}>{address}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!arrived && (
            <button type="button" onClick={handleRecenter}
              className={`p-1.5 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-500 hover:bg-slate-50')}`}
              title="Recenter">
              <HiRefresh className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onClose}
            className={`p-1.5 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-500 hover:bg-slate-50')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-medium ${dk('bg-red-900/40 text-red-400 border border-red-800', 'bg-red-50 text-red-600 border border-red-200')}`}>
          {error}
        </div>
      )}

      <div className="flex-1 relative">
        {loading ? (
          <div className={`absolute inset-0 z-20 flex items-center justify-center ${dk('bg-slate-900', 'bg-white')}`}>
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
          >
            {(() => {
              const layer = getMapLayer(mapLayer);
              return <TileLayer key={`tile-${mapLayer}`} attribution={layer.attribution} url={layer.url} maxZoom={layer.maxZoom} minZoom={layer.minZoom} />;
            })()}
            <MapLayerSwitcher currentLayer={mapLayer} onLayerChange={setMapLayer} position="top-right" />
            <FitBounds positions={positions} />
            <Marker position={[collectorPos.lat, collectorPos.lng]} icon={collectorIcon} />
            <Marker position={destCoords} icon={arrived ? arrivedIcon : destinationIcon} />
            {routeCoords.length >= 2 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#0EB02D', weight: 4, opacity: 0.8 }}
              />
            )}
          </MapContainer>
        ) : (
          <div className={`absolute inset-0 z-20 flex items-center justify-center ${dk('bg-slate-900', 'bg-white')}`}>
            <p className={`text-sm ${sub}`}>Location data unavailable.</p>
          </div>
        )}
      </div>

      <div className={`border-t shrink-0 ${panel}`}>
        <div className="px-4 py-3 space-y-3">
          {!arrived && distance != null && (
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <HiLocationMarker className={`h-4 w-4 ${dk('text-green-400', 'text-green-600')}`} />
                <div>
                  <p className={`text-[10px] font-medium ${label}`}>Distance</p>
                  <p className={`text-sm font-bold ${text}`}>{distance} km</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HiClock className={`h-4 w-4 ${dk('text-blue-400', 'text-blue-600')}`} />
                <div>
                  <p className={`text-[10px] font-medium ${label}`}>Est. Time</p>
                  <p className={`text-sm font-bold ${text}`}>{duration} min</p>
                </div>
              </div>
            </div>
          )}

          {arrived && (
            <div className={`flex items-center justify-center gap-2 py-1 ${dk('text-green-400', 'text-green-700')}`}>
              <HiCheckCircle className="h-5 w-5" />
              <span className="text-sm font-bold">Arrived at destination</span>
            </div>
          )}

          {!arrived && collectorPos && (
            <div className="flex gap-2">
              <button type="button" onClick={handleRecenter}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                <HiRefresh className="h-4 w-4" /> Recenter
              </button>
              <button type="button" onClick={handleArrived} disabled={arriving}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-2.5 text-xs font-semibold hover:bg-green-500 transition disabled:opacity-60">
                {arriving ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <><HiCheckCircle className="h-4 w-4" /> Mark Arrived</>}
              </button>
              <button type="button" onClick={onClose}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-500 hover:bg-slate-50')}`}>
                <HiX className="h-4 w-4" /> Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteMapModal;