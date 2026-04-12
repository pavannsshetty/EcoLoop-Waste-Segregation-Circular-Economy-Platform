import { useState, useEffect } from 'react';
import { HiRefresh, HiEye, HiEyeOff, HiCheckCircle } from 'react-icons/hi';

const genPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const INIT = { name: '', teamLeader: '', mobile: '', email: '', city: '', area: '', ward: '', collectorId: '', password: '', status: 'Active', teamSize: 1 };

const Field = ({ label, required, children }) => (
  <div>
    <label className="text-xs font-medium text-slate-400 mb-1 block">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
);

const inp = 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition';

const AddCollector = () => {
  const [form,    setForm]    = useState(INIT);
  const [showPwd, setShowPwd] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  useEffect(() => {
    fetchNextId();
    set('password', genPassword());
  }, []);

  const fetchNextId = async () => {
    try {
      const token = localStorage.getItem('admin-token');
      const res   = await fetch('/api/admin/next-collector-id', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); set('collectorId', d.collectorId); }
    } catch { }
  };

  const validate = () => {
    const e = {};
    if (!form.name)     e.name     = 'Collector name is required.';
    if (!form.mobile || !/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required.';
    if (!form.city)     e.city     = 'City is required.';
    if (!form.area)     e.area     = 'Area is required.';
    if (!form.ward)     e.ward     = 'Ward is required.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setSuccess('');
    try {
      const token = localStorage.getItem('admin-token');
      const res   = await fetch('/api/admin/add-collector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.message || 'Failed to add collector.' }); return; }
      setSuccess('Collector added successfully!');
      setForm(INIT);
      setErrors({});
      await fetchNextId();
      set('password', genPassword());
    } catch { setErrors({ submit: 'Network error.' });
    } finally { setLoading(false); }
  };

  const handleReset = () => { setForm(INIT); setErrors({}); setSuccess(''); fetchNextId(); set('password', genPassword()); };

  const card = 'bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4';
  const sectionTitle = 'text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Add Collector</h1>
        <p className="text-sm text-slate-400 mt-0.5">Create a new waste collector account</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-green-900/30 border border-green-700 px-4 py-3 text-sm text-green-400">
          <HiCheckCircle className="h-5 w-5 shrink-0" /> {success}
        </div>
      )}
      {errors.submit && (
        <div className="rounded-xl bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-400">{errors.submit}</div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        <div className={card}>
          <p className={sectionTitle}>Basic Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Collector / Team Name" required>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Green Team A" className={inp} />
              {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>}
            </Field>
            <Field label="Team Leader Name">
              <input type="text" value={form.teamLeader} onChange={e => set('teamLeader', e.target.value)} placeholder="Optional" className={inp} />
            </Field>
            <Field label="Mobile Number" required>
              <input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit number" className={inp} maxLength={10} />
              {errors.mobile && <p className="text-xs text-red-400 mt-0.5">{errors.mobile}</p>}
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Optional" className={inp} />
            </Field>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Assignment Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="City" required>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Mangalore" className={inp} />
              {errors.city && <p className="text-xs text-red-400 mt-0.5">{errors.city}</p>}
            </Field>
            <Field label="Area / Locality" required>
              <input type="text" value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Kundapura" className={inp} />
              {errors.area && <p className="text-xs text-red-400 mt-0.5">{errors.area}</p>}
            </Field>
            <Field label="Ward Number" required>
              <input type="text" value={form.ward} onChange={e => set('ward', e.target.value)} placeholder="e.g. Ward 12" className={inp} />
              {errors.ward && <p className="text-xs text-red-400 mt-0.5">{errors.ward}</p>}
            </Field>
          </div>
          <Field label="Team Size (1–5)">
            <input type="number" min={1} max={5} value={form.teamSize} onChange={e => set('teamSize', Number(e.target.value))} className={`${inp} w-32`} />
          </Field>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Account Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Collector ID (Auto)">
              <div className="flex gap-2">
                <input type="text" value={form.collectorId} readOnly className={`${inp} flex-1 opacity-70 cursor-not-allowed`} />
                <button type="button" onClick={fetchNextId} className="px-3 rounded-xl border border-slate-700 text-slate-400 hover:text-green-400 hover:border-green-600 transition">
                  <HiRefresh className="h-4 w-4" />
                </button>
              </div>
            </Field>
            <Field label="Password" required>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="Set password" className={`${inp} pr-10`} />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                    {showPwd ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => set('password', genPassword())}
                  className="px-3 rounded-xl border border-slate-700 text-slate-400 hover:text-green-400 hover:border-green-600 transition text-xs font-medium whitespace-nowrap">
                  Auto
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-0.5">{errors.password}</p>}
            </Field>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Status</p>
          <div className="flex gap-3">
            {['Active', 'Inactive'].map(s => (
              <button key={s} type="button" onClick={() => set('status', s)}
                className={`px-5 py-2 rounded-xl border text-sm font-semibold transition ${
                  form.status === s
                    ? s === 'Active' ? 'bg-green-600 border-green-600 text-white' : 'bg-red-600 border-red-600 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={handleReset}
            className="flex-1 rounded-xl border border-slate-700 text-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-800 transition">
            Reset
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 rounded-xl bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-500 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Creating...' : 'Create Collector'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCollector;
