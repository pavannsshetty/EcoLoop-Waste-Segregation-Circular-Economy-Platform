import { useState, useEffect, useRef } from 'react';
import { HiSave, HiPhotograph, HiLocationMarker, HiClock } from 'react-icons/hi';
import { API } from '../constants';
import { useTheme } from '../context/ThemeContext';
import MapPicker from './MapPicker';
import Modal from './Modal';

const WASTE_TYPES = [
  'Plastic Waste', 'Organic Waste', 'Food Waste', 'E-Waste',
  'Construction Waste', 'Medical Waste', 'Mixed Waste',
  'Glass Waste', 'Paper Waste', 'Sewage / Drainage', 'Dead Animal Waste',
];
const QUANTITY_OPTIONS = ['Small Cache', 'Medium Pile', 'Large Dump', 'Institutional / Bulk', 'Very Large / Hazardous'];

const calcRemaining = (expiresAt) => {
  const elapsed = Date.now() - new Date(expiresAt).getTime();
  return elapsed < 0 ? -elapsed : 0;
};

const formatCountdown = (ms) => {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const ClarificationResubmitModal = ({ isOpen, onClose, report, onUpdated }) => {
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [expired, setExpired] = useState(false);
  const [location, setLocation] = useState(null);
  const [regionValid, setRegionValid] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !report) return;
    setForm({
      wasteType: report.wasteType || '',
      description: report.description || '',
      quantity: report.quantity || '',
    });
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setExpired(false);
    setLocation(report.location || null);

    if (report.clarificationExpiresAt) {
      const rem = calcRemaining(report.clarificationExpiresAt);
      setRemaining(rem);
      if (rem <= 0) { setExpired(true); return; }
      timerRef.current = setInterval(() => {
        const r = calcRemaining(report.clarificationExpiresAt);
        setRemaining(r);
        if (r <= 0) { clearInterval(timerRef.current); setExpired(true); }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen, report]);

  const handleLocationSelect = (loc) => {
    if (!loc) {
      setLocation(null);
      setRegionValid(null);
    } else {
      setLocation(loc);
      setRegionValid(loc.regionValid !== false ? (loc.regionValid ?? null) : false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Only image files allowed.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.wasteType) { setError('Waste type is required.'); return; }
    if (expired) { setError('Clarification period has expired.'); return; }
    setLoading(true); setError('');

    try {
      const token = localStorage.getItem('token');
      let body;
      let headers = { Authorization: `Bearer ${token}` };

      if (imageFile) {
        const fd = new FormData();
        fd.append('wasteType', form.wasteType);
        fd.append('quantity', form.quantity);
        fd.append('description', form.description);
        fd.append('image', imageFile);
        if (location) fd.append('location', JSON.stringify(location));
        body = fd;
      } else {
        body = { wasteType: form.wasteType, quantity: form.quantity, description: form.description };
        if (location) body.location = location;
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
      }

      const res = await fetch(`${API}/api/waste/report/${report._id}/resubmit`, {
        method: 'PUT',
        headers,
        body,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Resubmit failed.'); return; }
      onUpdated(data.report);
      onClose();
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (!isOpen || !report) return null;

  const inp = `w-full rounded-lg border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
    dark ? 'bg-white/5 border-gray-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
  }`;
  const lbl = `text-xs font-medium mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  const headerExtra = !expired && remaining > 0 ? (
    <span className={`flex items-center gap-1 text-xs font-semibold ${remaining < 86400000 ? 'text-red-500' : 'text-purple-500'}`}>
      <HiClock className="h-3.5 w-3.5" />
      {formatCountdown(remaining)}
    </span>
  ) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resubmit Report" icon={HiSave} dark={dark} className="sm:max-w-lg">
      {headerExtra && (
        <div className="px-3 sm:px-6 -mt-3 pb-1">
          {headerExtra}
        </div>
      )}
          {report.clarificationRequests?.length > 0 && (
            <div className={`mb-4 rounded-lg border p-3 space-y-1.5 ${dk('bg-purple-900/10 border-purple-500/30', 'bg-purple-50 border-purple-200')}`}>
              <span className={`text-xs font-semibold ${dk('text-purple-300', 'text-purple-700')}`}>Clarification Requested</span>
              {report.clarificationRequests.map((cr, i) => (
                <p key={i} className={`text-xs ${dk('text-slate-300', 'text-slate-600')}`}>
                  <span className="font-semibold">Reason {i + 1}:</span> {cr.reason || 'N/A'}
                </p>
              ))}
            </div>
          )}

          {expired ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center">
                <HiClock className="h-7 w-7 text-gray-500" />
              </div>
              <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Clarification period has expired.</p>
              <p className={`text-xs max-w-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                The 7-day window to resubmit has passed. Please submit a new report.
              </p>
              <button onClick={onClose} className="mt-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold px-5 py-2 hover:bg-slate-200 transition">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className={lbl}>Waste Type</label>
                <select value={form.wasteType} onChange={e => set('wasteType', e.target.value)} className={inp}>
                  <option value="">Select waste type</option>
                  {WASTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>Quantity</label>
                <select value={form.quantity} onChange={e => set('quantity', e.target.value)} className={inp}>
                  <option value="">Select quantity</option>
                  {QUANTITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>Update Location</label>
                <div className={`rounded-lg border p-3 space-y-2 ${dark ? 'bg-white/5 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-purple-500">Service Area: {report.village}, Kundapura Taluk</p>
                  <MapPicker onLocationSelect={handleLocationSelect} villageName={report.village} dark={dark} />
                  {location && (
                    <p className={`text-xs mt-1 leading-normal ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <HiLocationMarker className="inline mr-1 text-purple-500" />
                      {location.displayAddress || location.address}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className={lbl}>Notes / Description (Optional)</label>
                <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Add any additional notes..." className={`${inp} resize-none`} />
              </div>

              <div>
                <label className={lbl}>Upload Image</label>
                <div className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition hover:border-purple-500 ${dark ? 'border-gray-700' : 'border-slate-200'}`}
                  onClick={() => document.getElementById('resubmit-image-input')?.click()}>
                  <HiPhotograph className={`h-5 w-5 shrink-0 ${dark ? 'text-slate-400' : 'text-slate-400'}`} />
                  <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{imageFile ? imageFile.name : 'Tap to change image'}</span>
                </div>
                <input id="resubmit-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {(imagePreview || report.image) && (
                  <img src={imagePreview || report.image} alt="Preview"
                    className="mt-2 h-20 w-20 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition"
                    onClick={() => window.open(imagePreview || report.image, '_blank')} />
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{error}</div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
                <button type="button" onClick={onClose}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${dark ? 'border-gray-700 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || expired}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                    loading ? 'bg-purple-500' : 'bg-purple-600 hover:bg-purple-500'
                  }`}>
                  {loading ? 'Resubmitting...' : 'Resubmit Report'}
                </button>
              </div>
            </form>
          )}
    </Modal>
  );
};

export default ClarificationResubmitModal;
