import { useState, useEffect, useRef, useCallback } from 'react';
import { HiRefresh, HiEye, HiEyeOff, HiCheckCircle, HiChevronDown, HiExclamation, HiCamera } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import ModalOverlay from '../components/ModalOverlay';
import { useSocket } from '../context/SocketContext';

const VILLAGES = [
  'Ajri','Albadi','Aloor','Amasebail','Ampar','Anagalli','Asodu','Badakere','Balkur','Basrur',
  'Beejadi','Bellal','Beloor','Belve','Bijoor','Byndoor','Chittoor','Devalkunda','Edmoge',
  'Gangolli','Golihole','Gopadi','Gujjadi','Gulvadi','Hadavu','Hekladi','Halady',
  'Hallady - Harkadi','Hallihole','Halnad','Hangaloor','Harady','Hardally - Mandally',
  'Harkoor','Hattiangadi','Hemmadi','Hengavalli','Heranjal','Heroor','Heskathoor',
  'Hombady - Mandadi','Hosadu','Hosangadi','Hosoor','Idurkunhadi','Jadkal','Japthi',
  'Kalavara','Kalthodu','Kamalashile','Kambadakone','Kandavara','Kanyana','Karkunje',
  'Kattabelthoor','Kavrady','Kedoor','Kenchanoor','Keradi','Kergal','Kirimanjeshwar',
  'Kodladi','Kollur','Koni','Korgi','Kulanje','Kumbashi','Kundabarandadi','Machattu',
  'Madammakki','Maravanthe','Molahalli','Mudoor','Nada','Nandanavana','Navunda','Noojadi',
  'Paduvari','Rattadi','Senapur','Shankaranarayana','Shedimane','Shiroor','Siddapur',
  'Tallur','Thagarasi','Thekkatte','Trashi','Ulloor','Ulthoor','Uppinakudru','Uppunda',
  'Vakwadi','Vandse','Yedthare','Yedyadi - Mathyadi','Yeljith',
].sort((a, b) => a.localeCompare(b));

const INIT = {
  name: '', teamLeader: '', mobile: '', email: '',
  city: '', area: '', ward: '', villages: [],
  collectorId: '', password: '', status: 'Active',
  collectorType: 'Individual', teamSize: 2,
  vehicleType: 'Bike', vehicleNumber: '', workingShift: ['Morning'],
  photo: '',
};

