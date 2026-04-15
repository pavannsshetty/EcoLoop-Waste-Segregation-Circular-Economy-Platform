import { useState, useEffect } from 'react';
import { HiX, HiSave, HiExclamation } from 'react-icons/hi';
import MapPicker from './MapPicker';
import { useTheme } from '../context/ThemeContext';

const WASTE_TYPES = ['Wet Waste', 'Dry Waste', 'E-Waste', 'Plastic Waste', 'Mixed Waste'];
const LANDMARKS   = ['School', 'Temple', 'Bus Stop', 'Hospital', 'Market', 'Park', 'Roadside', 'Residential Area', 'Other'];
const SEVERITY    = [
  { value: 'Low',    active: 'bg-green-500 text-white border-green-500',  base: 'bg-green-50 text-green-700 border-green-200'  },
  { value: 'Medium', active: 'bg-yellow-500 text-white border-yellow-500', base: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'High',   active: 'bg-red-500 text-white border-red-500',      base: 'bg-red-50 text-red-700 border-red-200'       },
];

const EditReportModal = ({ isOpen, onClose, report, onUpdated }) => {
  const { dark } = useTheme();
  const [form,     setForm]     = useState({});
  const [location, setLocation] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!report) return;
    const d = new Date(report.pickupTime);
    setForm({
      wasteType:    report.wasteType    || '',
      severity:     report.severity     || 'Medium',
      description:  report.description  || '',
      landmark:     report.landmark     || '',
      landmarkType: report.landmarkType || '',
      pickupDate:   d.toISOString().split('T')[0],
      pickupTime:   d.toTimeString().slice(0, 5),
    });
    setLocation(report.location || null);
    setError('');
  }, [report]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.wasteType || !form.description.trim()) { setError('Waste type and description are required.'); return; }
    setLoading(true); setError('');
    try {
      const token      = localStorage.getItem('token');
      const pickupTime = new Date(`${form.pickupDate}T${form.pickupTime}`).toISOString();
      const body = {
        wasteType:    form.wasteType,
        severity:     form.severity,
        description:  form.description,
        landmark:     form.landmark,
        landmarkType: form.landmarkType,
        pickupTime,
        location,
      };
      const res  = await fetch(`/api/waste/report/${report._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Update failed.'); return; }
      onUpdated(data.report);
      onClose();
    } catch { setError('Network error. Please try again.');
    } finally { setLoading(false); }
  };

  if (!isOpen || !report) return null;

  const canEdit = report.status === 'Submitted';
  const inp = `w-full rounded-none border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-white/5 border-gray-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
  }`;
  const lbl = `text-xs font-medium mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full sm:max-w-2xl rounded-none sm:rounded-none shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] ${dark ? 'bg-[#0B0F13] border border-gray-700' : 'bg-white'}`}>

        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${dark ? 'border-gray-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <HiSave className="h-5 w-5 text-green-500" />
            <span className={`font-semibold text-sm sm:text-base ${dark ? 'text-white' : 'text-slate-900'}`}>Edit Report</span>
            {report.isEdited && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Edited</span>}
          </div>
          <button type="button" onClick={onClose} className={`rounded-sm p-1.5 transition ${dark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!canEdit ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center">
                <HiExclamation className="h-7 w-7 text-orange-500" />
              </div>
              <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Cannot Edit This Report</p>
              <p className={`text-xs max-w-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Report cannot be edited after processing started. Current status: <span className="font-semibold">{report.status}</span>
              </p>
              <button onClick={onClose} className="mt-2 rounded-none bg-slate-100 text-slate-700 text-sm font-semibold px-5 py-2 hover:bg-slate-200 transition">Close</button>
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
                <label className={lbl}>Severity Level</label>
                <div className="flex gap-2 mt-1">
                  {SEVERITY.map(s => (
                    <button key={s.value} type="button" onClick={() => set('severity', s.value)}
                      className={`flex-1 rounded-none border py-2 text-xs font-semibold transition ${form.severity === s.value ? s.active : s.base}`}>
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={lbl}>Description</label>
                <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Describe the waste problem..." className={`${inp} resize-none`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Landmark Type</label>
                  <select value={form.landmarkType} onChange={e => set('landmarkType', e.target.value)} className={inp}>
                    <option value="">Select landmark</option>
                    {LANDMARKS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Landmark Name</label>
                  <input type="text" value={form.landmark} onChange={e => set('landmark', e.target.value)}
                    placeholder="e.g. Near St. Mary's School" className={inp} />
                </div>
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
                <label className={lbl}>Update Location (optional)</label>
                <MapPicker onLocationSelect={setLocation} dark={dark} />
              </div>

              {error && (
                <div className="rounded-none bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{error}</div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-2">
                <button type="button" onClick={onClose}
                  className={`flex-1 rounded-none border px-4 py-2.5 text-sm font-semibold transition ${dark ? 'border-gray-700 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-none bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
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
