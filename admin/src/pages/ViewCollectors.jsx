import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiCheckCircle,
  HiChevronDown,
  HiExclamation,
  HiEye,
  HiPencil,
  HiSearch,
  HiTrash,
  HiUserAdd,
  HiX,
  HiCamera,
} from 'react-icons/hi';
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

const INIT_EDIT = {
  name: '',
  teamLeader: '',
  mobile: '',
  email: '',
  villages: [],
  password: '',
  status: 'Active',
  collectorType: 'Individual',
  teamSize: 1,
  vehicleType: 'Bike',
  vehicleNumber: '',
  workingShift: ['Morning'],
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

const VillageMultiSelect = ({ selected, onChange, error, inp, dk, assignedMap, conflictingSelected }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const max = 5;
  const filtered = VILLAGES.filter((v) => v.toLowerCase().includes(query.toLowerCase()) && !selected.includes(v));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (v) => {
    if (selected.length >= max) return;
    if (assignedMap?.has(v)) return;
    onChange([...selected, v]);
    setQuery('');
  };

  const isAssigned = (v) => assignedMap?.has(v);
  const getAssignedInfo = (v) => assignedMap?.get(v);

  return (
    <div ref={ref} className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => {
            const hasConflict = assignedMap?.has(v);
            return (
              <span key={v} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                hasConflict
                  ? dk('bg-red-900/50 text-red-300 border-red-700', 'bg-red-50 text-red-700 border-red-200')
                  : dk('bg-green-900/50 text-green-300 border-green-700', 'bg-green-50 text-green-700 border-green-200')
              }`}>
                <span className="flex items-center gap-1">
                  {v}
                  {hasConflict && <span className="text-[10px] opacity-75">(taken)</span>}
                </span>
                <button type="button" onClick={() => onChange(selected.filter((s) => s !== v))} className="hover:text-red-400" aria-label={`Remove ${v}`}>
                  <HiX className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {selected.length < max && (
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
          <HiChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${open ? 'rotate-180' : ''} ${dk('text-slate-500', 'text-slate-400')}`} />
        </div>
      )}
      {open && selected.length < max && (
        <ul className={`w-full max-h-44 overflow-y-auto rounded-lg border shadow-lg text-sm ${dk('bg-slate-800 border-slate-700 text-slate-100', 'bg-white border-slate-200 text-slate-800')}`}>
          {filtered.length === 0 ? (
            <li className={`px-4 py-2.5 ${dk('text-slate-500', 'text-slate-400')}`}>No villages found</li>
          ) : filtered.map((v) => {
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
          })}
        </ul>
      )}
      <p className={`text-xs ${selected.length >= max ? 'text-amber-500' : dk('text-slate-500', 'text-slate-400')}`}>
        {selected.length}/{max} villages selected{selected.length >= max ? ' - maximum reached' : ''}
        {conflictingSelected > 0 && <span className="text-red-500 ml-2">{conflictingSelected} conflict(s) - remove to proceed</span>}
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

const ModalShell = ({ title, children, onClose, dk, width = 'max-w-3xl' }) => (
  <ModalOverlay onClose={onClose} className="flex items-center justify-center p-4">
    <div className={`w-full max-w-[95vw] ${width} max-h-[90vh] overflow-hidden rounded-lg border shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
      <div className={`flex items-center justify-between px-5 py-4 border-b ${dk('border-slate-800', 'border-slate-100')}`}>
        <h2 className={`text-base font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{title}</h2>
        <button type="button" onClick={onClose} className={`p-1.5 rounded-lg ${dk('text-slate-400 hover:bg-slate-800', 'text-slate-500 hover:bg-slate-100')}`} aria-label="Close">
          <HiX className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[calc(90vh-65px)] overflow-y-auto p-5">{children}</div>
    </div>
  </ModalOverlay>
);

const Detail = ({ label, value, dk }) => (
  <div>
    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>{label}</p>
    <p className={`mt-1 text-sm break-words ${dk('text-slate-200', 'text-slate-700')}`}>{value || '-'}</p>
  </div>
);

const ReassignModal = ({ conflicts, onConfirm, onCancel, dk }) => (
  <ModalShell title="Village Conflict" onClose={onCancel} dk={dk} width="max-w-md">
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <HiExclamation className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className={`text-sm ${dk('text-slate-300', 'text-slate-600')}`}>These villages are already assigned to active collectors.</p>
          <ul className="mt-3 space-y-1.5">
            {conflicts.map((c) => (
              <li key={c.village} className={`text-xs rounded-lg px-3 py-2 ${dk('bg-slate-800 text-slate-300', 'bg-slate-50 text-slate-700')}`}>
                <span className="font-semibold text-amber-500">{c.village}</span> - {c.name} ({c.collectorId})
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex gap-3">
          <button type="button" onClick={onCancel} className={`flex-1 rounded-lg border py-2.5 text-sm font-medium ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>Cancel</button>
        <button type="button" onClick={onConfirm} className="flex-1 rounded-lg bg-amber-500 text-white py-2.5 text-sm font-semibold hover:bg-amber-400">Reassign</button>
      </div>
    </div>
  </ModalShell>
);

const ViewCollectors = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(INIT_EDIT);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [reassignData, setReassignData] = useState(null);
  const [assignedVillages, setAssignedVillages] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const assignedMap = new Map();
  assignedVillages.forEach((av) => {
    if (!assignedMap.has(av.village)) {
      assignedMap.set(av.village, { collectorName: av.collectorName, collectorId: av.collectorId });
    }
  });

  const conflictingVillages = editing ? (form.villages || []).filter(v => assignedMap.has(v) && !editing.villages?.includes(v)) : [];
  const hasConflicts = conflictingVillages.length > 0;

  const filteredCollectors = useMemo(() => {
    if (!search.trim()) return collectors;
    const q = search.toLowerCase();
    return collectors.filter((c) =>
      [c.name, c.collectorId, c.mobile, c.teamLeader, c.email]
        .concat(c.villages || [])
        .some((f) => f?.toLowerCase().includes(q))
    );
  }, [collectors, search]);

  const labelClass = dk('text-slate-400', 'text-slate-600');
  const inp = dk(
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500',
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm'
  );
  const section = dk('rounded-lg border border-slate-800 p-4 space-y-4', 'rounded-lg border border-slate-100 p-4 space-y-4');
  const sectionTitle = dk('text-xs font-semibold text-slate-500 uppercase tracking-wider', 'text-xs font-semibold text-slate-400 uppercase tracking-wider');

  const fetchCollectors = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load collectors.');
      setCollectors(data.collectors || []);
    } catch (err) {
      setError(err.message || 'Failed to load collectors.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchCollectors(true);
    fetchAssignedVillages();
  }, [fetchCollectors, fetchAssignedVillages]);

  useEffect(() => {
    if (!socket) return undefined;
    const sync = () => { fetchCollectors(false); fetchAssignedVillages(); };
    socket.on('collector_updated', sync);
    socket.on('report_created', sync);
    socket.on('reports_updated', sync);
    return () => {
      socket.off('collector_updated', sync);
      socket.off('report_created', sync);
      socket.off('reports_updated', sync);
    };
  }, [socket, fetchCollectors, fetchAssignedVillages]);

  useEffect(() => {
    const onFocus = () => fetchCollectors(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCollectors]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const openEdit = (collector) => {
    setEditing(collector);
    setSuccess('');
    setError('');
    setErrors({});
    setForm({
      ...INIT_EDIT,
      name: collector.name || '',
      teamLeader: collector.teamLeader || '',
      mobile: collector.mobile || '',
      email: collector.email || '',
      villages: collector.villages?.length ? collector.villages : collector.village ? [collector.village] : [],
      password: '',
      status: collector.status || 'Active',
      collectorType: collector.collectorType || 'Individual',
      teamSize: collector.teamSize || 1,
      vehicleType: collector.vehicleType || 'Bike',
      vehicleNumber: collector.vehicleNumber || '',
      workingShift: collector.workingShift?.length ? collector.workingShift : ['Morning'],
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Name is required.';
    if (!form.teamLeader) e.teamLeader = 'Team Leader Name is required.';
    if (!form.mobile || !/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format.';
    if (!form.villages.length) e.villages = 'At least one village is required.';
    if (form.villages.length > 5) e.villages = 'You can assign up to 5 villages only.';
    if (!form.vehicleNumber) e.vehicleNumber = 'Vehicle Number is required.';
    if (!form.workingShift.length) e.workingShift = 'At least one working shift must be selected.';
    if (form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6}$/.test(form.password)) {
      e.password = 'Password must be exactly 6 characters with uppercase, lowercase, and number.';
    }
    return e;
  };

  const handlePhotoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setError('File too large (max 2MB).'); return; }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) { setError('Only JPG/PNG allowed.'); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submitEdit = async (forceReassign = false) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('admin-token');
      let photoUrl = form.photo || editing.photo || '';
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
        setUploadingPhoto(false);
      }
      const res = await fetch(`/api/admin/collector/${editing._id}`, {
        method: 'PUT',
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
        if (data.conflict) {
          setReassignData(data.conflicts || []);
          return;
        }
        throw new Error(data.message || 'Failed to update collector.');
      }
      setEditing(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      setSuccess('Collector updated successfully.');
      await fetchCollectors(false);
    } catch (err) {
      setError(err.message || 'Failed to update collector.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    await submitEdit(false);
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`/api/admin/collector/${deleting._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete collector.');
      setDeleting(null);
      setSuccess('Collector deleted successfully.');
      await fetchCollectors(false);
    } catch (err) {
      setError(err.message || 'Failed to delete collector.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) => value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {reassignData && (
        <ReassignModal
          conflicts={reassignData}
          dk={dk}
          onCancel={() => setReassignData(null)}
          onConfirm={async () => { setReassignData(null); await submitEdit(true); }}
        />
      )}

      {viewing && (
        <ModalShell title="Collector Details" onClose={() => setViewing(null)} dk={dk} width="max-w-lg">
          <div className="flex items-center gap-4 mb-5 pb-4 border-b">
            <div className={`h-20 w-20 rounded-lg overflow-hidden border-2 flex items-center justify-center shrink-0 ${dk('border-slate-700 bg-slate-800', 'border-slate-200 bg-slate-50')}`}>
              {viewing.photo ? (
                <img src={viewing.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className={`text-2xl font-bold ${dk('text-slate-600', 'text-slate-400')}`}>{(viewing.name || 'C')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-base font-bold truncate ${dk('text-slate-100', 'text-slate-800')}`}>{viewing.name}</p>
              <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>{viewing.collectorId} - {viewing.collectorType}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Detail label="Collector ID" value={viewing.collectorId} dk={dk} />
            <Detail label="Name" value={viewing.name} dk={dk} />
            <Detail label="Team Leader" value={viewing.teamLeader} dk={dk} />
            <Detail label="Mobile" value={viewing.mobile} dk={dk} />
            <Detail label="Email" value={viewing.email} dk={dk} />
            <Detail label="Villages" value={Array.isArray(viewing.villages) ? viewing.villages.join(', ') : viewing.villages || '-'} dk={dk} />
            <Detail label="Collector Type" value={viewing.collectorType} dk={dk} />
            <Detail label="Team Size" value={viewing.teamSize} dk={dk} />
            <Detail label="Vehicle Type" value={viewing.vehicleType} dk={dk} />
            <Detail label="Vehicle Number" value={viewing.vehicleNumber} dk={dk} />
            <Detail label="Working Shift" value={Array.isArray(viewing.workingShift) ? viewing.workingShift.join(', ') : viewing.workingShift || '-'} dk={dk} />
            <Detail label="Status" value={viewing.status} dk={dk} />
            <Detail label="Availability" value={viewing.availability} dk={dk} />
            <Detail label="Completed Tasks" value={viewing.completedTasks ?? 0} dk={dk} />
            <Detail label="Performance Score" value={viewing.performanceScore ?? 0} dk={dk} />
            <Detail label="Added Date" value={formatDate(viewing.createdAt)} dk={dk} />
            <Detail label="Last Updated" value={formatDate(viewing.updatedAt)} dk={dk} />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => { setViewing(null); openEdit(viewing); }} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500">
              <HiPencil className="h-4 w-4" /> Edit
            </button>
          </div>
        </ModalShell>
      )}

      {editing && (
        <ModalShell title={`Edit ${editing.collectorId}`} onClose={() => setEditing(null)} dk={dk} width="max-w-lg">
          <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
            <div className={section}>
              <p className={sectionTitle}>Profile Photo</p>
              <div className="flex items-center gap-4">
                <div className={`h-20 w-20 rounded-lg overflow-hidden border-2 flex items-center justify-center shrink-0 ${dk('border-slate-700 bg-slate-800', 'border-slate-200 bg-slate-50')}`}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : editing.photo ? (
                    <img src={editing.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className={`text-2xl font-bold ${dk('text-slate-600', 'text-slate-400')}`}>{(editing.name || 'C')[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <label className={`cursor-pointer inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                    <HiCamera className="h-4 w-4" /> {photoPreview || editing.photo ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={handlePhotoChange} />
                  </label>
                  <p className={`text-[11px] mt-1 ${dk('text-slate-500', 'text-slate-400')}`}>JPG, PNG up to 2MB</p>
                </div>
              </div>
            </div>
            <div className={section}>
              <p className={sectionTitle}>Basic Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Collector / Team Name" required labelClass={labelClass} error={errors.name}>
                  <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} />
                </Field>
                <Field label="Team Leader Name" required labelClass={labelClass} error={errors.teamLeader}>
                  <input type="text" value={form.teamLeader} onChange={(e) => set('teamLeader', e.target.value)} className={inp} />
                </Field>
                <Field label="Mobile Number" required labelClass={labelClass} error={errors.mobile}>
                  <input type="tel" value={form.mobile} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} className={inp} maxLength={10} />
                </Field>
                <Field label="Email" labelClass={labelClass} error={errors.email}>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inp} />
                </Field>
                <Field label="Status" required labelClass={labelClass}>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inp}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className={section}>
              <p className={sectionTitle}>Collector Type</p>
              <Field label="Collector Type" required labelClass={labelClass}>
                <RadioGroup options={['Individual', 'Team']} value={form.collectorType} onChange={(v) => set('collectorType', v)} dark={dark} />
              </Field>
              {form.collectorType === 'Team' && (
                <Field label="Team Size (1-5)" required labelClass={labelClass}>
                  <input type="number" min={1} max={5} value={form.teamSize} onChange={(e) => set('teamSize', Math.min(5, Math.max(1, Number(e.target.value))))} className={`${inp} sm:w-28`} />
                </Field>
              )}
            </div>

            <div className={section}>
              <p className={sectionTitle}>Service Area</p>
              <Field label="Village Assignment" required labelClass={labelClass}>
                <VillageMultiSelect selected={form.villages} onChange={(v) => set('villages', v)} error={errors.villages} inp={inp} dk={dk} assignedMap={assignedMap} conflictingSelected={conflictingVillages.length} />
              </Field>
            </div>

            <div className={section}>
              <p className={sectionTitle}>Work Details</p>
              <Field label="Vehicle Type" required labelClass={labelClass}>
                <RadioGroup options={['Bike', 'Auto', 'Truck']} value={form.vehicleType} onChange={(v) => set('vehicleType', v)} dark={dark} />
              </Field>
              <Field label="Vehicle Number" required labelClass={labelClass} error={errors.vehicleNumber}>
                <input type="text" value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())} className={`${inp} sm:w-64`} />
              </Field>
              <Field label="Working Shift" required labelClass={labelClass} error={errors.workingShift}>
                <div className="flex flex-wrap gap-4 mt-1">
                  {['Morning', 'Afternoon', 'Evening'].map((shift) => (
                    <label key={shift} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.workingShift.includes(shift)}
                        onChange={(e) => set('workingShift', e.target.checked ? [...form.workingShift, shift] : form.workingShift.filter((s) => s !== shift))}
                        className="accent-green-500 rounded w-4 h-4"
                      />
                      <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{shift}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            <div className={section}>
              <p className={sectionTitle}>Account Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Collector ID" labelClass={labelClass}>
                  <input type="text" value={editing.collectorId} readOnly className={`${inp} opacity-70 cursor-not-allowed`} />
                </Field>
                <Field label="New Password" labelClass={labelClass} error={errors.password}>
                  <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Leave blank to keep current password" className={inp} autoComplete="new-password" />
                </Field>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {deleting && (
        <ModalShell title="Delete Collector" onClose={() => setDeleting(null)} dk={dk} width="max-w-sm">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <HiExclamation className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>Delete {deleting.name}?</p>
                <p className={`text-xs mt-1 ${dk('text-slate-400', 'text-slate-500')}`}>Active assignments will be released back into the queue.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleting(null)} className={`flex-1 rounded-lg border py-2.5 text-sm font-medium ${dk('border-slate-700 text-slate-400 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={saving} className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-500 disabled:opacity-60">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>View Collectors</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{collectors.length} collectors registered</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/add-collector')}
          className="flex items-center gap-2 justify-center text-white text-sm font-semibold px-4 rounded-lg transition shadow-sm h-10 min-w-[140px]"
          style={{ backgroundColor: '#0BAF2A' }}
        >
          <HiUserAdd className="h-4 w-4" /> Add New
        </button>
      </div>

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group w-full sm:max-w-md ${
        dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'
      }`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, village, mobile..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-100 border border-green-200 px-4 py-3 text-sm text-green-800">
          <HiCheckCircle className="h-5 w-5 shrink-0" /> {success}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-100 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className={`rounded-lg border shadow-sm min-w-0 overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>All Collectors</h2>
          <span className={`text-xs font-medium ${dk('text-slate-500', 'text-slate-500')}`}>
            {search ? `${filteredCollectors.length} of ${collectors.length}` : `${collectors.length} registered`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredCollectors.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            {search ? `No collectors matching "${search}".` : 'No collectors yet.'}
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                  {['ID', 'Name', 'Leader', 'Added Date', 'Actions'].map((h) => (
                    <th key={h} className={`px-5 py-3 font-semibold whitespace-nowrap ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCollectors.map((c) => (
                  <tr key={c._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                    <td className={`px-5 py-4 font-mono text-xs font-bold whitespace-nowrap ${dk('text-green-500', 'text-green-600')}`}>{c.collectorId}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className={`font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{c.name}</p>
                      <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">{c.collectorType || 'Collector'}</p>
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>{c.teamLeader || '-'}</td>
                    <td className={`px-5 py-4 text-xs whitespace-nowrap ${dk('text-slate-500', 'text-slate-400')}`}>{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setViewing(c)} title="View" className={`p-2 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-green-400', 'border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700')}`}>
                          <HiEye className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openEdit(c)} title="Edit" className={`p-2 rounded-lg border transition ${dk('border-blue-900/40 text-blue-400 hover:bg-slate-800', 'border-blue-200 text-blue-600 hover:bg-blue-50')}`}>
                          <HiPencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleting(c)} title="Delete" className={`p-2 rounded-lg border transition ${dk('border-red-900/40 text-red-400 hover:bg-slate-800', 'border-red-200 text-red-600 hover:bg-red-50')}`}>
                          <HiTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
            {filteredCollectors.map((c) => (
              <div key={c._id} className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-mono text-xs font-bold ${dk('text-green-500', 'text-green-600')}`}>{c.collectorId}</p>
                    <p className={`mt-1 font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{c.name}</p>
                    <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">{c.collectorType || 'Collector'}</p>
                  </div>
                  <span className={`shrink-0 inline-flex justify-center text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'Active' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800') : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')}`}>
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Leader</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{c.teamLeader || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Added Date</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{formatDate(c.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setViewing(c)} title="View" className={`p-2.5 rounded-lg border ${dk('border-slate-700 text-slate-400', 'border-slate-200 text-slate-500')}`}><HiEye className="h-4 w-4" /></button>
                  <button type="button" onClick={() => openEdit(c)} title="Edit" className={`p-2.5 rounded-lg border ${dk('border-blue-900/40 text-blue-400', 'border-blue-200 text-blue-600')}`}><HiPencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setDeleting(c)} title="Delete" className={`p-2.5 rounded-lg border ${dk('border-red-900/40 text-red-400', 'border-red-200 text-red-600')}`}><HiTrash className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewCollectors;
