import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiChevronLeft, HiPhotograph, HiLocationMarker, 
  HiCheckCircle, HiExclamation, HiTruck,
  HiCurrencyRupee, HiClock
} from 'react-icons/hi';
import MapPicker from '../../shared/components/MapPicker';
import { useTheme } from '../../shared/context/ThemeContext';

const SCRAP_TYPES = ['Paper', 'Plastic', 'Metal', 'E-Waste', 'Glass', 'Clothes', 'Furniture', 'Other'];
const PICKUP_TIMES = ['Morning', 'Afternoon', 'Evening'];

const SellScrap = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);

  const [form, setForm] = useState({
    scrapType: '',
    quantity: '',
    pickupTime: '',
    description: '',
  });
  const [location, setLocation] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = (file) => {
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!form.scrapType) e.scrapType = 'Please select a scrap type.';
    if (!form.quantity.trim()) e.quantity = 'Please enter estimated quantity.';
    if (!form.pickupTime) e.pickupTime = 'Please select a preferred pickup time.';
    if (!location) e.location = 'Please select a pickup location on the map.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const token = localStorage.getItem('token');
      const body = {
        ...form,
        location,
        image: imageFile ? `[image:${imageFile.name}]` : ''
      };

      const res = await fetch('/api/scrap/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/citizen/scrap-requests'), 2000);
      } else {
        setErrors({ submit: data.message || 'Failed to submit request.' });
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full rounded-xl border py-2.5 px-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dk('bg-white/5 border-gray-700 text-slate-100', 'bg-white border-slate-200 text-slate-900')
  }`;

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <HiCheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h2 className={`text-2xl font-bold ${dk('text-white', 'text-slate-900')}`}>Request Submitted!</h2>
        <p className="text-slate-500 mt-2">Our collector will contact you soon for pickup.</p>
        <p className="text-green-600 font-medium mt-1">Redirecting to your requests...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className={`p-2 rounded-sm border transition-colors duration-200 ${dk('border-slate-700 text-slate-400 hover:bg-slate-700', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
          <HiChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className={`text-base font-medium ${dk('text-white', 'text-slate-900')}`}>Sell Scrap</h1>
          <p className="text-xs text-slate-500">Earn Eco Points by recycling your scrap waste.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`rounded-sm border p-5 sm:p-6 space-y-5 transition-colors duration-200 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Scrap Type</label>
              <select 
                value={form.scrapType} 
                onChange={e => set('scrapType', e.target.value)}
                className={inputCls}
              >
                <option value="">Select type</option>
                {SCRAP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.scrapType && <p className="text-xs text-red-500 mt-1">{errors.scrapType}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Estimated Quantity</label>
              <input 
                type="text" 
                value={form.quantity} 
                onChange={e => set('quantity', e.target.value)}
                placeholder="e.g. 5kg or 2 items"
                className={inputCls}
              />
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Pickup Time Preference</label>
            <div className="flex gap-3">
              {PICKUP_TIMES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('pickupTime', t)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${
                    form.pickupTime === t 
                      ? 'bg-green-600 text-white border-green-600 shadow-md' 
                      : dk('border-slate-700 text-slate-400 hover:bg-white/5', 'border-slate-200 text-slate-600 hover:bg-slate-50')
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {errors.pickupTime && <p className="text-xs text-red-500 mt-1">{errors.pickupTime}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Description (Optional)</label>
            <textarea 
              rows={3} 
              value={form.description} 
              onChange={e => set('description', e.target.value)}
              placeholder="Any specific instructions for the collector..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Upload Image (Optional)</label>
            <label className={`flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed aspect-video cursor-pointer transition-colors duration-200 ${
              dk('border-gray-700 hover:border-green-500 bg-white/5', 'border-slate-200 hover:border-green-400 bg-slate-50')
            }`}>
              {preview ? (
                <img src={preview} alt="preview" className="h-full w-full object-contain rounded-xl" />
              ) : (
                <>
                  <HiPhotograph className="h-8 w-8 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">Click to upload photo</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className={`rounded-sm border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-500">Pickup Location</label>
            {location && (
              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase">Location pinned</span>
            )}
          </div>
          <MapPicker onLocationSelect={setLocation} dark={dark} />
          {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          {location && (
             <div className="flex items-start gap-2 text-xs text-slate-500">
                <HiLocationMarker className="h-4 w-4 text-green-500 shrink-0" />
                <span>{location.displayAddress || location.address}</span>
             </div>
          )}
        </div>

        {errors.submit && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-center gap-2">
            <HiExclamation className="h-5 w-5 shrink-0" />
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-200 hover:shadow-green-300 hover:scale-[1.01] transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
          ) : (
            <>
              <HiTruck className="h-5 w-5" />
              Request Scrap Pickup
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SellScrap;
