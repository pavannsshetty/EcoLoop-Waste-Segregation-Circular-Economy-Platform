import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  HiX, HiPhotograph, HiCheckCircle, HiHome,
  HiCamera, HiPencil,
  HiLocationMarker, HiExclamationCircle, HiArrowRight
} from 'react-icons/hi';
import { API } from '../constants';
import { useUser } from '../context/UserContext';
import Dropdown from './Dropdown';

const WASTE_TYPES = [
  'Plastic Waste', 'Organic Waste', 'Food Waste', 'E-Waste', 
  'Construction Waste', 'Medical Waste', 'Mixed Waste', 
  'Glass Waste', 'Paper Waste', 'Sewage / Drainage', 'Dead Animal Waste'
];

const QUANTITY_OPTIONS = ['Small Cache', 'Medium Pile', 'Large Dump', 'Institutional / Bulk', 'Very Large / Hazardous'];

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
        <h3 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Pickup Requested!</h3>
        <p className={`text-sm mt-2 font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          A collector will arrive at your home on the scheduled date.
        </p>
      </div>
      <div className={`py-4 rounded-none border-2 border-dashed ${dark ? 'bg-white/5 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <p className={`text-xs uppercase tracking-widest font-bold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Your Request ID</p>
        <p className="text-2xl font-black text-green-600 mt-1 tracking-tighter">{reportId}</p>
      </div>
      <button onClick={onClose} className="w-full rounded-none bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-500 transition shadow-lg active:scale-95">
        Track Request
      </button>
    </div>
  </div>
);

const HomePickupModal = ({ isOpen, onClose, onSuccess, dark = false }) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const cameraRef = useRef(null);
  const [form, setForm] = useState({
    wasteType: '', quantity: 'Medium Pile', priorityLevel: 'Normal', description: '',
  });
  const [imageFile,    setImageFile]    = useState(null);
  const [preview,      setPreview]      = useState('');
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [submittedId,  setSubmittedId]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isOpen) refreshUser();
  }, [isOpen, refreshUser]);

  const handleImage = (file) => {
    if (!file) return;
    setImageFile(file); setPreview(URL.createObjectURL(file));
  };

  const hasAddress = !!(user?.houseNo || user?.streetArea);
  const hasGPS = !!(user?.latitude && user?.longitude);

  const validate = () => {
    const e = {};
    if (!form.wasteType)  e.wasteType  = 'Select a waste type.';
    if (!hasAddress && !hasGPS) {
      e.address = 'Please complete your address details in your profile before requesting pickup.';
    }
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

      const displayAddr = [user.houseNo, user.streetArea, user.landmark, `${user.village} Village`].filter(Boolean).join(', ');

      const location = {
        address: displayAddr || user.streetArea || user.village,
        displayAddress: displayAddr,
      };
      if (user.latitude && user.longitude) {
        location.lat = user.latitude;
        location.lng = user.longitude;
      }

      formData.append('location', JSON.stringify(location));
      formData.append('village', user?.village || '');
      formData.append('reportType', 'Home Pickup');
      formData.append('houseNo', user?.houseNo || '');
      formData.append('street', user?.streetArea || '');
      formData.append('wardNumber', '');
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch(`${API}/api/waste/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ duplicate: data, submit: data.message });
        } else {
          setErrors({ submit: data.message || 'Submission failed.' });
        }
        return;
      }
      setSubmittedId(data.report.reportId);
      onSuccess(data.report);
    } catch (err) { 
      setErrors({ submit: 'Network error. Please try again.' });
    } finally { setLoading(false); }
  };

  const handleClose = () => {
    setForm({ wasteType: '', quantity: 'Medium Pile', priorityLevel: 'Normal', description: '' });
    setImageFile(null); setPreview(''); setErrors({});
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

  const addressComplete = hasAddress || hasGPS;

  return createPortal(
    <>
      {submittedId && <SuccessModal reportId={submittedId} dark={dark} onClose={handleClose} />}

      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={handleClose} />
        <div className={`relative z-10 w-full max-w-md sm:max-w-xl rounded-none shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] pointer-events-auto ${dark ? 'bg-slate-900 border border-gray-800' : 'bg-white'}`}>

          <div className={`flex items-center justify-between px-3 sm:px-6 py-3.5 border-b shrink-0 ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <HiHome className="h-5 w-5 text-green-500" />
              <span className={`font-bold text-lg sm:text-xl ${dark ? 'text-white' : 'text-slate-900'}`}>Request Home Pickup</span>
            </div>
            <button type="button" onClick={handleClose} className={`rounded-none p-1.5 transition ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto">

            <div className={card}>
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Pickup Address</p>
                <button type="button" onClick={() => { handleClose(); navigate('/citizen/profile'); }}
                  className="text-[10px] font-bold text-green-600 hover:underline flex items-center gap-1">
                  <HiPencil className="h-3 w-3" /> EDIT ADDRESS
                </button>
              </div>

              {addressComplete ? (
                <div className={`p-4 rounded-none border border-dashed ${dark ? 'bg-white/5 border-slate-700' : 'bg-white border-slate-300'}`}>
                  {user?.addressType && (
                    <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-lg mb-1 uppercase tracking-wider dark:bg-[#0AAF29]/20 dark:text-[#0AAF29]">
                      {user.addressType}
                    </span>
                  )}
                  <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {user.houseNo && `${user.houseNo}, `}{user.streetArea}
                  </p>
                  <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{user.landmark && `${user.landmark}, `}{user.village} Village</p>
                  <div className="flex items-center gap-2 mt-2">
                    {hasGPS ? (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${dark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
                        <HiCheckCircle className="h-3 w-3" /> GPS Verified
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                        <HiExclamationCircle className="h-3 w-3" /> No GPS
                      </span>
                    )}
                  </div>
                  {hasGPS && (
                    <div className={`mt-2 text-[10px] font-mono ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Lat: {user.latitude.toFixed(6)} &middot; Lng: {user.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-none bg-red-50 border border-red-200 text-center space-y-2.5">
                  <div>
                    <p className="text-xs text-red-600 font-bold uppercase">Address Not Set</p>
                    <p className="text-[10px] text-red-500 mt-1">Set your home address and GPS location in profile before requesting pickup.</p>
                  </div>
                  <button type="button" onClick={() => { handleClose(); navigate('/citizen/profile'); }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition active:scale-95">
                    Complete Address <HiArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {errors.address && <p className={errCls}>{errors.address}</p>}
            </div>

            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Pickup Details</p>
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
                  <label className={lbl}>Estimated Quantity</label>
                  <Dropdown value={form.quantity} onChange={e => set('quantity', e.target.value)}
                    placeholder="Select Quantity" className="mt-1">
                    {QUANTITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </Dropdown>
                </div>
                <div>
                  <label className={lbl}>Priority</label>
                  <Dropdown value={form.priorityLevel} onChange={e => set('priorityLevel', e.target.value)}
                    placeholder="Select Priority" className="mt-1">
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </Dropdown>
                </div>
              </div>
              <div>
                <label className={lbl}>Instructions <span className="font-normal opacity-50 text-xs">(optional)</span></label>
                <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Special instructions for the collector (e.g. ring bell, gate code)..." className={`${inp} mt-1 resize-none`} />
              </div>
            </div>

            <div className={card}>
              <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Waste Photo</p>
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

            {errors.submit && !errors.duplicate && (
              <div className="rounded-none bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{errors.submit}</div>
            )}
            {errors.duplicate && (
              <div className={`rounded-lg border p-4 space-y-3 ${dark ? 'bg-amber-900/10 border-amber-700/50' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2 text-amber-600">
                  <HiExclamationCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-bold">{errors.duplicate.message}</p>
                </div>
                <div className="text-xs space-y-1 pl-7">
                  <p className={dark ? 'text-slate-300' : 'text-slate-600'}>
                    <span className="font-semibold">Existing Request ID:</span> <span className="font-mono font-bold text-green-600">{errors.duplicate.existingReportId}</span>
                  </p>
                  <p className={dark ? 'text-slate-300' : 'text-slate-600'}>
                    <span className="font-semibold">Status:</span> <span className="font-bold uppercase tracking-wider">{errors.duplicate.status}</span>
                  </p>
                </div>
                <div className="pl-7">
                  <button type="button" onClick={() => { handleClose(); navigate('/citizen/home-reports'); }}
                    className="text-xs font-bold text-[#0AAF29] hover:underline flex items-center gap-1">
                    View Existing Request &rarr;
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
              <button type="button" onClick={handleClose}
                className={`w-full sm:w-auto flex-1 rounded-none border px-4 py-2.5 text-sm transition ${
                  dark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                Cancel
              </button>
              <button type="submit" disabled={loading || !addressComplete}
                className="w-full sm:w-auto flex-1 rounded-none bg-[#0AAF29] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0AAF29]/90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-center uppercase">
                {loading ? 'Requesting...' : 'Request Home Pickup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};

export default HomePickupModal;