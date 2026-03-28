import { useState, useRef } from 'react';
import {
  HiX, HiPhotograph, HiClipboardList, HiLocationMarker,
  HiCamera, HiExclamation, HiCheckCircle, HiInformationCircle,
} from 'react-icons/hi';
import { MdMyLocation } from 'react-icons/md';
import GoogleMapPicker from './GoogleMapPicker';

const WASTE_TYPES  = ['Wet Waste', 'Dry Waste', 'E-Waste', 'Plastic Waste', 'Mixed Waste'];
const LANDMARKS    = ['School', 'Temple', 'Bus Stop', 'Hospital', 'Market', 'Park', 'Roadside', 'Residential Area', 'Other'];
const LOC_METHODS  = [
  { id: 'map',    icon: '🗺️', label: 'Adjust Pin on Map' },
  { id: 'manual', icon: '✍️', label: 'Enter Location Manually' },
];

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const r = d => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const readExifLocation = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target.result);
        if (view.getUint16(0, false) !== 0xFFD8) { resolve(null); return; }
        let offset = 2;
        while (offset < view.byteLength) {
          const marker = view.getUint16(offset, false);
          offset += 2;
          if (marker === 0xFFE1) {
            const len = view.getUint16(offset, false);
            const exifStr = String.fromCharCode(...new Uint8Array(e.target.result, offset + 2, 4));
            if (exifStr !== 'Exif') { resolve(null); return; }
            const tiffOffset = offset + 8;
            const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
            const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian);
            const entries = view.getUint16(tiffOffset + ifdOffset, littleEndian);
            let gpsIfdOffset = null;
            for (let i = 0; i < entries; i++) {
              const tag = view.getUint16(tiffOffset + ifdOffset + 2 + i * 12, littleEndian);
              if (tag === 0x8825) {
                gpsIfdOffset = view.getUint32(tiffOffset + ifdOffset + 2 + i * 12 + 8, littleEndian);
              }
            }
            if (!gpsIfdOffset) { resolve(null); return; }
            const gpsEntries = view.getUint16(tiffOffset + gpsIfdOffset, littleEndian);
            let latRef, latVal, lngRef, lngVal;
            const readRational = (off) => view.getUint32(off, littleEndian) / view.getUint32(off + 4, littleEndian);
            for (let i = 0; i < gpsEntries; i++) {
              const base = tiffOffset + gpsIfdOffset + 2 + i * 12;
              const tag  = view.getUint16(base, littleEndian);
              const valOff = view.getUint32(base + 8, littleEndian) + tiffOffset;
              if (tag === 1) latRef = String.fromCharCode(view.getUint8(base + 8));
              if (tag === 2) latVal = readRational(valOff) + readRational(valOff + 8) / 60 + readRational(valOff + 16) / 3600;
              if (tag === 3) lngRef = String.fromCharCode(view.getUint8(base + 8));
              if (tag === 4) lngVal = readRational(valOff) + readRational(valOff + 8) / 60 + readRational(valOff + 16) / 3600;
            }
            if (latVal != null && lngVal != null) {
              resolve({
                lat: latRef === 'S' ? -latVal : latVal,
                lng: lngRef === 'W' ? -lngVal : lngVal,
              });
            } else { resolve(null); }
            return;
          }
          offset += view.getUint16(offset, false);
        }
        resolve(null);
      } catch { resolve(null); }
    };
    reader.readAsArrayBuffer(file);
  });

const AccuracyBadge = ({ accuracy }) => {
  if (accuracy == null) return null;
  const { label, cls } = accuracy < 20
    ? { label: 'High Accuracy', cls: 'bg-green-100 text-green-700' }
    : accuracy < 100
      ? { label: 'Medium Accuracy', cls: 'bg-yellow-100 text-yellow-700' }
      : { label: 'Low Accuracy', cls: 'bg-red-100 text-red-700' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <MdMyLocation className="h-3 w-3" /> {label} (±{Math.round(accuracy)}m)
    </span>
  );
};

