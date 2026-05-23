import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../shared/constants';
import {
  HiX, HiLocationMarker, HiCamera,
  HiCheckCircle, HiExclamation, HiTruck, HiClipboardList,
  HiPencil, HiOutlinePhotograph
} from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';

const SCRAP_TYPES  = ['Paper', 'Plastic', 'Metal', 'E-Waste', 'Glass', 'Clothes', 'Furniture', 'Other'];
const PICKUP_TIMES = ['Morning', 'Afternoon', 'Evening'];
const QUANTITY_TYPES = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'items', label: 'Number of Items' },
  { value: 'not-sure', label: 'Not Sure' }
];

const SellScrap = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { user: ctxUser, updateUser } = useUser();
  const dk = (d, l) => (dark ? d : l);

  const [form, setForm] = useState({
    scrapType: '',
    quantityType: 'kg',
    quantity: '',
    pickupTime: '',
    description: ''
  });
  const [address, setAddress] = useState({
    village: '',
    houseNo: '',
    streetArea: '',
    landmark: '',
    addressType: ''
  });
  const [addressLoading, setAddressLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Fetch user address from profile
  useEffect(() => {
    const fetchAddress = async () => {
      setAddressLoading(true);
      try {
        // First try from context
        if (ctxUser) {
          const addr = {
            village: ctxUser.village || '',
            houseNo: ctxUser.houseNo || '',
            streetArea: ctxUser.streetArea || '',
            landmark: ctxUser.landmark || '',
            addressType: ctxUser.addressType || ''
          };
          setAddress(addr);
          setAddressLoading(false);
          return;
        }

        // Fallback: fetch from API
        const token = localStorage.getItem('token');
        if (!token) {
          setAddressLoading(false);
          return;
        }

        const res = await fetch(`${API}/api/citizen/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const addr = {
            village: data.village || '',
            houseNo: data.houseNo || '',
            streetArea: data.streetArea || '',
            landmark: data.landmark || '',
            addressType: data.addressType || ''
          };
          setAddress(addr);
          updateUser(data);
        }
      } catch (err) {
        console.error('Error fetching address:', err);
      } finally {
        setAddressLoading(false);
      }
    };

    fetchAddress();
  }, [ctxUser, updateUser]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const handleImage = (file) => {
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!form.scrapType) e.scrapType = 'Please select a scrap type.';
    
    // Quantity validation based on type
    if (form.quantityType !== 'not-sure') {
      if (!form.quantity || form.quantity.trim() === '') {
        e.quantity = `Please enter estimated ${form.quantityType === 'kg' ? 'weight in kg' : 'number of items'}.`;
      } else {
        const qty = parseFloat(form.quantity);
        if (isNaN(qty) || qty <= 0) {
          e.quantity = 'Please enter a valid positive number.';
        } else if (form.quantityType === 'kg' && qty > 150) {
          e.quantity = 'Maximum quantity is 150 kg.';
        } else if (form.quantityType === 'items' && qty > 50) {
          e.quantity = 'Maximum number of items is 50.';
        }
      }
    }
    
    if (!form.pickupTime) e.pickupTime = 'Please select a preferred pickup time.';
    
    // Address validation
    if (!address.village) e.address = 'Village information is required.';
    
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
      
      // Build display quantity string
      let displayQuantity = '';
      if (form.quantityType === 'not-sure') {
        displayQuantity = 'Not sure';
      } else if (form.quantityType === 'kg') {
        displayQuantity = `${form.quantity} kg`;
      } else {
        displayQuantity = `${form.quantity} items`;
      }

      // Build address string
      const addressParts = [];
      if (address.houseNo) addressParts.push(address.houseNo);
      if (address.streetArea) addressParts.push(address.streetArea);
      if (address.village) addressParts.push(address.village);
      if (address.landmark) addressParts.push(`Near ${address.landmark}`);
      const pickupAddress = addressParts.join(', ');

      const res = await fetch(`${API}/api/scrap/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          scrapType: form.scrapType,
          quantity: displayQuantity,
          quantityType: form.quantityType,
          pickupTime: form.pickupTime,
          description: form.description,
          address: pickupAddress,
          addressDetails: address,
          image: imageFile ? `[image:${imageFile.name}]` : ''
        }),
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

  const handleClose = () => navigate(-1);

  const inp = `w-full rounded-sm border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dk('bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400')
  }`;
  const lbl    = `text-sm ${dk('text-slate-300', 'text-slate-700')}`;
  const errCls = 'text-xs text-red-400 mt-0.5';
  const card   = `rounded-sm border p-4 space-y-3 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`;
  const btnBase = `flex items-center justify-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-bold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`;

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
      <div className={`relative z-10 w-full sm:max-w-2xl rounded-sm sm:rounded-sm shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] ${dk('bg-black/90 border border-gray-800', 'bg-white')}`}>

        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${dk('border-slate-700', 'border-slate-100')}`}>
          <div className="flex items-center gap-2">
            <HiClipboardList className="h-5 w-5 text-green-500" />
            <span className={`font-bold text-sm sm:text-base ${dk('text-white', 'text-slate-900')}`}>Sell Scrap</span>
          </div>
          <button type="button" onClick={handleClose} className={`rounded-sm p-1.5 transition ${dk('text-slate-400 hover:bg-slate-700', 'text-slate-400 hover:bg-slate-100')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

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
              
              {/* Estimated Quantity with Type Dropdown */}
              <div>
                <label className={lbl}>Estimated Quantity</label>
                <div className="space-y-2">
                  <select
                    value={form.quantityType}
                    onChange={e => {
                      set('quantityType', e.target.value);
                      set('quantity', '');
                    }}
                    className={`${inp} mt-1`}
                  >
                    {QUANTITY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  
                  {form.quantityType !== 'not-sure' && (
                    <input
                      type="number"
                      min="0"
                      max={form.quantityType === 'kg' ? '150' : '50'}
                      step="0.1"
                      value={form.quantity}
                      onChange={e => {
                        const val = e.target.value;
                        // Prevent negative values
                        if (val === '' || parseFloat(val) >= 0) {
                          set('quantity', val);
                        }
                      }}
                      placeholder={form.quantityType === 'kg' ? 'Enter weight in kg (max 150)' : 'Enter number of items (max 50)'}
                      className={`${inp} mt-1`}
                    />
                  )}
                  
                  {form.quantityType === 'not-sure' && (
                    <p className="text-xs text-slate-500 italic">The collector will assess the quantity during pickup.</p>
                  )}
                </div>
                {errors.quantity && <p className={errCls}>{errors.quantity}</p>}
              </div>
            </div>

            <div>
              <label className={lbl}>Pickup Time Preference</label>
              <div className="flex gap-2 mt-1">
                {PICKUP_TIMES.map(t => (
                  <button key={t} type="button" onClick={() => set('pickupTime', t)}
                    className={`flex-1 py-2 rounded-sm border text-xs font-bold transition ${
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

          {/* Photo Upload Section */}
          <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-slate-400', 'text-slate-500')}`}>Photo (Optional)</p>
            {preview ? (
              <div className="flex items-center gap-3">
                <img src={preview} alt="preview" className="h-20 w-20 rounded-sm object-cover border" />
                <div className="flex-1">
                  <p className={`text-sm ${dk('text-slate-200', 'text-slate-700')}`}>{imageFile.name}</p>
                  <p className="text-xs text-slate-500">{(imageFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setPreview(''); }}
                  className={`p-2 rounded-sm transition ${dk('text-slate-400 hover:bg-slate-700', 'text-slate-400 hover:bg-slate-100')}`}
                >
                  <HiX className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Upload from Gallery */}
                <label className={`flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed cursor-pointer transition py-4 ${
                  dk('border-slate-600 hover:border-green-500 bg-slate-800/50', 'border-slate-300 hover:border-green-400 bg-white')
                }`}>
                  <HiOutlinePhotograph className={`h-6 w-6 ${dk('text-slate-500', 'text-slate-400')}`} />
                  <span className={`text-xs font-bold ${dk('text-slate-400', 'text-slate-500')}`}>Gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImage(e.target.files[0])}
                  />
                </label>
                
                {/* Take Photo (Camera) */}
                <label className={`flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed cursor-pointer transition py-4 ${
                  dk('border-slate-600 hover:border-green-500 bg-slate-800/50', 'border-slate-300 hover:border-green-400 bg-white')
                }`}>
                  <HiCamera className={`h-6 w-6 ${dk('text-slate-500', 'text-slate-400')}`} />
                  <span className={`text-xs font-bold ${dk('text-slate-400', 'text-slate-500')}`}>Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleImage(e.target.files[0])}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Pickup Location / Address Section */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-slate-400', 'text-slate-500')}`}>Pickup Location</p>
              <button
                type="button"
                onClick={() => navigate('/citizen/profile')}
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-sm transition ${
                  dk('bg-white/10 text-slate-300 hover:bg-white/20', 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }`}
              >
                <HiPencil className="h-3 w-3" />
                Edit Address
              </button>
            </div>

            {addressLoading ? (
              <div className="flex items-center gap-2 py-4">
                <div className="h-4 w-4 border-2 border-green-500 border-t-transparent animate-spin rounded-full" />
                <span className="text-xs text-slate-500">Loading address...</span>
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {/* Address Display */}
                <div className={`rounded-sm border p-3 ${dk('bg-slate-800/50 border-slate-700', 'bg-slate-50 border-slate-200')}`}>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {address.village && (
                      <div className="flex gap-2">
                        <span className={`text-xs font-bold uppercase ${dk('text-slate-500', 'text-slate-400')}`}>Village:</span>
                        <span className={dk('text-slate-200', 'text-slate-700')}>{address.village}</span>
                      </div>
                    )}
                    {address.houseNo && (
                      <div className="flex gap-2">
                        <span className={`text-xs font-bold uppercase ${dk('text-slate-500', 'text-slate-400')}`}>House No:</span>
                        <span className={dk('text-slate-200', 'text-slate-700')}>{address.houseNo}</span>
                      </div>
                    )}
                    {address.streetArea && (
                      <div className="flex gap-2">
                        <span className={`text-xs font-bold uppercase ${dk('text-slate-500', 'text-slate-400')}`}>Street/Area:</span>
                        <span className={dk('text-slate-200', 'text-slate-700')}>{address.streetArea}</span>
                      </div>
                    )}
                    {address.landmark && (
                      <div className="flex gap-2">
                        <span className={`text-xs font-bold uppercase ${dk('text-slate-500', 'text-slate-400')}`}>Landmark:</span>
                        <span className={dk('text-slate-200', 'text-slate-700')}>{address.landmark}</span>
                      </div>
                    )}
                    {address.addressType && (
                      <div className="flex gap-2">
                        <span className={`text-xs font-bold uppercase ${dk('text-slate-500', 'text-slate-400')}`}>Type:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold ${
                          dk('bg-green-900/30 text-green-400', 'bg-green-100 text-green-700')
                        }`}>
                          {address.addressType}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location indicator */}
                {address.village && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <HiLocationMarker className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Pickup will be at your registered {address.addressType?.toLowerCase() || 'address'}</span>
                  </div>
                )}
              </div>
            )}
            {errors.address && <p className={errCls}>{errors.address}</p>}
          </div>

          {errors.submit && (
            <div className="rounded-sm bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
              <HiExclamation className="h-5 w-5 shrink-0" />{errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
            <button type="button" onClick={handleClose}
              className={`w-full sm:w-auto flex-1 rounded-sm border px-4 py-2.5 text-sm transition ${
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