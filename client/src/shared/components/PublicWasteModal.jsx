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
  const [regionValid,  setRegionValid]  = useState(null);
  const [imageFile,    setImageFile]    = useState(null);
  const [preview,      setPreview]      = useState('');
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [submittedId,  setSubmittedId]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isOpen) refreshUser();
  }, [isOpen, refreshUser]);

  const handleLocationSelect = (loc) => {
    setLocation(loc);
    setRegionValid(loc.regionValid !== false ? (loc.regionValid ?? null) : false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

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

  const handleClose = () => {
    setForm({ wasteType: '', severity: '', wasteSeenAt: '', description: '' });
    setLocation(null); setImageFile(null); setPreview(''); setErrors({});
    setSubmittedId('');
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
