import { useState, useEffect, useRef } from 'react';
import { HiX, HiSave, HiClock, HiExclamation, HiPhotograph } from 'react-icons/hi';
import { API } from '../constants';
import { useTheme } from '../context/ThemeContext';

const WASTE_TYPES = [
  'Plastic Waste', 'Organic Waste', 'Food Waste', 'E-Waste',
  'Construction Waste', 'Medical Waste', 'Mixed Waste',
  'Glass Waste', 'Paper Waste', 'Sewage / Drainage', 'Dead Animal Waste',
];
const QUANTITY_OPTIONS = ['Small Cache', 'Medium Pile', 'Large Dump', 'Institutional / Bulk', 'Very Large / Hazardous'];

const calcRemaining = (createdAt) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const left = 10 * 60 * 1000 - elapsed;
  return left > 0 ? left : 0;
};

const formatCountdown = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const EditReportModal = ({ isOpen, onClose, report, onUpdated }) => {
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !report) return;
    const d = report.pickupTime ? new Date(report.pickupTime) : new Date();
    setForm({
      wasteType: report.wasteType || '',
      description: report.description || '',
      quantity: report.quantity || '',
      pickupDate: d.toISOString().split('T')[0],
      pickupTime: d.toTimeString().slice(0, 5),
    });
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setExpired(false);

    const rem = calcRemaining(report.createdAt);
    setRemaining(rem);
    if (rem <= 0) { setExpired(true); return; }

    timerRef.current = setInterval(() => {
      const r = calcRemaining(report.createdAt);
      setRemaining(r);
      if (r <= 0) { clearInterval(timerRef.current); setExpired(true); }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen, report]);

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
    if (expired) { setError('This report can no longer be edited.'); return; }
    setLoading(true); setError('');

    try {
      const token = localStorage.getItem('token');
      const pickupTime = form.pickupDate && form.pickupTime
        ? new Date(`${form.pickupDate}T${form.pickupTime}`).toISOString()
        : undefined;

      let body;
      let headers = { Authorization: `Bearer ${token}` };

      if (imageFile) {
        const fd = new FormData();
        fd.append('wasteType', form.wasteType);
        fd.append('quantity', form.quantity);
        fd.append('description', form.description);
        if (pickupTime) fd.append('pickupTime', pickupTime);
        fd.append('image', imageFile);
        body = fd;
      } else {
        body = { wasteType: form.wasteType, quantity: form.quantity, description: form.description };
        if (pickupTime) body.pickupTime = pickupTime;
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
      }

      const res = await fetch(`${API}/api/waste/report/${report._id}`, {
        method: 'PUT',
        headers,
        body,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Update failed.'); return; }
      onUpdated(data.report);
      onClose();
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (!isOpen || !report) return null;

  const canEdit = report.status === 'Submitted' && !expired;
  const inp = `w-full rounded-lg border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-white/5 border-gray-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
  }`;
  const lbl = `text-xs font-medium mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full sm:max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] ${dark ? 'bg-[#0B0F13] border border-gray-700' : 'bg-white'}`}>

        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${dark ? 'border-gray-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <HiSave className="h-5 w-5 text-green-500" />
            <span className={`font-semibold text-sm sm:text-base ${dark ? 'text-white' : 'text-slate-900'}`}>Edit Report</span>
            {report.isEdited && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-semibold">Edited</span>}
          </div>
          <div className="flex items-center gap-3">
            {!expired && remaining > 0 && (
              <span className={`flex items-center gap-1 text-xs font-semibold ${remaining < 60000 ? 'text-red-500' : 'text-green-500'}`}>
                <HiClock className="h-3.5 w-3.5" />
                {formatCountdown(remaining)}
              </span>
            )}
            <button type="button" onClick={onClose} className={`rounded-lg p-1.5 transition ${dark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {expired ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="h-14 w-14 rounded-lg bg-orange-100 flex items-center justify-center">
                <HiExclamation className="h-7 w-7 text-orange-500" />
              </div>
              <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>This report can no longer be edited.</p>
              <p className={`text-xs max-w-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                The 10-minute editing window has expired. If you need changes, please submit a new report.
              </p>
              <button onClick={onClose} className="mt-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold px-5 py-2 hover:bg-slate-200 transition">Close</button>
            </div>
          ) : !canEdit ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="h-14 w-14 rounded-lg bg-orange-100 flex items-center justify-center">
                <HiExclamation className="h-7 w-7 text-orange-500" />
              </div>
              <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Cannot Edit This Report</p>
              <p className={`text-xs max-w-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Report cannot be edited after processing started. Current status: <span className="font-semibold">{report.status}</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Pickup Date</label>
                  <input type="date" value={form.pickupDate} onChange={e => set('pickupDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Pickup Time</label>
                  <input type="time" value={form.pickupTime} onChange={e => set('pickupTime', e.target.value)} className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>Notes / Description (Optional)</label>
                <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Add any additional notes..." className={`${inp} resize-none`} />
              </div>

              <div>
                <label className={lbl}>Upload Image</label>
                <div className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition hover:border-green-500 ${dark ? 'border-gray-700' : 'border-slate-200'}`}
                  onClick={() => document.getElementById('edit-image-input')?.click()}>
                  <HiPhotograph className={`h-5 w-5 shrink-0 ${dark ? 'text-slate-400' : 'text-slate-400'}`} />
                  <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{imageFile ? imageFile.name : 'Tap to change image'}</span>
                </div>
                <input id="edit-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
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
                    loading ? 'bg-green-500' : 'bg-green-600 hover:bg-green-500'
                  }`}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditReportModal;
