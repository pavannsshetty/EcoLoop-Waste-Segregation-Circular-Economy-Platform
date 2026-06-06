import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiLocationMarker, HiSearch, HiX, HiExclamation, HiCheckCircle } from 'react-icons/hi';
import { apiUrl } from '../utils/api';
import { getMapLayer } from '../utils/mapLayers';
import MapLayerSwitcher from './MapLayerSwitcher';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ray-casting algorithm for Point-in-Polygon check.
// Implements strict geometric validation - location is valid ONLY if it's inside the polygon boundary.
const isPointInPolygon = (lat, lng, polygonCoords) => {
  if (!polygonCoords || !polygonCoords[0]) return false;
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

const normalizeVillageName = (value) => {
  if (!value) return '';
  return value
    .toString()
    .toLowerCase()
    .replace(/\b(village|grama|gaon|pura|puram)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractTaluk = (address) => {
  return address.county || address.state_district || address.district || '';
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
      area:           a.neighbourhood || a.suburb || a.village || a.hamlet || '',
      village:        a.village || a.hamlet || a.suburb || '',
      locality:       a.neighbourhood || a.suburb || a.village || a.hamlet || '',
      taluk:          extractTaluk(a),
      district:       a.state_district || a.district || '',
      state:          a.state || '',
      country:        a.country || '',
      pincode:        a.postcode || '',
    };
  } catch (err) {
    console.debug('[MapPicker] reverse geocode failed', { lat, lng, error: err });
    return {
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      displayAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      area: '', village: '', locality: '', taluk: '', district: '', state: '', country: '', pincode: '',
    };
  }
};

const MapEvents = ({ onClick }) => {
  useMapEvents({
    click(e) {
      console.debug('[MapPicker] map click', { lat: e.latlng.lat, lng: e.latlng.lng });
      onClick(e.latlng.lat, e.latlng.lng, null, 'map');
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

const FitToPolygon = ({ polygonBounds }) => {
  const map = useMap();
  useEffect(() => {
    if (polygonBounds && polygonBounds.isValid()) {
      try {
        map.fitBounds(polygonBounds, { padding: [50, 50] });
        console.debug('[MapPicker] fitted map to polygon bounds');
      } catch (err) {
        console.error('[MapPicker] error fitting to polygon bounds', err);
      }
    }
  }, [polygonBounds, map]);
  return null;
};

const MapPicker = ({ onLocationSelect, villageName, dark = false }) => {
  const [mapLayer, setMapLayer] = useState('osm');
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [locInfo,     setLocInfo]     = useState(null);
  const [detecting,   setDetecting]   = useState(false);
  const [error,       setError]       = useState('');
  const [regionValid, setRegionValid] = useState(null);
  const requestSeq = useRef(0);
  const lastSelectionSource = useRef(null);
  const [villageData, setVillageData] = useState(null);
  const [mapCenter,   setMapCenter]   = useState({ lat: 13.6262, lng: 74.6908, zoom: 11 });
  const [ready,       setReady]       = useState(false);
  const debounceRef = useRef(null);
  const searchRef   = useRef(null);
  const mapDivRef   = useRef(null);
  const containerId = useRef(`report-waste-map-${Math.random().toString(36).slice(2)}`);

  // Fetch village boundary data (polygon coordinates from API)
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
            // Log polygon boundary data for debugging
            if (data.boundary?.coordinates?.[0]) {
              console.debug('[MapPicker] village boundary polygon loaded', { 
                village: villageName, 
                coordinates: data.boundary.coordinates[0].length 
              });
            } else {
              console.warn('[MapPicker] village boundary polygon not available for', villageName);
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

  // If API did not provide a polygon boundary, attempt to fetch GeoJSON from Nominatim
  useEffect(() => {
    let active = true;
    const tryFetchNominatim = async (village) => {
      try {
        const q = encodeURIComponent(`${village}, Kundapura, India`);
        const url = `https://nominatim.openstreetmap.org/search.php?q=${q}&polygon_geojson=1&format=jsonv2&limit=3`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        if (!active || !data || !data.length) return;
        // prefer first feature with geojson polygon
        const hit = data.find(d => d.geojson && (d.geojson.type === 'Polygon' || d.geojson.type === 'MultiPolygon')) || data[0];
        if (hit && hit.geojson && (hit.geojson.coordinates?.length > 0)) {
          const geo = hit.geojson;
          let boundary = null;
          if (geo.type === 'Polygon') {
            boundary = { type: 'Polygon', coordinates: geo.coordinates };
          } else if (geo.type === 'MultiPolygon') {
            // use first polygon in multipolygon
            boundary = { type: 'Polygon', coordinates: geo.coordinates[0] };
          }
          if (boundary) {
            console.debug('[MapPicker] Nominatim polygon loaded', { village: village, coords: boundary.coordinates[0].length });
            setVillageData(prev => ({ ...(prev || {}), boundary }));
          }
        }
      } catch (err) {
        console.debug('[MapPicker] nominatim polygon fetch failed', { village, error: err });
      }
    };

    const isRectangleBoundary = (b) => {
      try {
        if (!b || !b.coordinates || !b.coordinates[0]) return false;
        const coords = b.coordinates[0];
        if (coords.length !== 5) return false;
        const lats = [...new Set(coords.map(c => c[1]))];
        const lngs = [...new Set(coords.map(c => c[0]))];
        return lats.length === 2 && lngs.length === 2;
      } catch (e) { return false; }
    };

    if (villageName && (!villageData || !villageData.boundary || !villageData.boundary.coordinates || villageData.boundary.coordinates[0].length < 5 || isRectangleBoundary(villageData.boundary))) {
      tryFetchNominatim(villageName);
    }

    return () => { active = false; };
  }, [villageName, villageData]);

  const applyLocation = useCallback(async (lat, lng, data, source = 'map') => {
    const requestId = ++requestSeq.current;
    console.debug('[MapPicker] applyLocation start', { lat, lng, requestId });
    let resolvedData = data;
    if (!resolvedData) {
      resolvedData = await reverseGeocode(lat, lng);
    }
    if (requestId !== requestSeq.current) {
      console.debug('[MapPicker] applyLocation ignored stale result', { lat, lng, requestId, current: requestSeq.current });
      return;
    }

    console.debug('[MapPicker] reverse geocode result', { address: resolvedData.displayAddress, lat, lng });

    // **STRICT: Polygon-based village boundary validation ONLY**
    // No address-text-based validation; no fallback logic
    let pointValid = false;
    
    // DEBUG: Log village and polygon info
    console.debug('[MapPicker] village validation start', { 
      villageName, 
      polygonLoaded: !!(villageData?.boundary?.coordinates?.length > 0),
      polygonCoordinates: villageData?.boundary?.coordinates?.[0]?.length || 0
    });

    if (!villageData?.boundary?.coordinates?.[0] || villageData.boundary.coordinates[0].length < 3) {
      // No valid polygon - MUST REJECT
      console.debug('[MapPicker] NO POLYGON AVAILABLE - location INVALID', { villageName, lat, lng });
      const message = `Village boundary not configured. Please contact support for ${villageName} village.`;
      setError(message);
      setRegionValid(false);
      setLocInfo({ ...resolvedData, lat, lng });
      setQuery(resolvedData.displayAddress || resolvedData.address);
      setSuggestions([]);
      setShowDrop(false);
      setMapCenter({ lat, lng, zoom: 16 });
      console.debug('[MapPicker] calling onLocationSelect (INVALID - NO POLYGON)', { lat, lng, regionValid: false, villageName });
      lastSelectionSource.current = source;
      onLocationSelect({ lat, lng, ...resolvedData, regionValid: false, source });
      return;
    }

    // Perform Point-in-Polygon validation
    pointValid = isPointInPolygon(lat, lng, villageData.boundary);
    console.debug('[MapPicker] point-in-polygon validation result', { 
      lat, 
      lng, 
      pointValid, 
      polygonCoordinates: villageData.boundary.coordinates[0].length,
      village: villageName
    });

    const valid = pointValid === true;

    console.debug('[MapPicker] location validation result', { 
      lat, 
      lng, 
      valid, 
      village: villageName,
      reverseGeocodedAddress: resolvedData.displayAddress 
    });

    if (!valid) {
      const message = `Selected location is outside the village boundary. Please select a location within ${villageName} village.`;
      setError(message);
      setRegionValid(false);
      setLocInfo({ ...resolvedData, lat, lng });
      setQuery(resolvedData.displayAddress || resolvedData.address);
      setSuggestions([]);
      setShowDrop(false);
      setMapCenter({ lat, lng, zoom: 16 });
      console.debug('[MapPicker] calling onLocationSelect (INVALID - OUTSIDE POLYGON)', { lat, lng, regionValid: false, village: villageName, reverseGeocodedAddress: resolvedData.displayAddress });
      lastSelectionSource.current = source;
      onLocationSelect({ lat, lng, ...resolvedData, regionValid: false, source });
      return;
    }

    setError('');
    setLocInfo({ ...resolvedData, lat, lng });
    setRegionValid(true);
    setQuery(resolvedData.displayAddress || resolvedData.address);
    setSuggestions([]);
    setShowDrop(false);
    setMapCenter({ lat, lng, zoom: 16 });
    console.debug('[MapPicker] calling onLocationSelect (VALID - INSIDE POLYGON)', { lat, lng, regionValid: true, village: villageName, reverseGeocodedAddress: resolvedData.displayAddress });
    lastSelectionSource.current = source;
    onLocationSelect({ lat, lng, ...resolvedData, regionValid: true, source });
  }, [villageData, villageName, onLocationSelect]);

  const fetchSuggestions = async (q) => {
    if (q.trim().length < 2) { setSuggestions([]); setShowDrop(false); return; }
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' ' + (villageName || 'Kundapura Taluk'))}&format=json&addressdetails=1&limit=6&countrycodes=in`;

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
    applyLocation(lat, lng, data, 'map');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setDetecting(true); setError('');
    navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
        console.debug('[MapPicker] getCurrentPosition success', coords);
        applyLocation(coords.latitude, coords.longitude, null, 'detect');
        setDetecting(false);
      },
      (err) => {
        console.debug('[MapPicker] getCurrentPosition error', err);
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

  // Log active tile layer when it changes
  useEffect(() => {
    console.debug('[MapPicker] active map layer', mapLayer);
  }, [mapLayer]);

  // Calculate polygon bounds for map fitting
  const polygonBounds = useMemo(() => {
    if (polygonPositions.length === 0) return null;
    try {
      return L.latLngBounds(polygonPositions);
    } catch (err) {
      console.error('[MapPicker] error calculating polygon bounds', err);
      return null;
    }
  }, [polygonPositions]);

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
        <div className="flex items-center gap-2">
            {locInfo && (
            <button type="button" onClick={() => {
              console.debug('[MapPicker] clear selection');
              setLocInfo(null);
              setRegionValid(null);
              setError('');
              setQuery('');
              setSuggestions([]);
              requestSeq.current += 1;
              const cleared = lastSelectionSource.current || null;
              lastSelectionSource.current = null;
              onLocationSelect(null, cleared);
            }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              <HiX className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <button type="button" onClick={detectLocation} disabled={detecting}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
            <HiLocationMarker className="h-3.5 w-3.5" />
            {detecting ? 'Detecting...' : 'Detect My Location'}
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <div className="flex w-full items-center gap-2">
          <div className={`flex flex-1 items-center rounded-lg border overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 ${dark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'}`}>
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
          <ul className={`absolute z-[1000] left-0 right-0 mt-1 rounded-lg border shadow-2xl overflow-hidden max-h-64 overflow-y-auto ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
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
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <HiExclamation className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed font-semibold">
            {error}
          </p>
        </div>
      )}

      {regionValid === true && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2">
          <HiCheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Location is within your registered village.</p>
        </div>
      )}

      <div 
        ref={mapDivRef}
        className={`relative w-full rounded-lg overflow-hidden border ${dark ? 'border-slate-700' : 'border-gray-200'}`}
      >
        {ready ? (
          <MapContainer 
            key={containerId.current}
            center={[mapCenter.lat, mapCenter.lng]} 
            zoom={mapCenter.zoom} 
            className="w-full h-64 sm:h-80 z-10"
          >
            <ChangeView center={[mapCenter.lat, mapCenter.lng]} zoom={mapCenter.zoom} />
            {polygonBounds && <FitToPolygon polygonBounds={polygonBounds} />}
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
            {polygonPositions.length > 0 && (
              <Polygon 
                positions={polygonPositions} 
                pathOptions={{ fillColor: '#0AAF29', color: '#0AAF29', weight: 2, fillOpacity: 0.1 }} 
              />
            )}
            {locInfo && locInfo.lat != null && locInfo.lng != null && (
              <Marker position={[locInfo.lat, locInfo.lng]} />
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
        <div className={`rounded-lg border p-3.5 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-2.5">
            <HiLocationMarker className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold mb-0.5 ${dark ? 'text-green-400' : 'text-green-700'}`}>Selected Location</p>
              <p className={`text-sm font-medium leading-snug ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                {locInfo.displayAddress || locInfo.address}
              </p>
              <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-mono ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Lat: {locInfo.lat?.toFixed(6)}</span>
                <span className="w-px h-2 bg-slate-300 dark:bg-slate-700" />
                <span>Lng: {locInfo.lng?.toFixed(6)}</span>
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
