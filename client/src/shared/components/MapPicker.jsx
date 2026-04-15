import { useState, useRef, useCallback } from 'react';
import { HiLocationMarker, HiSearch, HiX, HiExclamation, HiCheckCircle } from 'react-icons/hi';

const ALLOWED_REGION = {
  taluk:    ['kundapura'],
  district: ['udupi'],
  state:    ['karnataka'],
  country:  ['india'],
};

const isInKundapura = (data) => {
  const taluk    = (data.taluk    || data.district || '').toLowerCase();
  const district = (data.district || '').toLowerCase();
  const state    = (data.state    || '').toLowerCase();
  const country  = (data.country  || '').toLowerCase();
  const addr     = (data.address  || '').toLowerCase();

  const talukOk    = ALLOWED_REGION.taluk.some(t => taluk.includes(t) || addr.includes(t));
  const districtOk = ALLOWED_REGION.district.some(d => district.includes(d) || addr.includes(d));
  const stateOk    = ALLOWED_REGION.state.some(s => state.includes(s) || addr.includes(s));
  const countryOk  = ALLOWED_REGION.country.some(c => country.includes(c) || addr.includes(c));

  return talukOk && districtOk && stateOk && countryOk;
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

const MapPicker = ({ onLocationSelect, dark = false }) => {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [locInfo,     setLocInfo]     = useState(null);
  const [detecting,   setDetecting]   = useState(false);
  const [error,       setError]       = useState('');
  const [regionValid, setRegionValid] = useState(null);
  const [mapCenter,   setMapCenter]   = useState({ lat: 13.3409, lng: 74.7421, zoom: 8 });
  const debounceRef = useRef(null);
  const searchRef   = useRef(null);

  const applyLocation = useCallback((lat, lng, data) => {
    const valid = isInKundapura(data);
    setLocInfo(data);
    setRegionValid(valid);
    setQuery(data.displayAddress || data.address);
    setSuggestions([]);
    setShowDrop(false);
    setMapCenter({ lat, lng, zoom: 15 });
    onLocationSelect({ lat, lng, ...data, regionValid: valid });
  }, [onLocationSelect]);

  const fetchSuggestions = async (q) => {
    if (q.trim().length < 2) { setSuggestions([]); setShowDrop(false); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
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
        const data = await reverseGeocode(coords.latitude, coords.longitude);
        applyLocation(coords.latitude, coords.longitude, data);
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

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.05},${mapCenter.lat - 0.05},${mapCenter.lng + 0.05},${mapCenter.lat + 0.05}&layer=mapnik${locInfo ? `&marker=${mapCenter.lat},${mapCenter.lng}` : ''}`;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Pick Location on Map
          </label>
          <p className={`text-xs mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Service area: <span className="font-medium text-green-600">Kundapura Taluk, Udupi, Karnataka</span>
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
          <div className={`flex flex-1 items-center rounded-xl border overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 ${dark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <HiSearch className={`ml-3 h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={onQueryChange}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              placeholder="Search address, area, city, landmark..."
              className={`flex-1 min-w-0 bg-transparent py-2.5 px-2 text-sm outline-none focus:ring-0 border-none ${dark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
            {query && (
              <button type="button" tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); clearSearch(); }}
                className={`shrink-0 p-1.5 transition ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                <HiX className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); fetchSuggestions(query); }}
            disabled={query.trim().length < 2}
            className="shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl border-none outline-none transition disabled:opacity-50 disabled:cursor-not-allowed">
            <HiSearch className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>
        </div>

        {showDrop && suggestions.length > 0 && (
          <ul className={`absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-2xl overflow-hidden max-h-64 overflow-y-auto ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
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

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><HiExclamation className="h-4 w-4 shrink-0" /> {error}</p>}

      {regionValid === false && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <HiExclamation className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">
            Currently, waste reporting is available only in <strong>Kundapura Taluk, Udupi, Karnataka</strong>. Please select a location within this region.
          </p>
        </div>
      )}

      {regionValid === true && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-2">
          <HiCheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Location is within the service area.</p>
        </div>
      )}

      <div className={`relative w-full rounded-xl overflow-hidden border ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
        <iframe
          title="map"
          src={mapUrl}
          className="w-full h-64 sm:h-80"
          style={{ border: 0 }}
          loading="lazy"
        />
        {!locInfo && (
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${dark ? 'bg-black/20' : 'bg-white/10'}`}>
            <p className={`text-xs px-3 py-1.5 rounded-full ${dark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'} shadow`}>
              Search or detect location to update map
            </p>
          </div>
        )}
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
                {locInfo.city     && <span><span className="font-medium">City:</span> {locInfo.city}</span>}
                {locInfo.district && locInfo.district !== locInfo.city && <span><span className="font-medium">District:</span> {locInfo.district}</span>}
                {locInfo.state    && <span><span className="font-medium">State:</span> {locInfo.state}</span>}
                {locInfo.pincode  && <span><span className="font-medium">PIN:</span> {locInfo.pincode}</span>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className={`text-xs text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Search a location or tap "Detect My Location" to set pickup location.
        </p>
      )}
    </div>
  );
};

export default MapPicker;
