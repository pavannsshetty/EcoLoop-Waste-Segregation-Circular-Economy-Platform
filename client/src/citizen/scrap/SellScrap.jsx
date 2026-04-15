import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiX, HiPhotograph, HiLocationMarker,
  HiCheckCircle, HiExclamation, HiTruck, HiClipboardList
} from 'react-icons/hi';
import MapPicker from '../../shared/components/MapPicker';
import { useTheme } from '../../shared/context/ThemeContext';

const SCRAP_TYPES  = ['Paper', 'Plastic', 'Metal', 'E-Waste', 'Glass', 'Clothes', 'Furniture', 'Other'];
const PICKUP_TIMES = ['Morning', 'Afternoon', 'Evening'];

const SellScrap = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);

  const [form, setForm] = useState({ scrapType: '', quantity: '', pickupTime: '', description: '' });
  const [location,   setLocation]   = useState(null);
  const [imageFile,  setImageFile]  = useState(null);
  const [preview,    setPreview]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState({});
  const [success,    setSuccess]    = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleImage = (file) => {
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!form.scrapType)        e.scrapType  = 'Please select a scrap type.';
    if (!form.quantity.trim())  e.quantity   = 'Please enter estimated quantity.';
    if (!form.pickupTime)       e.pickupTime = 'Please select a preferred pickup time.';
    if (!location)              e.location   = 'Please select a pickup location on the map.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/scrap/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, location, image: imageFile ? `[image:${imageFile.name}]` : '' }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess(true); setTimeout(() => navigate('/citizen/scrap-requests'), 2000); }
      else setErrors({ submit: data.message || 'Failed to submit request.' });
    } catch {
      setErrors({ submit: 'Network error. Please try again later.' });
    } finally { setLoading(false); }
  };

  const handleClose = () => navigate(-1);

  const inp = `w-full rounded-none border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dk('bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400')
  }`;
  const lbl    = `text-sm ${dk('text-slate-300', 'text-slate-700')}`;
  const errCls = 'text-xs text-red-400 mt-0.5';
  const card   = `rounded-none border p-4 space-y-3 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className={`w-full max-w-sm rounded-sm shadow-2xl p-8 flex flex-col items-center text-center ${dk('bg-slate-900 border border-gray-700', 'bg-white')}`}>
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <HiCheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className={`text-xl font-bold ${dk('text-white', 'text-slate-900')}`}>Request Submitted!</h2>
          <p className="text-slate-500 mt-2 text-sm">Our collector will contact you soon for pickup.</p>
          <p className="text-green-600 mt-1 text-sm">Redirecting to your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className={`relative z-10 w-full sm:max-w-2xl rounded-none sm:rounded-none shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] ${dk('bg-black/90 border border-gray-800', 'bg-white')}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${dk('border-slate-700', 'border-slate-100')}`}>
          <div className="flex items-center gap-2">
            <HiClipboardList className="h-5 w-5 text-green-500" />
            <span className={`font-bold text-sm sm:text-base ${dk('text-white', 'text-slate-900')}`}>Sell Scrap</span>
          </div>
          <button type="button" onClick={handleClose} className={`rounded-none p-1.5 transition ${dk('text-slate-400 hover:bg-slate-700', 'text-slate-400 hover:bg-slate-100')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* Scrap Details */}
          <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-slate-400', 'text-slate-500')}`}>Scrap Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Scrap Type</label>
                <select value={form.scrapType} onChange={e => set('scrapType', e.target.value)} className={`${inp} mt-1`}>
                  <option value="">Select type</option>
                  {SCRAP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.scrapType && <p className={errCls}>{errors.scrapType}</p>}
              </div>
              <div>
                <label className={lbl}>Estimated Quantity</label>
                <input type="text" value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  placeholder="e.g. 5kg or 2 items" className={`${inp} mt-1`} />
                {errors.quantity && <p className={errCls}>{errors.quantity}</p>}
              </div>
            </div>

            <div>
              <label className={lbl}>Pickup Time Preference</label>
              <div className="flex gap-2 mt-1">
                {PICKUP_TIMES.map(t => (
                  <button key={t} type="button" onClick={() => set('pickupTime', t)}
                    className={`flex-1 py-2 rounded-none border text-xs font-bold transition ${
                      form.pickupTime === t
                        ? 'bg-green-600 text-white border-green-600'
                        : dk('border-slate-600 text-slate-400 hover:border-green-500', 'border-slate-300 text-slate-600 hover:border-green-400')
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
              {errors.pickupTime && <p className={errCls}>{errors.pickupTime}</p>}
            </div>

            <div>
              <label className={lbl}>Description (Optional)</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Any specific instructions for the collector..."
                className={`${inp} mt-1 resize-none`} />
            </div>
          </div>

          {/* Photo */}
          <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-slate-400', 'text-slate-500')}`}>Photo (Optional)</p>
            <label className={`flex flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed cursor-pointer transition py-6 ${
              dk('border-slate-600 hover:border-green-500 bg-slate-800/50', 'border-slate-300 hover:border-green-400 bg-white')
            }`}>
              {preview
                ? <img src={preview} alt="preview" className="h-24 w-auto rounded-none object-cover" />
                : <><HiPhotograph className={`h-7 w-7 ${dk('text-slate-500', 'text-slate-400')}`} /><span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Click to upload photo</span></>
              }
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
            </label>
          </div>

          {/* Location */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-slate-400', 'text-slate-500')}`}>Pickup Location</p>
              {location && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase">Location pinned</span>}
            </div>
            <MapPicker onLocationSelect={setLocation} dark={dark} />
            {errors.location && <p className={errCls}>{errors.location}</p>}
            {location && (
              <div className="flex items-start gap-1.5 text-xs text-slate-500">
                <HiLocationMarker className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{location.displayAddress || location.address}</span>
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="rounded-none bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
              <HiExclamation className="h-5 w-5 shrink-0" />{errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
            <button type="button" onClick={handleClose}
              className={`w-full sm:w-auto flex-1 rounded-none border px-4 py-2.5 text-sm transition ${
                dk('border-slate-600 text-slate-300 hover:bg-slate-800', 'border-slate-300 text-slate-600 hover:bg-slate-50')
              }`}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="w-full sm:w-auto flex-1 rounded-sm bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading
                ? <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                : <><HiTruck className="h-4 w-4" /> Request Scrap Pickup</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellScrap;
