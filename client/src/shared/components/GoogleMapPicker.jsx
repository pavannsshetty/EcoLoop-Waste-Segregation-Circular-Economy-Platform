import { useEffect, useRef, useState, useCallback } from 'react';
import { HiLocationMarker, HiSearch, HiX } from 'react-icons/hi';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let _gmapsPromise = null;
const loadGoogleMaps = () => {
  if (_gmapsPromise) return _gmapsPromise;
  _gmapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return; }
    const s    = document.createElement('script');
    s.id       = 'gmap-script';
    s.src      = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    s.async    = true;
    s.onload   = resolve;
    s.onerror  = () => { _gmapsPromise = null; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(s);
  });
  return _gmapsPromise;
};

const parseComponents = (components = []) => {
  const get = (...types) => {
    for (const t of types) {
      const c = components.find(x => x.types.includes(t));
      if (c) return c.long_name;
    }
    return '';
  };
  const area     = get('sublocality_level_1', 'sublocality', 'neighborhood');
  const taluk    = get('administrative_area_level_3');
  const city     = get('locality');
  const district = get('administrative_area_level_2');
  const state    = get('administrative_area_level_1');
  const country  = get('country');
  const seen     = new Set();
  const parts    = [area, taluk, city, district, state, country].filter(p => {
    if (!p || seen.has(p)) return false;
    seen.add(p); return true;
  });
  return { area, taluk, city, district, state, country, displayAddress: parts.join(', ') };
};

const geocodeLatLng = (lat, lng) =>
  new Promise(resolve => {
    new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const parsed = parseComponents(results[0].address_components);
        resolve({ address: results[0].formatted_address, ...parsed });
      } else {
        resolve({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, displayAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, area: '', taluk: '', city: '', district: '', state: '', country: '' });
      }
    });
  });

