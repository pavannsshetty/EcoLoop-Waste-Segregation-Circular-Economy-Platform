import { useState, useRef, useEffect } from 'react';
import {
  HiX, HiPhotograph, HiClipboardList, HiLocationMarker,
  HiCamera, HiExclamation, HiCheckCircle,
  HiMap as HiMapIcon, HiPencil
} from 'react-icons/hi';
import { API } from '../constants';
import { useUser } from '../context/UserContext';
import MapPicker from './MapPicker';

const WASTE_TYPES = ['Wet Waste', 'Dry Waste', 'E-Waste', 'Plastic Waste', 'Mixed Waste'];
const LANDMARKS   = ['School', 'Temple', 'Bus Stop', 'Hospital', 'Market', 'Park', 'Roadside', 'Residential Area', 'Other'];
const LOC_METHODS = [
  { id: 'map',    Icon: HiMapIcon, label: 'Adjust Pin on Map' },
  { id: 'manual', Icon: HiPencil,  label: 'Enter Manually' },
];
const SEVERITY_OPTIONS = [
  { value: 'Low',    label: 'Low',    cls: 'bg-green-100 text-green-700 border-green-300',  active: 'bg-green-500 text-white border-green-500' },
  { value: 'Medium', label: 'Medium', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', active: 'bg-yellow-500 text-white border-yellow-500' },
  { value: 'High',   label: 'High',   cls: 'bg-red-100 text-red-700 border-red-300',       active: 'bg-red-500 text-white border-red-500' },
];
const SEEN_OPTIONS = ['Just now', 'Few hours ago', 'Days ago'];

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, r = d => (d * Math.PI) / 180;
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
          const marker = view.getUint16(offset, false); offset += 2;
          if (marker === 0xFFE1) {
            const exifStr = String.fromCharCode(...new Uint8Array(e.target.result, offset + 2, 4));
            if (exifStr !== 'Exif') { resolve(null); return; }
            const tiffOff = offset + 8;
            const le = view.getUint16(tiffOff, false) === 0x4949;
            const ifdOff = view.getUint32(tiffOff + 4, le);
            const entries = view.getUint16(tiffOff + ifdOff, le);
            let gpsOff = null;
            for (let i = 0; i < entries; i++) {
              const tag = view.getUint16(tiffOff + ifdOff + 2 + i * 12, le);
              if (tag === 0x8825) gpsOff = view.getUint32(tiffOff + ifdOff + 2 + i * 12 + 8, le);
            }
            if (!gpsOff) { resolve(null); return; }
            const gpsEntries = view.getUint16(tiffOff + gpsOff, le);
            let latRef, latVal, lngRef, lngVal;
            const rat = (off) => view.getUint32(off, le) / view.getUint32(off + 4, le);
            for (let i = 0; i < gpsEntries; i++) {
              const base = tiffOff + gpsOff + 2 + i * 12;
              const tag  = view.getUint16(base, le);
              const vOff = view.getUint32(base + 8, le) + tiffOff;
              if (tag === 1) latRef = String.fromCharCode(view.getUint8(base + 8));
              if (tag === 2) latVal = rat(vOff) + rat(vOff + 8) / 60 + rat(vOff + 16) / 3600;
              if (tag === 3) lngRef = String.fromCharCode(view.getUint8(base + 8));
              if (tag === 4) lngVal = rat(vOff) + rat(vOff + 8) / 60 + rat(vOff + 16) / 3600;
            }
            if (latVal != null && lngVal != null) {
              resolve({ lat: latRef === 'S' ? -latVal : latVal, lng: lngRef === 'W' ? -lngVal : lngVal });
            } else resolve(null);
            return;
          }
          offset += view.getUint16(offset, false);
        }
        resolve(null);
      } catch { resolve(null); }
    };
    reader.readAsArrayBuffer(file);
  });

