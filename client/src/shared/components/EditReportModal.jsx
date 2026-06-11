import { useState, useEffect } from 'react';
import { HiSave, HiPhotograph, HiLocationMarker, HiTrash, HiShieldExclamation } from 'react-icons/hi';
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
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High'];
const PRIORITY_OPTIONS = ['Normal', 'Urgent'];
const WASTE_SEEN_OPTIONS = ['Just Now', 'Few Hours Ago', 'Today', 'Yesterday', 'Multiple Days Ago'];
const LOCKED_STATUSES = ['In Progress', 'Resolved', 'Delayed', 'Clarification Expired'];

const canEditReport = (r) => r && !LOCKED_STATUSES.includes(r.status) && !r.assignedCollector && !r.collectorId;

const EditReportModal = ({ isOpen, onClose, report, onUpdated }) => {
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [regionValid, setRegionValid] = useState(null);

  const editable = canEditReport(report);
  const collectorAssigned = report?.assignedCollector || report?.collectorId;

  useEffect(() => {
    if (!isOpen || !report) return;
    setForm({
      wasteType: report.wasteType || '',
      description: report.description || '',
      quantity: report.quantity || '',
      severity: report.severity || '',
      priorityLevel: report.priorityLevel || '',
      wasteSeenAt: report.wasteSeenAt || '',
      landmark: report.landmark || '',
      landmarkType: report.landmarkType || '',
    });
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setError('');
    setLocation(report.location || null);
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
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.wasteType) { setError('Waste type is required.'); return; }
    if (!editable) { setError('This report can no longer be edited.'); return; }
    setLoading(true); setError('');

    try {
      const token = localStorage.getItem('token');
      let body;
      let headers = { Authorization: `Bearer ${token}` };
      const payload = {
        wasteType: form.wasteType,
        quantity: form.quantity,
        description: form.description,
        severity: form.severity || undefined,
        priorityLevel: form.priorityLevel || undefined,
        wasteSeenAt: form.wasteSeenAt || undefined,
        landmark: form.landmark || undefined,
        landmarkType: form.landmarkType || undefined,
      };
      if (removeImage) payload.image = '';
      if (location) payload.location = location;
      if (imageFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (k === 'location') fd.append(k, JSON.stringify(v));
          else fd.append(k, v);
        });
        fd.append('image', imageFile);
        body = fd;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(payload);
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

  const inp = `w-full rounded-lg border py-2.5 px-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-white/5 border-gray-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
  }`;
  const lbl = `text-xs font-medium mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Report" icon={HiSave} dark={dark} className="sm:max-w-lg">
      {report.isEdited && (
        <div className="px-3 sm:px-6 -mt-3 pb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-semibold">Edited</span>
        </div>
      )}

      {!editable ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="h-14 w-14 rounded-lg bg-orange-100 flex items-center justify-center">
            <HiShieldExclamation className="h-7 w-7 text-orange-500" />
          </div>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Editing No Longer Available</p>
          <p className={`text-xs max-w-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {collectorAssigned
              ? 'A collector has already accepted this report. Editing is locked to preserve workflow integrity.'
              : 'This report can no longer be edited.'}
          </p>
          <button onClick={onClose} className="mt-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold px-5 py-2 hover:bg-slate-200 transition">Close</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className={inp}>
                <option value="">Select severity</option>
                {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Priority</label>
              <select value={form.priorityLevel} onChange={e => set('priorityLevel', e.target.value)} className={inp}>
                <option value="">Select priority</option>
                {PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Waste Seen</label>
            <select value={form.wasteSeenAt} onChange={e => set('wasteSeenAt', e.target.value)} className={inp}>
              <option value="">Select when waste was seen</option>
              {WASTE_SEEN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Update Location</label>
            <div className={`rounded-lg border p-3 space-y-2 ${dark ? 'bg-white/5 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-green-600">Service Area: {report.village || 'Kundapura'}</p>
              <MapPicker onLocationSelect={handleLocationSelect} villageName={report.village} dark={dark} />
              {location && (
                <p className={`text-xs mt-1 leading-normal ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <HiLocationMarker className="inline mr-1 text-green-500" />
                  {location.displayAddress || location.address}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Landmark Type</label>
              <input type="text" value={form.landmarkType} onChange={e => set('landmarkType', e.target.value)}
                placeholder="e.g. School, Temple" className={inp} />
            </div>
            <div>
              <label className={lbl}>Landmark Name</label>
              <input type="text" value={form.landmark} onChange={e => set('landmark', e.target.value)}
                placeholder="e.g. St. Mary's Church" className={inp} />
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
            {(imagePreview || (report.image && !removeImage)) && (
              <div className="relative inline-block mt-2">
                <img src={imagePreview || report.image} alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition"
                  onClick={() => window.open(imagePreview || report.image, '_blank')} />
                <button type="button" onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-sm">
                  <HiTrash className="h-3 w-3" />
                </button>
              </div>
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
            <button type="submit" disabled={loading}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                loading ? 'bg-green-500' : 'bg-green-600 hover:bg-green-500'
              }`}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditReportModal;