const GoogleMapPicker = ({ onLocationSelect, dark = false }) => {
  const mapRef      = useRef(null);
  const mapObj      = useRef(null);
  const markerRef   = useRef(null);
  const acSvcRef    = useRef(null);
  const placesSvcRef= useRef(null);
  const tokenRef    = useRef(null);
  const debounceRef = useRef(null);
  const searchRef   = useRef(null);
  const onSelectRef = useRef(onLocationSelect);

  useEffect(() => { onSelectRef.current = onLocationSelect; }, [onLocationSelect]);

  const [ready,       setReady]       = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [detecting,   setDetecting]   = useState(false);
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [locInfo,     setLocInfo]     = useState(null);
  const [error,       setError]       = useState('');

  const applyLocation = useCallback(async (lat, lng, knownData) => {
    if (!mapObj.current) return;
    const data = knownData || await geocodeLatLng(lat, lng);
    const pos  = { lat, lng };

    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapObj.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'Drag to adjust',
      });
      markerRef.current.addListener('dragend', async (ev) => {
        const dlat = ev.latLng.lat();
        const dlng = ev.latLng.lng();
        const d    = await geocodeLatLng(dlat, dlng);
        setLocInfo(d);
        setQuery(d.displayAddress || d.address);
        onSelectRef.current({ lat: dlat, lng: dlng, ...d });
      });
    }

    mapObj.current.panTo(pos);
    setLocInfo(data);
    setQuery(data.displayAddress || data.address);
    setSuggestions([]);
    setShowDrop(false);
    onSelectRef.current({ lat, lng, ...data });
  }, []);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 13.3409, lng: 74.7421 },
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        mapObj.current     = map;
        acSvcRef.current   = new window.google.maps.places.AutocompleteService();
        placesSvcRef.current = new window.google.maps.places.PlacesService(map);
        tokenRef.current   = new window.google.maps.places.AutocompleteSessionToken();

        map.addListener('click', (e) => {
          applyLocation(e.latLng.lat(), e.latLng.lng(), null);
        });

        setReady(true);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load Google Maps. Please check your API key.');
        setLoading(false);
      });
  }, [applyLocation]);

  const fetchSuggestions = useCallback((input) => {
    if (!acSvcRef.current || input.trim().length < 2) {
      setSuggestions([]); setShowDrop(false); return;
    }
    acSvcRef.current.getPlacePredictions(
      {
        input: input.trim(),
        sessionToken: tokenRef.current,
        componentRestrictions: { country: 'in' },
        types: ['geocode'],
      },
      (preds, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && preds?.length) {
          setSuggestions(preds);
          setShowDrop(true);
        } else {
          setSuggestions([]);
          setShowDrop(false);
        }
      }
    );
  }, []);

  const onQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(() => { if (ready) fetchSuggestions(val); }, 300);
  };

  const onSearchClick = () => {
    if (ready && query.trim().length >= 2) fetchSuggestions(query);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onSearchClick(); }
  };

  const onSuggestionPick = (pred) => {
    setSuggestions([]); setShowDrop(false);
    if (!placesSvcRef.current) return;
    placesSvcRef.current.getDetails(
      {
        placeId: pred.place_id,
        fields: ['geometry', 'formatted_address', 'address_components'],
        sessionToken: tokenRef.current,
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat  = place.geometry.location.lat();
          const lng  = place.geometry.location.lng();
          const data = { address: place.formatted_address, ...parseComponents(place.address_components || []) };
          applyLocation(lat, lng, data);
          mapObj.current?.setZoom(15);
          tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      }
    );
  };

  const clearQuery = () => {
    setQuery(''); setSuggestions([]); setShowDrop(false);
    searchRef.current?.focus();
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported by your browser.'); return; }
    setDetecting(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await applyLocation(coords.latitude, coords.longitude, null);
        mapObj.current?.setZoom(16);
        setDetecting(false);
      },
      (err) => {
        setError(err.code === 1
          ? 'Location permission denied. Please allow access in browser settings.'
          : 'Could not detect location. Click on the map to select manually.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const inputCls = dark
    ? 'text-slate-100 placeholder-slate-500'
    : 'text-slate-900 placeholder-slate-400';

  return (
    <div className="w-full space-y-3">

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          Pick Location on Map
        </label>
        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting || loading}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <HiLocationMarker className="h-3.5 w-3.5" />
          {detecting ? 'Detecting...' : 'Detect My Location'}
        </button>
      </div>

      <div className="relative w-full">
        <div className="flex w-full items-center gap-2">
          <div className={`flex flex-1 items-center rounded-xl border overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 ${dark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <HiSearch className={`ml-3 h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={onQueryChange}
              onKeyDown={onKeyDown}
              onFocus={() => { if (suggestions.length > 0) setShowDrop(true); }}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              placeholder="Search address, area, city, landmark..."
              className={`flex-1 min-w-0 py-2.5 px-2 text-sm bg-transparent border-none outline-none focus:ring-0 ${inputCls}`}
            />
            {query.length > 0 && (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => { e.preventDefault(); clearQuery(); }}
                className={`shrink-0 p-1.5 transition ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <HiX className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSearchClick(); }}
            disabled={loading || query.trim().length < 2}
            className="shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl border-none outline-none focus:ring-0 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HiSearch className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>
        </div>

        {showDrop && suggestions.length > 0 && (
          <ul className={`absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-2xl overflow-hidden max-h-64 overflow-y-auto ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            {suggestions.map((s) => (
              <li key={s.place_id} className={`border-b last:border-0 ${dark ? 'border-slate-700' : 'border-gray-100'}`}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onSuggestionPick(s); }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${dark ? 'hover:bg-slate-700' : 'hover:bg-green-50'}`}
                >
                  <HiLocationMarker className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {s.structured_formatting?.main_text || s.description}
                    </span>
                    {s.structured_formatting?.secondary_text && (
                      <span className={`block text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {s.structured_formatting.secondary_text}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <HiExclamation className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className={`relative w-full rounded-xl overflow-hidden border ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
        {loading && (
          <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
            <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading map...</span>
          </div>
        )}
        <div ref={mapRef} className="w-full h-64 sm:h-80" />
      </div>

      {locInfo ? (
        <div className={`rounded-xl border p-3.5 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-2.5">
            <HiLocationMarker className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold mb-0.5 ${dark ? 'text-green-400' : 'text-green-700'}`}>Selected Location</p>
              <p className={`text-sm font-medium leading-snug ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                {locInfo.displayAddress || locInfo.address}
              </p>
              <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                {locInfo.area     && <span><span className="font-medium">Area:</span> {locInfo.area}</span>}
                {locInfo.taluk && locInfo.taluk !== locInfo.city && <span><span className="font-medium">Taluk:</span> {locInfo.taluk}</span>}
                {locInfo.city     && <span><span className="font-medium">City:</span> {locInfo.city}</span>}
                {locInfo.district && locInfo.district !== locInfo.city && <span><span className="font-medium">District:</span> {locInfo.district}</span>}
                {locInfo.state    && <span><span className="font-medium">State:</span> {locInfo.state}</span>}
                {locInfo.country  && <span><span className="font-medium">Country:</span> {locInfo.country}</span>}
              </div>
              <p className={`text-xs mt-1.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Drag the marker to fine-tune the location.
              </p>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <p className={`text-xs text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Search a location, click on the map, or tap "Detect My Location".
          </p>
        )
      )}
    </div>
  );
};

export default GoogleMapPicker;
