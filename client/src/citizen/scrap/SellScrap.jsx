import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API } from '../../shared/constants';
import {
  HiX, HiLocationMarker, HiCamera,
  HiCheckCircle, HiExclamation, HiTruck, HiClipboardList,
  HiPencil, HiOutlinePhotograph
} from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';
import { getMapLayer } from '../../shared/utils/mapLayers';
import MapLayerSwitcher from '../../shared/components/MapLayerSwitcher';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    const [mapLayer, setMapLayer] = useState('osm');
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
  const [homeLat, setHomeLat] = useState(ctxUser?.latitude || null);
  const [homeLng, setHomeLng] = useState(ctxUser?.longitude || null);
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
          setHomeLat(ctxUser.latitude || null);
          setHomeLng(ctxUser.longitude || null);
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

      const addressDetails = { ...address };
      if (homeLat && homeLng) {
        addressDetails.lat = homeLat;
        addressDetails.lng = homeLng;
      }

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
          addressDetails,
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

  const inp = `w-full rounded-none border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dk('bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400')
  }`;
  const lbl    = `text-sm font-bold ${dk('text-slate-300', 'text-slate-700')}`;
  const errCls = 'text-xs text-red-500 mt-0.5';
  const card   = `rounded-none border p-4 space-y-3 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className={`w-full max-w-sm rounded-none shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center ${dk('bg-slate-900 border border-gray-800', 'bg-white')}`}>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={handleClose} />
      <div className={`relative z-10 w-full max-w-md sm:max-w-xl rounded-none shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] pointer-events-auto ${dk('bg-slate-900 border border-gray-800', 'bg-white')}`}>

        <div className={`flex items-center justify-between px-3 sm:px-6 py-3.5 border-b shrink-0 ${dk('border-slate-700', 'border-slate-100')}`}>
          <div className="flex items-center gap-2">
            <HiClipboardList className="h-5 w-5 text-green-500" />
            <span className={`font-bold text-lg sm:text-xl ${dk('text-white', 'text-slate-900')}`}>Sell Scrap</span>
          </div>
          <button type="button" onClick={handleClose} className={`rounded-none p-1.5 transition ${dk('text-slate-400 hover:bg-slate-700', 'text-slate-400 hover:bg-slate-100')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto">

          {/* Pickup Address - FIRST */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-slate-400', 'text-slate-500')}`}>Pickup Address</p>
              <button
                type="button"
                onClick={() => navigate('/citizen/profile')}
                className="text-[10px] font-bold text-green-600 hover:underline flex items-center gap-1"
              >
                <HiPencil className="h-3 w-3" /> EDIT ADDRESS
              </button>
            </div>

            {addressLoading ? (
              <div className="flex items-center gap-2 py-4">
                <div className="h-4 w-4 border-2 border-green-500 border-t-transparent animate-spin rounded-full" />
                <span className="text-xs text-slate-500">Loading address...</span>
              </div>
            ) : address.village || address.houseNo || address.streetArea ? (
              <div className={`p-4 rounded-none border border-dashed ${dk('bg-white/5 border-slate-700', 'bg-white border-slate-300')}`}>
                {address.addressType && (
                  <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-lg mb-1 uppercase tracking-wider dark:bg-[#0AAF29]/20 dark:text-[#0AAF29]">
                    {address.addressType}
                  </span>
                )}
                <p className={`text-sm font-bold ${dk('text-white', 'text-slate-900')}`}>
                  {address.houseNo && `${address.houseNo}, `}{address.streetArea}
                </p>
                <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{address.landmark && `${address.landmark}, `}{address.village} Village</p>
                <div className="flex items-center gap-2 mt-2">
                  {homeLat && homeLng ? (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${dk('bg-green-900/30 text-green-400', 'bg-green-50 text-green-700')}`}>
                      <HiCheckCircle className="h-3 w-3" /> GPS Verified
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${dk('bg-amber-900/30 text-amber-400', 'bg-amber-50 text-amber-700')}`}>
                      <HiExclamation className="h-3 w-3" /> No GPS
                    </span>
                  )}
                </div>
                {homeLat && homeLng && (
                  <div className={`mt-2 text-[10px] font-mono ${dk('text-slate-500', 'text-slate-400')}`}>
                    Lat: {homeLat.toFixed(6)} &middot; Lng: {homeLng.toFixed(6)}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-none bg-red-50 border border-red-200 text-center space-y-2.5">
                <div>
                  <p className="text-xs text-red-600 font-bold uppercase">No Address Found</p>
                  <p className="text-[10px] text-red-500 mt-1">Please update your address in profile before requesting scrap pickup.</p>
                </div>
                <button type="button" onClick={() => navigate('/citizen/profile')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-none bg-red-600 text-white hover:bg-red-500 transition active:scale-95">
                  Complete Address
                </button>
              </div>
            )}
            {errors.address && <p className={errCls}>{errors.address}</p>}

            {homeLat && homeLng && (
              <div className="relative w-full h-36 rounded-none overflow-hidden border border-slate-200 dark:border-slate-700">
                <MapContainer
                  key={`scrap-home-${homeLat}-${homeLng}`}
                  center={[homeLat, homeLng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  dragging={false}
                  zoomControl={false}
                  className="w-full h-full z-10"
                >
                  {(() => {
                    const currentLayer = getMapLayer(mapLayer);
                    return (
                      <TileLayer
                        key={`tile-${mapLayer}`}
                        attribution={currentLayer.attribution}
                        url={currentLayer.url}
                        maxZoom={currentLayer.maxZoom}
                        minZoom={currentLayer.minZoom}
                      />
                    );
                  })()}
                  <MapLayerSwitcher currentLayer={mapLayer} onLayerChange={setMapLayer} position="top-right" />
                  <Marker position={[homeLat, homeLng]} />
                </MapContainer>
              </div>
            )}
          </div>

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
                        if (val === '' || parseFloat(val) >= 0) {
                          set('quantity', val);
                        }
                      }}
                      placeholder={form.quantityType === 'kg' ? 'Enter weight in kg (max 150)' : 'Enter number of items (max 50)'}
                      className={`${inp} mt-1`}
                    />
                  )}
                  
                  {form.quantityType === 'not-sure' && (
                    <p className="text-xs text-slate-500 italic mt-1">The collector will assess the quantity during pickup.</p>
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
                    className={`flex-1 py-3 sm:py-2.5 rounded-none border text-xs font-bold transition ${
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
              <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Any specific instructions for the collector..."
                className={`${inp} mt-1 resize-none`} />
            </div>
          </div>

          {/* Photo Upload */}
          <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide ${dk('text-slate-400', 'text-slate-500')}`}>Photo (Optional)</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed cursor-pointer transition py-4 ${
                dk('border-slate-600 hover:border-green-500 bg-slate-800/50', 'border-slate-300 hover:border-green-400 bg-white')
              }`}>
                {preview
                  ? <img src={preview} alt="preview" className="h-24 w-auto rounded-none object-cover" />
                  : <><HiOutlinePhotograph className={`h-7 w-7 ${dk('text-slate-500', 'text-slate-400')}`} /><span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Upload from gallery</span></>
                }
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
              </label>
              <label className={`flex flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-6 py-4 transition cursor-pointer ${
                dk('border-slate-600 hover:border-green-500 text-slate-400 hover:text-green-400', 'border-slate-300 hover:border-green-400 text-slate-400 hover:text-green-600')
              }`}>
                <HiCamera className="h-7 w-7" /><span className="text-xs">Take Photo</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImage(e.target.files[0])} />
              </label>
            </div>
            {preview && (
              <button type="button" onClick={() => { setImageFile(null); setPreview(''); }}
                className={`text-xs font-bold ${dk('text-red-400 hover:text-red-300', 'text-red-600 hover:text-red-500')}`}>
                Remove photo
              </button>
            )}
          </div>

          {errors.submit && (
            <div className="rounded-none bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
              <HiExclamation className="h-5 w-5 shrink-0" />{errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
            <button type="button" onClick={handleClose}
              className={`w-full sm:w-auto flex-1 rounded-none border px-4 py-2.5 text-sm transition ${
                dk('border-slate-600 text-slate-300 hover:bg-slate-800', 'border-slate-300 text-slate-600 hover:bg-slate-50')
              }`}>
              Cancel
            </button>
            <button type="submit" disabled={loading || (!address.village && !address.houseNo && !address.streetArea)}
              className="w-full sm:w-auto flex-1 rounded-none bg-[#0AAF29] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0AAF29]/90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-center uppercase flex items-center justify-center gap-2">
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