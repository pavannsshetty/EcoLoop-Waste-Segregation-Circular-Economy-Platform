import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiLocationMarker, HiSearch, HiX, HiExclamation, HiCheckCircle } from 'react-icons/hi';
import { apiUrl } from '../utils/api';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ray-casting algorithm for Point-in-Polygon check.
const isPointInPolygon = (lat, lng, polygonCoords) => {
  if (!polygonCoords || !polygonCoords[0]) return true; // Default to true if no boundary
  let x = lng, y = lat;
  let inside = false;
  const vs = polygonCoords[0];
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];
    let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.neighbourhood || a.suburb || a.village || a.hamlet,
      a.town || a.city || a.county,
      a.state_district || a.district,
      a.state,
      a.country,
    ].filter(Boolean);
    return {
      address:        data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      displayAddress: parts.join(', ') || data.display_name,
      area:           a.neighbourhood || a.suburb || a.village || '',
      city:           a.town || a.city || a.county || '',
      district:       a.state_district || a.district || '',
      state:          a.state || '',
      country:        a.country || '',
      pincode:        a.postcode || '',
    };
  } catch {
    return {
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      displayAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      area: '', city: '', district: '', state: '', country: '', pincode: '',
    };
  }
};

const MapEvents = ({ onClick }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapPicker = ({ onLocationSelect, villageName, dark = false }) => {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [locInfo,     setLocInfo]     = useState(null);
  const [detecting,   setDetecting]   = useState(false);
  const [error,       setError]       = useState('');
  const [regionValid, setRegionValid] = useState(null);
  const [villageData, setVillageData] = useState(null);
  const [mapCenter,   setMapCenter]   = useState({ lat: 13.6262, lng: 74.6908, zoom: 11 });
  const [ready,       setReady]       = useState(false);
  const debounceRef = useRef(null);
  const searchRef   = useRef(null);
  const mapDivRef   = useRef(null);

  // Fetch village boundary data
  useEffect(() => {
    let active = true;
    if (villageName) {
      fetch(apiUrl(`/api/villages/${encodeURIComponent(villageName)}`))
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!active) return;
          if (data) {
            setVillageData(data);
            if (data.center) {
              setMapCenter({ lat: data.center.lat, lng: data.center.lng, zoom: 14 });
            }
          }
        })
        .catch(err => console.error('Error fetching village data:', err))
        .finally(() => { if (active) setReady(true); });
    } else {
      setReady(true);
    }
    return () => { active = false; };
  }, [villageName]);

  // Robust cleanup for "Map container is already initialized"
  useEffect(() => {
    return () => {
      // Find all leaflet containers and nullify them
      const containers = document.querySelectorAll('.leaflet-container');
      containers.forEach(container => {
        if (container._leaflet_id) {
          container._leaflet_id = null;
        }
      });
    };
  }, []);

  const applyLocation = useCallback(async (lat, lng, data) => {
    let resolvedData = data;
    if (!resolvedData) {
      resolvedData = await reverseGeocode(lat, lng);
    }
    
    const valid = villageData ? isPointInPolygon(lat, lng, villageData.boundary) : true;
    
    if (!valid) {
      setError(`You can report waste only inside your registered village (${villageName}).`);
      setRegionValid(false);
      onLocationSelect({ lat, lng, ...resolvedData, regionValid: false });
      return;
    }

    setError('');
    setLocInfo(resolvedData);
    setRegionValid(true);
    setQuery(resolvedData.displayAddress || resolvedData.address);
    setSuggestions([]);
    setShowDrop(false);
    setMapCenter({ lat, lng, zoom: 16 });
    onLocationSelect({ lat, lng, ...resolvedData, regionValid: true });
  }, [villageData, villageName, onLocationSelect]);

  const fetchSuggestions = async (q) => {
    if (q.trim().length < 2) { setSuggestions([]); setShowDrop(false); return; }
    
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=in`;
    
    // Use viewbox for strict searching within village if boundary exists
    if (villageData?.boundary?.coordinates?.[0]) {
      const coords = villageData.boundary.coordinates[0];
      const lats = coords.map(c => c[1]);
      const lngs = coords.map(c => c[0]);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      // viewbox=<left>,<top>,<right>,<bottom>
      url += `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1`;
    } else {
      url += `&q=${encodeURIComponent(q + ' ' + (villageName || ''))}`;
    }

    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setSuggestions(data);
      setShowDrop(data.length > 0);
    } catch { setSuggestions([]); setShowDrop(false); }
  };

  const onQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const onSuggestionPick = (s) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const a   = s.address || {};
    const parts = [
      a.neighbourhood || a.suburb || a.village || a.hamlet,
      a.town || a.city || a.county,
      a.state_district || a.district,
      a.state,
      a.country,
    ].filter(Boolean);
    const data = {
      address:        s.display_name,
      displayAddress: parts.join(', ') || s.display_name,
      area:           a.neighbourhood || a.suburb || a.village || '',
      city:           a.town || a.city || a.county || '',
      district:       a.state_district || a.district || '',
      state:          a.state || '',
      country:        a.country || '',
      pincode:        a.postcode || '',
    };
    applyLocation(lat, lng, data);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setDetecting(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        applyLocation(coords.latitude, coords.longitude, null);
        setDetecting(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission denied.' : 'Could not detect location.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const clearSearch = () => {
    setQuery(''); setSuggestions([]); setShowDrop(false);
    searchRef.current?.focus();
  };

  // Convert GeoJSON coordinates for react-leaflet Polygon [lat, lng]
  const polygonPositions = useMemo(() => {
    if (!villageData?.boundary?.coordinates?.[0]) return [];
    return villageData.boundary.coordinates[0].map(coord => [coord[1], coord[0]]);
  }, [villageData]);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Pick Location on Map
          </label>
          <p className={`text-xs mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Service Area: <span className="font-medium text-green-600">{villageName ? `${villageName} Village, Kundapura Taluk` : 'Kundapura Taluk'}</span>
          </p>
        </div>
        <button type="button" onClick={detectLocation} disabled={detecting}
          className="shrink-0 flex items-center gap-1.5 rounded-sm bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
          <HiLocationMarker className="h-3.5 w-3.5" />
          {detecting ? 'Detecting...' : 'Detect My Location'}
        </button>
      </div>

      <div className="relative w-full">
        <div className="flex w-full items-center gap-2">
          <div className={`flex flex-1 items-center rounded-sm border overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 ${dark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <HiSearch className={`ml-3 h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={onQueryChange}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              placeholder={`Search exactly in ${villageName || 'your village'}...`}
              className={`flex-1 min-w-0 bg-transparent py-2.5 px-2 text-sm outline-none focus:ring-0 border-none ${dark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
            {query && (
              <button type="button" tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); clearSearch(); }}
                className={`shrink-0 p-1.5 transition ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                <HiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {showDrop && suggestions.length > 0 && (
          <ul className={`absolute z-[1000] left-0 right-0 mt-1 rounded-sm border shadow-2xl overflow-hidden max-h-64 overflow-y-auto ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            {suggestions.map((s) => (
              <li key={s.place_id} className={`border-b last:border-0 ${dark ? 'border-slate-700' : 'border-gray-100'}`}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onSuggestionPick(s); }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${dark ? 'hover:bg-slate-700' : 'hover:bg-green-50'}`}>
                  <HiLocationMarker className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {s.name || s.display_name.split(',')[0]}
                    </span>
                    <span className={`block text-xs mt-0.5 truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {s.display_name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-sm bg-red-50 border border-red-200 px-4 py-3">
          <HiExclamation className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed font-semibold">
            {error}
          </p>
        </div>
      )}

      {regionValid === true && (
        <div className="flex items-center gap-2 rounded-sm bg-green-50 border border-green-200 px-4 py-2">
          <HiCheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Location is within your registered village.</p>
        </div>
      )}

      <div 
        ref={mapDivRef}
        className={`relative w-full rounded-sm overflow-hidden border ${dark ? 'border-slate-700' : 'border-gray-200'}`}
      >
        {ready ? (
          <MapContainer 
            id="report-waste-map"
            key={villageName || 'default'}
            center={[mapCenter.lat, mapCenter.lng]} 
            zoom={mapCenter.zoom} 
            className="w-full h-64 sm:h-80 z-10"
            maxBounds={polygonPositions.length > 0 ? L.latLngBounds(polygonPositions) : null}
            maxBoundsViscosity={1.0}
          >
            <ChangeView center={[mapCenter.lat, mapCenter.lng]} zoom={mapCenter.zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {polygonPositions.length > 0 && (
              <Polygon 
                positions={polygonPositions} 
                pathOptions={{ fillColor: '#0AAF29', color: '#0AAF29', weight: 2, fillOpacity: 0.1 }} 
              />
            )}
            {locInfo && (
              <Marker position={[mapCenter.lat, mapCenter.lng]} />
            )}
            <MapEvents onClick={applyLocation} />
          </MapContainer>
        ) : (
          <div className="w-full h-64 sm:h-80 flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
             <div className="flex flex-col items-center gap-3">
               <div className="h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
               <p className="text-xs text-slate-500 font-medium tracking-wide font-mono">Initializing Map Engine...</p>
             </div>
          </div>
        )}
      </div>

      {locInfo ? (
        <div className={`rounded-sm border p-3.5 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-2.5">
            <HiLocationMarker className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold mb-0.5 ${dark ? 'text-green-400' : 'text-green-700'}`}>Selected Location</p>
              <p className={`text-sm font-medium leading-snug ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                {locInfo.displayAddress || locInfo.address}
              </p>
              <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-mono ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Lat: {mapCenter.lat.toFixed(6)}</span>
                <span className="w-px h-2 bg-slate-300 dark:bg-slate-700" />
                <span>Lng: {mapCenter.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className={`text-xs text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Tap inside your village boundary on the map to select the exact location.
        </p>
      )}
    </div>
  );
};

export default MapPicker;