const Field = ({ label, required, labelClass, error, children }) => (
  <div>
    <label className={`text-xs font-medium mb-1 block ${labelClass}`}>
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

const RadioGroup = ({ options, value, onChange, dark }) => (
  <div className="flex flex-wrap gap-3 mt-1">
    {options.map((opt) => (
      <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
        <input type="radio" value={opt} checked={value === opt} onChange={() => onChange(opt)} className="accent-green-500 w-4 h-4" />
        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{opt}</span>
      </label>
    ))}
  </div>
);

const VillageMultiSelect = ({ selected, onChange, error, inp, dark, dk, assignedMap, conflictingSelected }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const MAX = 5;

  const filtered = VILLAGES.filter(v =>
    v.toLowerCase().includes(query.toLowerCase()) && !selected.includes(v)
  );

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (v) => {
    if (selected.length >= MAX) return;
    if (assignedMap.has(v)) return;
    onChange([...selected, v]);
    setQuery('');
  };

  const remove = (v) => onChange(selected.filter(s => s !== v));

  const isAssigned = (v) => assignedMap.has(v);
  const getAssignedInfo = (v) => assignedMap.get(v);

  return (
    <div ref={ref} className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(v => {
            const hasConflict = assignedMap.has(v);
            return (
              <span key={v} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                hasConflict
                  ? dk('bg-red-900/50 text-red-300 border-red-700', 'bg-red-50 text-red-700 border-red-200')
                  : dk('bg-green-900/50 text-green-300 border-green-700', 'bg-green-50 text-green-700 border-green-200')
              }`}>
                <span className="flex items-center gap-1">
                  {v}
                  {hasConflict && <span title={getAssignedInfo(v)?.collectorName} className="text-[10px] opacity-75">(taken)</span>}
                </span>
                <button type="button" onClick={() => remove(v)} className="ml-0.5 hover:text-red-400 transition" aria-label={`Remove ${v}`}>
                  x
                </button>
              </span>
            );
          })}
        </div>
      )}

      {selected.length < MAX && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            placeholder={selected.length === 0 ? 'Search and select villages...' : 'Add another village...'}
            className={`${inp} pr-9`}
            autoComplete="off"
          />
          <HiChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-transform ${open ? 'rotate-180' : ''} ${dk('text-slate-500', 'text-slate-400')}`} />
        </div>
      )}

      {open && selected.length < MAX && (
        <ul className={`w-full max-h-48 overflow-y-auto rounded-lg border shadow-lg text-sm ${dk('bg-slate-800 border-slate-700 text-slate-100', 'bg-white border-slate-200 text-slate-800')}`}>
          {filtered.length === 0
            ? <li className={`px-4 py-2.5 ${dk('text-slate-500', 'text-slate-400')}`}>No villages found</li>
            : filtered.map(v => {
                const assigned = isAssigned(v);
                const info = getAssignedInfo(v);
                return (
                  <li key={v}
                    onMouseDown={assigned ? undefined : () => add(v)}
                    className={`px-4 py-2.5 flex items-center justify-between gap-2 transition ${
                      assigned
                        ? dk('text-slate-600 cursor-not-allowed bg-slate-800/50', 'text-slate-400 cursor-not-allowed bg-slate-50')
                        : `cursor-pointer ${dk('hover:bg-slate-700', 'hover:bg-slate-50')}`
                    }`}
                  >
                    <span>{v}</span>
                    {assigned && (
                      <span className={`text-[10px] shrink-0 truncate max-w-[180px] ${dk('text-amber-500', 'text-amber-700')}`}>
                        {info?.collectorName} ({info?.collectorId})
                      </span>
                    )}
                  </li>
                );
              })
          }
        </ul>
      )}

      <p className={`text-xs ${selected.length >= MAX ? 'text-amber-500' : dk('text-slate-500', 'text-slate-400')}`}>
        {selected.length}/{MAX} villages selected{selected.length >= MAX ? ' - maximum reached' : ''}
        {conflictingSelected > 0 && <span className="text-red-500 ml-2">{conflictingSelected} conflict(s) - remove to proceed</span>}
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

const ReassignModal = ({ conflicts, onConfirm, onCancel, dk }) => (
    <ModalOverlay onClose={onCancel} className="flex items-center justify-center p-4">
      <div className={`w-full max-w-[95vw] sm:max-w-sm rounded-lg border p-6 space-y-4 shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
          <HiExclamation className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${dk('text-slate-100', 'text-slate-800')}`}>Village Conflict</p>
          <p className={`text-xs mt-1 mb-2 ${dk('text-slate-400', 'text-slate-500')}`}>
            The following villages are already assigned to active collectors:
          </p>
          <ul className="space-y-1">
            {conflicts.map(c => (
              <li key={c.village} className={`text-xs rounded-lg px-3 py-1.5 ${dk('bg-slate-800 text-slate-300', 'bg-slate-50 text-slate-700')}`}>
                <span className="font-medium text-amber-500">{c.village}</span>
                {' '}{c.collectorName} ({c.collectorId})
              </li>
            ))}
          </ul>
          <p className={`text-xs mt-2 ${dk('text-slate-400', 'text-slate-500')}`}>
            Reassigning will remove these villages from their current collectors.
          </p>
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 rounded-lg bg-amber-500 text-white py-2.5 text-sm font-semibold hover:bg-amber-400 transition">
          Reassign All
        </button>
      </div>
    </div>
  </ModalOverlay>
);

const AddCollector = () => {
  const { dark } = useTheme();
  const { socket } = useSocket();
  const dk = (d, l) => (dark ? d : l);
  const [form, setForm] = useState(INIT);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [reassignData, setReassignData] = useState(null);

  const handlePhotoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setErrors({ submit: 'File too large (max 2MB).' }); return; }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) { setErrors({ submit: 'Only JPG/PNG allowed.' }); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setErrors((e) => ({ ...e, submit: '' }));
  };
  const [assignedVillages, setAssignedVillages] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const labelClass = dk('text-slate-400', 'text-slate-600');
  const inp = dk(
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition',
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition shadow-sm'
  );
  const card = dk('bg-white/5 rounded-lg border border-gray-700 p-5 space-y-4', 'bg-white rounded-lg border border-slate-100 p-5 space-y-4 shadow-sm');
  const sectionTitle = dk('text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1', 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1');
  const btnOutline = dk('px-3 rounded-lg border border-slate-700 text-slate-400 hover:text-green-400 hover:border-green-600 transition', 'px-3 rounded-lg border border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-400 transition');

  const assignedMap = new Map();
  assignedVillages.forEach((av) => {
    if (!assignedMap.has(av.village)) {
      assignedMap.set(av.village, { collectorName: av.collectorName, collectorId: av.collectorId });
    }
  });

  const conflictingVillages = form.villages.filter(v => assignedMap.has(v));
  const hasConflicts = conflictingVillages.length > 0;

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const fetchAssignedVillages = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/assigned-villages', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      if (res.ok) { const d = await res.json(); setAssignedVillages(d.assignedVillages || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchNextId(); fetchAssignedVillages(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchAssignedVillages();
    socket.on('collector_updated', refresh);
    return () => { socket.off('collector_updated', refresh); };
  }, [socket, fetchAssignedVillages]);

  const fetchNextId = async () => {
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/next-collector-id', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      if (res.ok) { const d = await res.json(); set('collectorId', d.collectorId); }
    } catch { /* ignore */ }
  };

  const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

  const checkField = async (field, value) => {
    if (!value) { setFieldErrors((e) => ({ ...e, [field]: '' })); return; }
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ field, value }),
      });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      if (res.ok) {
        const d = await res.json();
        if (d.duplicate) {
          setFieldErrors((e) => ({ ...e, [field]: d.message }));
        } else {
          setFieldErrors((e) => ({ ...e, [field]: '' }));
        }
      }
    } catch {}
  };

  const debouncedCheck = useCallback(
    debounce((field, value) => checkField(field, value), 500),
    []
  );

  const handleBlurCheck = (field, value) => {
    debouncedCheck(field, value);
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Name is required.';
    if (!form.teamLeader) e.teamLeader = 'Team Leader Name is required.';
    if (!form.mobile || !/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format.';
    if (!form.villages || form.villages.length === 0) e.villages = 'At least one village is required.';
    if (form.villages && form.villages.length > 5) e.villages = 'You can assign up to 5 villages only.';
    if (!form.vehicleNumber) e.vehicleNumber = 'Vehicle Number is required.';
    if (!form.workingShift || form.workingShift.length === 0) e.workingShift = 'At least one working shift must be selected.';
    if (!form.password) e.password = 'Password is required.';
    if (hasConflicts) e.villages = `Remove conflicting villages: ${conflictingVillages.join(', ')}`;
    return e;
  };

  const submitToServer = async (forceReassign = false) => {
    setLoading(true);
    setSuccess('');
    try {
      const token = localStorage.getItem('admin-token');
      let photoUrl = form.photo;
      if (photoFile) {
        setUploadingPhoto(true);
        const fd = new FormData();
        fd.append('photo', photoFile);
        const photoRes = await fetch('/api/admin/collector/photo', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (photoRes.status === 401) {
          localStorage.removeItem('admin-token');
          localStorage.removeItem('admin-user');
          window.location.href = '/admin/login';
          return;
        }
        if (photoRes.ok) { const pd = await photoRes.json(); photoUrl = pd.photoUrl; }
        else { const pe = await photoRes.json(); setErrors({ submit: pe.message || 'Photo upload failed.' }); setLoading(false); setUploadingPhoto(false); return; }
        setUploadingPhoto(false);
      }
      const res = await fetch('/api/admin/add-collector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, photo: photoUrl, forceReassign }),
      });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.conflict) { setReassignData(data.conflicts); return; }
        setErrors({ submit: data.message || 'Failed to add collector.' });
        return;
      }
      setSuccess('Collector added successfully!');
      setForm(INIT); setErrors({}); setFieldErrors({});
      setPhotoPreview(null); setPhotoFile(null);
      await fetchNextId(); await fetchAssignedVillages();
    } catch {
      setErrors({ submit: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await submitToServer(false);
  };

  const handleReset = () => { setForm(INIT); setErrors({}); setFieldErrors({}); setSuccess(''); setPhotoPreview(null); setPhotoFile(null); fetchNextId(); };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5">
      {reassignData && (
        <ReassignModal
          conflicts={reassignData}
          onConfirm={async () => { setReassignData(null); await submitToServer(true); }}
          onCancel={() => setReassignData(null)}
          dk={dk}
        />
      )}

      <div>
        <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200', 'text-slate-800')}`}>Add Collector</h1>
        <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Create a new waste collector account</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-100 border border-green-200 px-4 py-3 text-sm text-green-800">
          <HiCheckCircle className="h-5 w-5 shrink-0" /> {success}
        </div>
      )}
        {errors.submit && (
          <div className="rounded-lg bg-red-100 border border-red-200 px-4 py-3 text-sm text-red-800">{errors.submit}</div>
        )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className={card}>
          <p className={sectionTitle}>Profile Photo</p>
          <div className="flex items-center gap-4">
            <div className={`h-20 w-20 rounded-lg overflow-hidden border-2 flex items-center justify-center ${dk('border-slate-700 bg-slate-800', 'border-slate-200 bg-slate-50')}`}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <HiCamera className={`h-8 w-8 ${dk('text-slate-600', 'text-slate-300')}`} />
              )}
            </div>
            <div>
              <label className={`cursor-pointer inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                <HiCamera className="h-4 w-4" /> {photoPreview ? 'Change Photo' : 'Upload Photo'}
                <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={handlePhotoChange} />
              </label>
              <p className={`text-[11px] mt-1 ${dk('text-slate-500', 'text-slate-400')}`}>JPG, PNG up to 2MB</p>
            </div>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Basic Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Collector / Team Name" required labelClass={labelClass} error={errors.name || fieldErrors.name}>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => handleBlurCheck('name', form.name)} placeholder="e.g. Green Team A" className={inp} />
            </Field>
            <Field label="Team Leader Name" required labelClass={labelClass} error={errors.teamLeader}>
              <input type="text" value={form.teamLeader} onChange={(e) => set('teamLeader', e.target.value)} placeholder="e.g. Ramesh Hegde" className={inp} />
            </Field>
            <Field label="Mobile Number" required labelClass={labelClass} error={errors.mobile || fieldErrors.mobile}>
              <input type="tel" value={form.mobile} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={() => handleBlurCheck('mobile', form.mobile)} placeholder="10-digit number" className={inp} maxLength={10} />
            </Field>
            <Field label="Email" labelClass={labelClass} error={errors.email || fieldErrors.email}>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} onBlur={() => handleBlurCheck('email', form.email)} placeholder="Optional" className={inp} autoComplete="new-email" />
            </Field>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Collector Type</p>
          <Field label="Collector Type" required labelClass={labelClass}>
            <RadioGroup options={['Individual', 'Team']} value={form.collectorType} onChange={(v) => set('collectorType', v)} dark={dark} />
          </Field>
          {form.collectorType === 'Team' && (
            <Field label="Team Size (1-5)" required labelClass={labelClass}>
              <input type="number" min={1} max={5} value={form.teamSize} onChange={(e) => set('teamSize', Math.min(5, Math.max(1, Number(e.target.value))))} className={`${inp} w-28`} />
            </Field>
          )}
        </div>

        <div className={card}>
          <p className={sectionTitle}>Service Area</p>
          <Field label="Village Assignment" required labelClass={labelClass}>
            <VillageMultiSelect
              selected={form.villages}
              onChange={(v) => set('villages', v)}
              error={errors.villages}
              inp={inp} dark={dark} dk={dk}
              assignedMap={assignedMap}
              conflictingSelected={conflictingVillages.length}
            />
          </Field>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Work Details</p>
          <div className="space-y-4">
            <Field label="Vehicle Type" required labelClass={labelClass}>
              <RadioGroup options={['Bike', 'Auto', 'Truck']} value={form.vehicleType} onChange={(v) => set('vehicleType', v)} dark={dark} />
            </Field>
            <Field label="Vehicle Number" required labelClass={labelClass} error={errors.vehicleNumber || fieldErrors.vehicleNumber}>
              <input type="text" value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())} onBlur={() => handleBlurCheck('vehicleNumber', form.vehicleNumber)} placeholder="e.g. KA13AB1234" className={`${inp} sm:w-64`} />
            </Field>
            <Field label="Working Shift" required labelClass={labelClass} error={errors.workingShift}>
              <div className="flex flex-wrap gap-4 mt-1">
                {['Morning', 'Afternoon', 'Evening'].map((shift) => (
                  <label key={shift} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      value={shift}
                      checked={form.workingShift.includes(shift)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newShifts = checked
                          ? [...form.workingShift, shift]
                          : form.workingShift.filter(s => s !== shift);
                        set('workingShift', newShifts);
                      }}
                      className="accent-green-500 rounded w-4 h-4"
                    />
                    <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{shift}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Account Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Collector ID (Auto)" labelClass={labelClass}>
              <div className="flex gap-2">
                <input type="text" value={form.collectorId} readOnly className={`${inp} flex-1 opacity-70 cursor-not-allowed`} />
                <button type="button" onClick={fetchNextId} className={btnOutline} title="Refresh ID"><HiRefresh className="h-4 w-4" /></button>
              </div>
            </Field>
            <Field label="Password" required labelClass={labelClass} error={errors.password}>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Set password" className={`${inp} pr-10`} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${dk('text-slate-500 hover:text-slate-300', 'text-slate-400 hover:text-slate-600')}`}>
                  {showPwd ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={handleReset} className={`w-full sm:w-32 rounded-lg border py-3 text-sm font-medium transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
            Reset
          </button>
          <button type="submit" disabled={loading || hasConflicts} className={`w-full sm:w-auto rounded-lg px-5 sm:px-6 text-white py-3 text-sm font-semibold transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${hasConflicts ? 'bg-red-500 hover:bg-red-400' : 'bg-green-600 hover:bg-green-500'}`}>
            {loading ? 'Creating...' : hasConflicts ? 'Remove Conflicts First' : 'Create Collector'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCollector;