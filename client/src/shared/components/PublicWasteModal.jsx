import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HiX, HiPhotograph, HiClipboardList, HiLocationMarker,
  HiCamera, HiExclamation, HiCheckCircle,
  HiMap as HiMapIcon, HiPencil
} from 'react-icons/hi';
import { API } from '../constants';
import { useUser } from '../context/UserContext';
import MapPicker from './MapPicker';
import Dropdown from './Dropdown';

const WASTE_TYPES = [
  'Plastic Waste', 'Organic Waste', 'Food Waste', 'E-Waste', 
  'Construction Waste', 'Medical Waste', 'Mixed Waste', 
  'Glass Waste', 'Paper Waste', 'Sewage / Drainage', 'Dead Animal Waste'
];

const SEVERITY_OPTIONS = [
  { value: 'Low',    label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High',   label: 'High' },
];

const SEEN_OPTIONS = ['Just Now', 'Few Hours Ago', 'Today', 'Yesterday', 'Multiple Days Ago'];

const DuplicateWarningModal = ({ duplicates, onClose, onContinue, onViewReport, onSupport, dark }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative z-10 w-full max-w-md rounded-none shadow-2xl p-6 space-y-4 ${dark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <HiExclamation className="h-6 w-6 text-amber-500 shrink-0" />
        <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Similar report{duplicates.length > 1 ? 's' : ''} already exist nearby</p>
      </div>
      <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        The following similar report{duplicates.length > 1 ? 's were' : ' was'} found within 100 meters:
      </p>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {duplicates.map((d) => (
          <div key={d._id} className={`p-3 rounded-none border text-xs space-y-1 ${dark ? 'bg-white/5 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-green-600">{d.reportId}</span>
              <span className={`px-1.5 py-0.5 rounded-none text-[10px] font-bold ${d.status === 'Verified' ? 'bg-green-100 text-green-700' : d.status === 'Submitted' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{d.status}</span>
            </div>
            <p className={dark ? 'text-slate-300' : 'text-slate-600'}>{d.wasteType} · {d.distance}m away</p>
            <p className={dark ? 'text-slate-300' : 'text-slate-600'}>
              Supported by <span className="font-semibold text-green-600">{d.supportedByCount || 0}</span> citizen{d.supportedByCount === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => onViewReport(d._id)}
                className="text-[10px] font-semibold text-blue-600 hover:underline">View</button>
              <button type="button" onClick={() => onSupport(d._id)}
                className="text-[10px] font-semibold text-green-600 hover:underline">Support</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className={`flex-1 rounded-none border py-2.5 text-sm font-semibold transition ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
          Cancel
        </button>
        <button type="button" onClick={onContinue}
          className="flex-1 rounded-none bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition">
          Continue Anyway
        </button>
      </div>
    </div>
  </div>
);

const SuccessModal = ({ reportId, onClose, dark }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative z-10 w-full max-w-sm rounded-none shadow-2xl p-8 text-center space-y-6 ${dark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
      <div className="flex justify-center">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
          <HiCheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>
      <div>
        <h3 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Public Waste Reported!</h3>
        <p className={`text-sm mt-2 font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          The authorities have been notified about this public waste.
        </p>
      </div>
      <div className={`py-4 rounded-none border-2 border-dashed ${dark ? 'bg-white/5 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <p className={`text-xs uppercase tracking-widest font-bold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Your Report ID</p>
        <p className="text-2xl font-black text-green-600 mt-1 tracking-tighter">{reportId}</p>
      </div>
      <button onClick={onClose} className="w-full rounded-none bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-500 transition shadow-lg active:scale-95">
        View My Reports
      </button>
    </div>
  </div>
);

const PublicWasteModal = ({ isOpen, onClose, onSuccess, dark = false }) => {
  const { user, refreshUser } = useUser();
  const cameraRef = useRef(null);
  const [form, setForm] = useState({
    wasteType: '', severity: '', wasteSeenAt: '', description: '',
  });
  const [location,     setLocation]     = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [regionValid,  setRegionValid]  = useState(null);
  const [imageFile,    setImageFile]    = useState(null);
  const [preview,      setPreview]      = useState('');
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [submittedId,  setSubmittedId]  = useState('');
  const [duplicates,   setDuplicates]   = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isOpen) refreshUser();
  }, [isOpen, refreshUser]);

  const handleLocationSelect = (loc) => {
    // loc can be null (clear) with optional second arg clearedSource
    const clearedSource = arguments[1] || null;
    console.debug('[PublicWasteModal] handleLocationSelect called', { loc, clearedSource });
    if (!loc) {
      console.debug('[PublicWasteModal] clearing location', { clearedSource });
      if (clearedSource === 'detect') {
        setDetectedLocation(null);
      } else if (clearedSource === 'map') {
        setLocation(null);
        setRegionValid(null);
      } else {
        // unknown - clear both
        setDetectedLocation(null);
        setLocation(null);
        setRegionValid(null);
      }
    } else if (loc.source === 'detect') {
      console.debug('[PublicWasteModal] setting detected location', { lat: loc.lat, lng: loc.lng, address: loc.displayAddress, regionValid: loc.regionValid });
      setDetectedLocation(loc);
    } else {
      console.debug('[PublicWasteModal] setting selected location', { lat: loc.lat, lng: loc.lng, address: loc.displayAddress, regionValid: loc.regionValid });
      setLocation(loc);
      setRegionValid(loc.regionValid !== false ? (loc.regionValid ?? null) : false);
    }
    setErrors(e => ({ ...e, location: '' }));
  };

  const handleImage = (file) => {
    if (!file) return;
    setImageFile(file); setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!form.wasteType) e.wasteType = 'Select a waste type.';
    if (!location)       e.location = 'Select a location on the map.';
    if (!form.severity)  e.severity = 'Select severity level.';
    if (!form.wasteSeenAt) e.wasteSeenAt = 'Select when seen.';
    return e;
  };

  const checkDuplicates = async () => {
    try {
      const token = localStorage.getItem('token');
      const lat = location?.lat;
      const lng = location?.lng;
      if (!lat || !lng) return null;
      const res = await fetch(`${API}/api/waste/check-duplicate-enhanced?lat=${lat}&lng=${lng}&wasteType=${encodeURIComponent(form.wasteType)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.hasDuplicates ? data.duplicates : null;
      }
    } catch {}
    return null;
  };

  const doSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      formData.append('location', JSON.stringify(location));
      formData.append('village', user?.village || '');
      formData.append('reportType', 'Public');
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch(`${API}/api/waste/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.message || 'Submission failed.' }); return; }
      setSubmittedId(data.report.reportId);
      onSuccess(data.report);
    } catch (err) { 
      setErrors({ submit: 'Network error. Please try again.' });
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (location && form.wasteType) {
      const found = await checkDuplicates();
      if (found && found.length > 0) {
        setDuplicates(found);
        return;
      }
    }
    doSubmit();
  };

  const handleContinueAnyway = () => {
    setDuplicates(null);
    doSubmit();
  };

  const handleSupportDuplicate = async (dupId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/api/waste/report/${dupId}/support`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDuplicates(null);
      onClose();
    } catch {}
  };

  const handleClose = () => {
    setForm({ wasteType: '', severity: '', wasteSeenAt: '', description: '' });
    setLocation(null); setDetectedLocation(null); setImageFile(null); setPreview(''); setErrors({});
    setSubmittedId(''); setDuplicates(null);
    onClose();
  };

  if (!isOpen) return null;

  const inp = `w-full rounded-none border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const lbl    = `text-sm font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`;
  const errCls = 'text-xs text-red-500 mt-0.5';
  const card   = `rounded-none border p-4 space-y-3 ${dark ? 'bg-white/5 border-gray-700' : 'bg-slate-50 border-slate-200'}`;

  return createPortal(
    <>
      {duplicates && (
        <DuplicateWarningModal
          duplicates={duplicates}
          dark={dark}
          onClose={() => setDuplicates(null)}
          onContinue={handleContinueAnyway}
          onViewReport={(id) => window.open(`/citizen/public-reports?id=${id}`, '_blank')}
          onSupport={handleSupportDuplicate}
        />
      )}
      {submittedId && <SuccessModal reportId={submittedId} dark={dark} onClose={handleClose} />}

      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={handleClose} />
        <div className={`relative z-10 w-full max-w-md sm:max-w-2xl rounded-none shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] pointer-events-auto ${dark ? 'bg-slate-900 border border-gray-800' : 'bg-white'}`}>

          <div className={`flex items-center justify-between px-3 sm:px-6 py-3.5 border-b shrink-0 ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <HiMapIcon className="h-5 w-5 text-orange-500" />
              <span className={`font-bold text-lg sm:text-xl ${dark ? 'text-white' : 'text-slate-900'}`}>Report Public Waste</span>
            </div>
            <button type="button" onClick={handleClose} className={`rounded-none p-1.5 transition ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto">
            
            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide text-orange-500`}>Service Area: {user?.village}, Kundapura Taluk</p>
              <MapPicker onLocationSelect={handleLocationSelect} villageName={user?.village} dark={dark} />
              {detectedLocation && (
                <div className={`mt-3 rounded-none border p-3 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Detected location</p>
                  <p className={`text-sm mt-1 ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {detectedLocation.displayAddress || detectedLocation.address || `${detectedLocation.lat?.toFixed(6)}, ${detectedLocation.lng?.toFixed(6)}`}
                  </p>
                  <p className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {detectedLocation.village ? `Village: ${detectedLocation.village}` : ''}
                    {detectedLocation.village && detectedLocation.taluk ? ` · ` : ''}
                    {detectedLocation.taluk ? `Taluk: ${detectedLocation.taluk}` : ''}
                  </p>
                  <p className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Lat: {detectedLocation.lat?.toFixed(6)} | Lng: {detectedLocation.lng?.toFixed(6)}
                  </p>
                </div>
              )}

              {location && (
                <div className={`mt-3 rounded-none border p-3 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Selected Location</p>
                  <p className={`text-sm mt-1 ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {location.displayAddress || location.address || `${location.lat?.toFixed(6)}, ${location.lng?.toFixed(6)}`}
                  </p>
                  <p className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {location.village ? `Village: ${location.village}` : ''}
                    {location.village && location.taluk ? ` · ` : ''}
                    {location.taluk ? `Taluk: ${location.taluk}` : ''}
                  </p>
                  <p className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Lat: {location.lat?.toFixed(6)} | Lng: {location.lng?.toFixed(6)}
                  </p>
                </div>
              )}
              {errors.location && <p className={errCls}>{errors.location}</p>}
            </div>

            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Waste Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Waste Type</label>
                  <Dropdown value={form.wasteType} onChange={e => set('wasteType', e.target.value)}
                    placeholder="Select waste type" className="mt-1">
                    <option value="">Select waste type</option>
                    {WASTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Dropdown>
                  {errors.wasteType && <p className={errCls}>{errors.wasteType}</p>}
                </div>
                <div>
                  <label className={lbl}>Severity Level</label>
                  <Dropdown value={form.severity} onChange={e => set('severity', e.target.value)}
                    placeholder="Select Severity" className="mt-1">
                    <option value="">Select severity level</option>
                    {SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Dropdown>
                  {errors.severity && <p className={errCls}>{errors.severity}</p>}
                </div>
                <div>
                  <label className={lbl}>When was waste seen?</label>
                  <Dropdown value={form.wasteSeenAt} onChange={e => set('wasteSeenAt', e.target.value)}
                    placeholder="Select When Seen" className="mt-1">
                    <option value="">Select when seen</option>
                    {SEEN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </Dropdown>
                  {errors.wasteSeenAt && <p className={errCls}>{errors.wasteSeenAt}</p>}
                </div>
              </div>
              <div>
                <label className={lbl}>Description <span className="font-normal opacity-50 text-xs">(optional)</span></label>
                <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Additional details about the location or waste type..." className={`${inp} mt-1 resize-none`} />
              </div>
            </div>

            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Evidence Photo</p>
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
                className="w-full sm:w-auto flex-1 rounded-none bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-center">
                {loading ? 'Submitting...' : regionValid === false ? 'Outside Village' : 'SUBMIT PUBLIC REPORT'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};

export default PublicWasteModal;