const DuplicateModal = ({ report, onContinue, onClose, dark }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 ${dark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <HiExclamation className="h-6 w-6 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Already Reported</p>
          <p className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            This waste location was reported within the last 24 hours. Avoid duplicate reports to keep the system clean.
          </p>
        </div>
      </div>
      {report && (
        <div className={`rounded-xl border p-3 text-xs space-y-1 ${dark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <p><span className="font-medium">Type:</span> {report.wasteType}</p>
          <p><span className="font-medium">Location:</span> {report.location?.displayAddress || report.location?.address}</p>
          <p><span className="font-medium">Status:</span> {report.status}</p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
          Cancel
        </button>
        <button onClick={onContinue} className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-500 transition">
          Submit Anyway
        </button>
      </div>
    </div>
  </div>
);

const ReportWasteModal = ({ isOpen, onClose, onSuccess, dark = false }) => {
  const cameraRef = useRef(null);
  const [form, setForm] = useState({ wasteType: '', description: '', pickupDate: '', pickupTime: '', landmark: '', landmarkType: '', manualAddress: '' });
  const [locMethod,    setLocMethod]    = useState('map');
  const [location,     setLocation]     = useState(null);
  const [accuracy,     setAccuracy]     = useState(null);
  const [imageFile,    setImageFile]    = useState(null);
  const [preview,      setPreview]      = useState('');
  const [photoLoc,     setPhotoLoc]     = useState(null);
  const [photoWarning, setPhotoWarning] = useState(false);
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [dupData,      setDupData]      = useState(null);
  const [showDupModal, setShowDupModal] = useState(false);
  const [detecting,    setDetecting]    = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleLocationSelect = (loc) => {
    setLocation(loc);
    setErrors(e => ({ ...e, location: '' }));
    if (photoLoc && loc) {
      const dist = haversineMeters(photoLoc.lat, photoLoc.lng, loc.lat, loc.lng);
      setPhotoWarning(dist > 200);
    }
  };

  const handleImage = async (file) => {
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    const exif = await readExifLocation(file);
    if (exif) {
      setPhotoLoc(exif);
      if (location) {
        const dist = haversineMeters(exif.lat, exif.lng, location.lat, location.lng);
        setPhotoWarning(dist > 200);
      }
    } else {
      setPhotoLoc(null);
      setPhotoWarning(false);
    }
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAccuracy(pos.coords.accuracy);
        setDetecting(false);
      },
      () => setDetecting(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validate = () => {
    const e = {};
    if (!form.wasteType)          e.wasteType    = 'Select a waste type.';
    if (!form.description.trim()) e.description  = 'Description is required.';
    if (locMethod === 'map'    && !location)                    e.location = 'Select a location on the map.';
    if (locMethod === 'manual' && !form.manualAddress.trim())   e.location = 'Enter a location address.';
    if (!form.pickupDate)         e.pickupDate   = 'Select a pickup date.';
    if (!form.pickupTime)         e.pickupTime   = 'Select a pickup time.';
    return e;
  };

  const doSubmit = async () => {
    setLoading(true);
    try {
      const token      = localStorage.getItem('token');
      const pickupTime = new Date(`${form.pickupDate}T${form.pickupTime}`).toISOString();
      const finalLoc   = locMethod === 'manual'
        ? { lat: 0, lng: 0, address: form.manualAddress, displayAddress: form.manualAddress }
        : location;

      const body = {
        wasteType:    form.wasteType,
        description:  form.description,
        image:        imageFile ? `[image:${imageFile.name}]` : '',
        location:     finalLoc,
        landmark:     form.landmark,
        landmarkType: form.landmarkType,
        photoLocation: photoLoc || { lat: null, lng: null },
        accuracy,
        pickupTime,
      };

      const res  = await fetch('/api/waste/report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.message || 'Submission failed.' }); return; }
      onSuccess(data.report);
      handleClose();
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (locMethod === 'map' && location) {
      try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`/api/waste/check-duplicate?lat=${location.lat}&lng=${location.lng}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.duplicate) { setDupData(data.report); setShowDupModal(true); return; }
      } catch { }
    }

    await doSubmit();
  };

  const handleClose = () => {
    setForm({ wasteType: '', description: '', pickupDate: '', pickupTime: '', landmark: '', landmarkType: '', manualAddress: '' });
    setLocation(null); setImageFile(null); setPreview(''); setErrors({});
    setPhotoLoc(null); setPhotoWarning(false); setAccuracy(null);
    setDupData(null); setShowDupModal(false); setLocMethod('map');
    onClose();
  };

  if (!isOpen) return null;

  const inp = `w-full rounded-lg border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const lbl = `text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`;
  const errCls = 'text-xs text-red-400 mt-0.5';

  return (
    <>
      {showDupModal && (
        <DuplicateModal
          report={dupData}
          dark={dark}
          onClose={() => setShowDupModal(false)}
          onContinue={() => { setShowDupModal(false); doSubmit(); }}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

        <div className={`relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] ${dark ? 'bg-slate-900' : 'bg-white'}`}>

          <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <HiClipboardList className="h-5 w-5 text-green-500" />
              <span className={`font-semibold text-sm sm:text-base ${dark ? 'text-white' : 'text-slate-900'}`}>Report Waste</span>
            </div>
            <button type="button" onClick={handleClose} className={`rounded-lg p-1.5 transition ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            <div>
              <label className={lbl}>Waste Type</label>
              <select value={form.wasteType} onChange={e => set('wasteType', e.target.value)}
                className={`${inp} mt-1`}>
                <option value="">Select waste type</option>
                {WASTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.wasteType && <p className={errCls}>{errors.wasteType}</p>}
            </div>

            <div>
              <label className={lbl}>Description</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Describe the waste problem..."
                className={`${inp} mt-1 resize-none`} />
              {errors.description && <p className={errCls}>{errors.description}</p>}
            </div>

            <div>
              <label className={lbl}>
                Photo <span className={`text-xs font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
              </label>
              <div className="mt-1 flex flex-col sm:flex-row gap-2">
                <label className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition py-4 ${
                  dark ? 'border-slate-600 hover:border-green-500 bg-slate-800/50' : 'border-slate-300 hover:border-green-400 bg-slate-50'
                }`}>
                  {preview
                    ? <img src={preview} alt="preview" className="h-24 w-auto rounded-lg object-cover" />
                    : <>
                        <HiPhotograph className={`h-7 w-7 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Upload from gallery</span>
                      </>
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
                </label>

                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-5 py-4 transition ${
                    dark ? 'border-slate-600 hover:border-green-500 text-slate-400 hover:text-green-400' : 'border-slate-300 hover:border-green-400 text-slate-400 hover:text-green-600'
                  }`}
                >
                  <HiCamera className="h-7 w-7" />
                  <span className="text-xs">Take Photo</span>
                </button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => handleImage(e.target.files[0])} />
              </div>

              {photoWarning && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                  <HiExclamation className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">Photo location does not match selected map location (distance &gt; 200m). Please verify.</p>
                </div>
              )}
              {photoLoc && !photoWarning && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                  <HiCheckCircle className="h-4 w-4" /> Photo location matches selected location.
                </div>
              )}
            </div>

            <div>
              <label className={lbl}>Nearby Landmark <span className={`text-xs font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span></label>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={form.landmarkType} onChange={e => set('landmarkType', e.target.value)} className={inp}>
                  <option value="">Select landmark type</option>
                  {LANDMARKS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input type="text" value={form.landmark} onChange={e => set('landmark', e.target.value)}
                  placeholder="e.g. Near St. Mary's School"
                  className={inp} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label className={lbl}>Location</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <AccuracyBadge accuracy={accuracy} />
                  <button type="button" onClick={detectCurrentLocation} disabled={detecting}
                    className="flex items-center gap-1 text-xs text-green-600 hover:underline disabled:opacity-50">
                    <MdMyLocation className="h-3.5 w-3.5" />
                    {detecting ? 'Detecting...' : 'Use Current Location'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                {LOC_METHODS.map(m => (
                  <button key={m.id} type="button" onClick={() => setLocMethod(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      locMethod === m.id
                        ? 'bg-green-600 text-white border-green-600'
                        : dark ? 'border-slate-600 text-slate-400 hover:border-green-500' : 'border-slate-300 text-slate-600 hover:border-green-400'
                    }`}>
                    <span>{m.icon}</span> {m.label}
                  </button>
                ))}
              </div>

              {locMethod === 'map' && (
                <GoogleMapPicker onLocationSelect={handleLocationSelect} dark={dark} />
              )}

              {locMethod === 'manual' && (
                <div className="space-y-2">
                  <input type="text" value={form.manualAddress} onChange={e => set('manualAddress', e.target.value)}
                    placeholder="Enter full address, area, city..."
                    className={inp} />
                  <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${dark ? 'bg-slate-800 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                    <HiInformationCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Manual address will be used as-is. For accurate location, use the map picker.</span>
                  </div>
                </div>
              )}

              {errors.location && <p className={errCls}>{errors.location}</p>}

              {location && locMethod === 'map' && (
                <div className={`mt-2 flex items-center gap-1.5 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <HiLocationMarker className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="truncate">{location.displayAddress || location.address}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Pickup Date</label>
                <input type="date" value={form.pickupDate} onChange={e => set('pickupDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`${inp} mt-1`} />
                {errors.pickupDate && <p className={errCls}>{errors.pickupDate}</p>}
              </div>
              <div>
                <label className={lbl}>Pickup Time</label>
                <input type="time" value={form.pickupTime} onChange={e => set('pickupTime', e.target.value)}
                  className={`${inp} mt-1`} />
                {errors.pickupTime && <p className={errCls}>{errors.pickupTime}</p>}
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{errors.submit}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
              <button type="button" onClick={handleClose}
                className={`w-full sm:w-auto flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  dark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="w-full sm:w-auto flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ReportWasteModal;