const DuplicateModal = ({ report, onContinue, onClose, dark }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className={`relative z-10 w-full max-w-sm rounded-none shadow-2xl p-5 space-y-4 ${dark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <HiExclamation className="h-6 w-6 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Already Reported Nearby</p>
          <p className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            A waste report exists within 50m in the last 24 hours. You can support the existing report or submit a new one.
          </p>
        </div>
      </div>
      {report && (
        <div className={`rounded-none border p-3 text-xs space-y-1 ${dark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <p><span className="font-bold">Type:</span> {report.wasteType}</p>
          <p><span className="font-bold">Severity:</span> {report.severity}</p>
          <p><span className="font-bold">Location:</span> {report.location?.displayAddress || report.location?.address}</p>
          <p><span className="font-bold">Status:</span> {report.status}</p>
          <p><span className="font-bold">Supports:</span> {report.upvotes?.length || 0}</p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className={`flex-1 rounded-none border py-2 text-sm transition ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
          Cancel
        </button>
        <button onClick={onContinue} className="flex-1 rounded-none bg-green-600 py-2 text-sm text-white hover:bg-green-500 transition">
          Submit Anyway
        </button>
      </div>
    </div>
  </div>
);

const ReportWasteModal = ({ isOpen, onClose, onSuccess, dark = false }) => {
  const { user, refreshUser } = useUser();
  const cameraRef = useRef(null);
  const [form, setForm] = useState({
    wasteType: '', severity: 'Medium', wasteSeenAt: 'Just now',
    description: '', pickupDate: '', pickupTime: '',
    houseNo: '', street: '', landmark: '', wardNumber: '',
  });
  const [locMethod,    setLocMethod]    = useState('map');
  const [location,     setLocation]     = useState(null);
  const [regionValid,  setRegionValid]  = useState(null);
  const [imageFile,    setImageFile]    = useState(null);
  const [preview,      setPreview]      = useState('');
  const [photoLoc,     setPhotoLoc]     = useState(null);
  const [photoWarning, setPhotoWarning] = useState(false);
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [dupData,      setDupData]      = useState(null);
  const [showDup,      setShowDup]      = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isOpen) refreshUser();
  }, [isOpen, refreshUser]);

  const handleLocationSelect = (loc) => {
    setLocation(loc);
    setRegionValid(loc.regionValid !== false ? (loc.regionValid ?? null) : false);
    setErrors(e => ({ ...e, location: '' }));
    if (photoLoc && loc) setPhotoWarning(haversineMeters(photoLoc.lat, photoLoc.lng, loc.lat, loc.lng) > 200);
  };

  const handleImage = async (file) => {
    if (!file) return;
    setImageFile(file); setPreview(URL.createObjectURL(file));
    const exif = await readExifLocation(file);
    if (exif) {
      setPhotoLoc(exif);
      if (location) setPhotoWarning(haversineMeters(exif.lat, exif.lng, location.lat, location.lng) > 200);
    } else { setPhotoLoc(null); setPhotoWarning(false); }
  };


  const validate = () => {
    const e = {};
    if (!form.wasteType)          e.wasteType   = 'Select a waste type.';
    if (!form.description.trim()) e.description = 'Description is required.';
    if (locMethod === 'map'    && !location)                  e.location = 'Select a location on the map.';
    if (locMethod === 'manual') {
      if (!form.houseNo.trim())  e.houseNo  = 'House No / Building Name is required.';
      if (!form.street.trim())   e.street   = 'Street / Area is required.';
      if (!form.wardNumber.trim()) e.wardNumber = 'Ward Number is required.';
    }
    if (!form.pickupDate)         e.pickupDate  = 'Select a pickup date.';
    if (!form.pickupTime)         e.pickupTime  = 'Select a pickup time.';
    return e;
  };

  const doSubmit = async () => {
    setLoading(true);
    try {
      const token      = localStorage.getItem('token');
      const finalLoc   = locMethod === 'manual'
        ? (() => {
            const parts = [form.houseNo, form.street, form.landmark].filter(Boolean);
            const full  = `${parts.join(', ')}`.trim();
            return {
              lat: 0, lng: 0,
              address: full, displayAddress: full,
            };
          })()
        : location;
      const body = {
        wasteType: form.wasteType, severity: form.severity, wasteSeenAt: form.wasteSeenAt,
        description: form.description,
        image: imageFile ? `[image:${imageFile.name}]` : '',
        location: finalLoc, houseNo: form.houseNo, street: form.street, landmark: form.landmark,
        wardNumber: form.wardNumber,
        photoLocation: photoLoc || { lat: null, lng: null }, pickupTime,
        village: user?.village || '',
      };
      const res  = await fetch(`${API}/api/waste/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.message || 'Submission failed.' }); return; }
      onSuccess(data.report);
      handleClose();
    } catch { setErrors({ submit: 'Network error. Please try again.' });
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (locMethod === 'map' && location) {
      try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API}/api/waste/check-duplicate?lat=${location.lat}&lng=${location.lng}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.duplicate) { setDupData(data.report); setShowDup(true); return; }
      } catch { }
    }
    await doSubmit();
  };

  const handleClose = () => {
    setForm({ wasteType: '', severity: 'Medium', wasteSeenAt: 'Just now', description: '', pickupDate: '', pickupTime: '', houseNo: '', street: '', landmark: '', wardNumber: '' });
    setLocation(null); setImageFile(null); setPreview(''); setErrors({});
    setPhotoLoc(null); setPhotoWarning(false);
    setDupData(null); setShowDup(false); setLocMethod('map');
    onClose();
  };

  if (!isOpen) return null;

  const inp = `w-full rounded-none border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const lbl    = `text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`;
  const errCls = 'text-xs text-red-400 mt-0.5';
  const card   = `rounded-none border p-4 space-y-3 ${dark ? 'bg-white/5 border-gray-700' : 'bg-slate-50 border-slate-200'}`;

  return (
    <>
      {showDup && <DuplicateModal report={dupData} dark={dark} onClose={() => setShowDup(false)} onContinue={() => { setShowDup(false); doSubmit(); }} />}

      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={handleClose} />
        <div className={`relative z-10 w-full max-w-md sm:max-w-2xl rounded-none sm:rounded-none shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] pointer-events-auto ${dark ? 'bg-black/90 border border-gray-800' : 'bg-white'}`}>

          <div className={`flex items-center justify-between px-3 sm:px-6 py-3.5 border-b shrink-0 ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <HiClipboardList className="h-5 w-5 text-green-500" />
              <span className={`font-bold text-lg sm:text-xl ${dark ? 'text-white' : 'text-slate-900'}`}>Report Waste</span>
            </div>
            <button type="button" onClick={handleClose} className={`rounded-none p-1.5 transition ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto">

            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Waste Details</p>
              {user?.village && (
                <div className={`flex items-center gap-2 rounded-none border px-3 py-2.5 mb-2 ${dark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                  <HiLocationMarker className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Village (Auto-filled)</p>
                    <p className={`text-sm font-semibold truncate ${dark ? 'text-green-300' : 'text-green-700'}`}>{user?.village}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>From profile</span>
                </div>
              )}
              <div>
                <label className={lbl}>Waste Type</label>
                <select value={form.wasteType} onChange={e => set('wasteType', e.target.value)} className={`${inp} mt-1`}>
                  <option value="">Select waste type</option>
                  {WASTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.wasteType && <p className={errCls}>{errors.wasteType}</p>}
              </div>

              <div>
                <label className={lbl}>Severity Level</label>
                <div className="flex gap-2 mt-1">
                  {SEVERITY_OPTIONS.map(s => (
                    <button key={s.value} type="button" onClick={() => set('severity', s.value)}
                      className={`flex-1 rounded-none border py-2 text-xs font-bold transition ${form.severity === s.value ? s.active : s.cls}`}>
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={lbl}>When was waste seen?</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {SEEN_OPTIONS.map(o => (
                    <button key={o} type="button" onClick={() => set('wasteSeenAt', o)}
                      className={`px-3 py-1.5 rounded-none border text-xs transition ${
                        form.wasteSeenAt === o
                          ? 'bg-green-600 text-white border-green-600'
                          : dark ? 'border-slate-600 text-slate-400 hover:border-green-500' : 'border-slate-300 text-slate-600 hover:border-green-400'
                      }`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={lbl}>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the waste problem..." className={`${inp} mt-1 resize-none`} />
                {errors.description && <p className={errCls}>{errors.description}</p>}
              </div>
            </div>

            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Photo</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed cursor-pointer transition py-4 ${
                  dark ? 'border-slate-600 hover:border-green-500 bg-slate-800/50' : 'border-slate-300 hover:border-green-400 bg-white'
                }`}>
                  {preview
                    ? <img src={preview} alt="preview" className="h-24 w-auto rounded-none object-cover" />
                    : <><HiPhotograph className={`h-7 w-7 ${dark ? 'text-slate-500' : 'text-slate-400'}`} /><span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Upload from gallery</span></>
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
                </label>
                <button type="button" onClick={() => cameraRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-6 py-4 transition ${
                    dark ? 'border-slate-600 hover:border-green-500 text-slate-400 hover:text-green-400' : 'border-slate-300 hover:border-green-400 text-slate-400 hover:text-green-600'
                  }`}>
                  <HiCamera className="h-7 w-7" /><span className="text-xs">Take Photo</span>
                </button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImage(e.target.files[0])} />
              </div>
              {photoWarning && (
                <div className="flex items-start gap-2 rounded-none bg-yellow-50 border border-yellow-200 px-3 py-2">
                  <HiExclamation className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">Photo location does not match selected map location (&gt;200m). Please verify.</p>
                </div>
              )}
              {photoLoc && !photoWarning && (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <HiCheckCircle className="h-4 w-4" /> Photo location matches selected location.
                </div>
              )}
            </div>

            <div className={card}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Location</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {LOC_METHODS.map(m => (
                  <button key={m.id} type="button" onClick={() => setLocMethod(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs border transition ${
                      locMethod === m.id ? 'bg-green-600 text-white border-green-600'
                        : dark ? 'border-slate-600 text-slate-400 hover:border-green-500' : 'border-slate-300 text-slate-600 hover:border-green-400'
                    }`}>
                    <m.Icon className="h-3.5 w-3.5" />{m.label}
                  </button>
                ))}
              </div>
              {locMethod === 'map' && <MapPicker onLocationSelect={handleLocationSelect} dark={dark} />}
              {locMethod === 'manual' && (
                <div className="space-y-3">
                  <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Enter Exact Address</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className={lbl}>House No / Building Name</label>
                      <input type="text" value={form.houseNo} onChange={e => setForm(f => ({ ...f, houseNo: e.target.value }))}
                        placeholder="e.g. 12A, Sri Nilaya" className={`${inp} mt-1`} />
                      {errors.houseNo && <p className={errCls}>{errors.houseNo}</p>}
                    </div>
                    <div>
                      <label className={lbl}>Street / Area / Locality</label>
                      <input type="text" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                        placeholder="e.g. MG Road, Kundapura" className={`${inp} mt-1`} />
                      {errors.street && <p className={errCls}>{errors.street}</p>}
                    </div>
                    <div>
                      <label className={lbl}>Landmark <span className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span></label>
                      <input type="text" value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))}
                        placeholder="e.g. Near Bus Stand" className={`${inp} mt-1`} />
                    </div>
                    <div>
                      <label className={lbl}>Ward Number</label>
                      <input type="text" value={form.wardNumber} onChange={e => setForm(f => ({ ...f, wardNumber: e.target.value }))}
                        placeholder="e.g. Ward 5" className={`${inp} mt-1`} />
                      {errors.wardNumber && <p className={errCls}>{errors.wardNumber}</p>}
                    </div>
                    <div>
                      <label className={lbl}>Village (Auto-filled)</label>
                      <input type="text" value={user?.village || ''} readOnly
                        className={`${inp} mt-1 opacity-70 cursor-not-allowed`} />
                    </div>
                  </div>
                </div>
              )}
              {errors.location && <p className={errCls}>{errors.location}</p>}
              {location && locMethod === 'map' && (
                <div className={`flex flex-col gap-1 rounded-none px-3 py-2 text-xs ${dark ? 'bg-slate-700 text-slate-300' : 'bg-green-50 text-green-700'}`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <HiLocationMarker className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="truncate">Selected Location</span>
                  </div>
                  <span className="opacity-80 leading-relaxed">{location.displayAddress || location.address}</span>
                </div>
              )}
            </div>

            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Pickup Schedule</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Pickup Date</label>
                  <input type="date" value={form.pickupDate} onChange={e => set('pickupDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]} className={`${inp} mt-1`} />
                  {errors.pickupDate && <p className={errCls}>{errors.pickupDate}</p>}
                </div>
                <div>
                  <label className={lbl}>Pickup Time</label>
                  <input type="time" value={form.pickupTime} onChange={e => set('pickupTime', e.target.value)} className={`${inp} mt-1`} />
                  {errors.pickupTime && <p className={errCls}>{errors.pickupTime}</p>}
                </div>
              </div>
              {form.severity && (
                <div className={`flex items-center gap-2 rounded-none px-3 py-2 text-xs ${dark ? 'bg-slate-700 text-slate-300' : 'bg-green-50 text-green-700'}`}>
                  <HiCheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  Expected cleanup: {form.severity === 'High' ? '24 hours' : form.severity === 'Medium' ? '48 hours' : '72 hours'}
                </div>
              )}
            </div>


            {errors.submit && (
              <div className="rounded-none bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{errors.submit}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
              <button type="button" onClick={handleClose}
                className={`w-full sm:w-auto flex-1 rounded-none border px-4 py-2.5 text-sm transition ${
                  dark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                Cancel
              </button>
              <button type="submit" disabled={loading || regionValid === false}
                className="w-full sm:w-auto flex-1 rounded-none bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Submitting...' : regionValid === false ? 'Outside Service Area' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ReportWasteModal;
