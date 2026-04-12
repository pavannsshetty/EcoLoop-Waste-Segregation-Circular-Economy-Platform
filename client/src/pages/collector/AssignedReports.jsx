import { useEffect, useState, useRef } from 'react';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiPhotograph, HiExclamation } from 'react-icons/hi';
import CleanupTimeBadge from '../../components/CleanupTimeBadge';

const SEV = { High: 'bg-red-900/40 text-red-400 border-red-800', Medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-800', Low: 'bg-green-900/40 text-green-400 border-green-800' };
const STA = { Submitted: 'bg-slate-700 text-slate-300', Assigned: 'bg-blue-900/40 text-blue-400', 'In Progress': 'bg-yellow-900/40 text-yellow-400', Resolved: 'bg-green-900/40 text-green-400', Delayed: 'bg-red-900/40 text-red-400' };

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const CompleteModal = ({ report, onClose, onDone }) => {
  const [photo,   setPhoto]   = useState('');
  const [preview, setPreview] = useState('');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPhoto(`[photo:${f.name}]`);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!photo) { setError('Completion photo is required.'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/collector/report/${report._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'Resolved', completionPhoto: photo, completionNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      onDone(data.report);
      onClose();
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Mark as Completed</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><HiX className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Completion Photo <span className="text-red-400">*</span></label>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 hover:border-green-500 cursor-pointer py-5 transition">
            {preview ? <img src={preview} alt="proof" className="h-28 rounded-lg object-cover" /> : <><HiPhotograph className="h-8 w-8 text-slate-500" /><span className="text-xs text-slate-400">Upload after photo</span></>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Completion Notes</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Describe what was done..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 text-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-800 transition">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 rounded-xl bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-500 transition disabled:opacity-60">
            {loading ? 'Saving...' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DelayModal = ({ report, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/collector/report/${report._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'Delayed', delayReason: reason }),
      });
      const data = await res.json();
      if (res.ok) { onDone(data.report); onClose(); }
    } catch { }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Report Delay</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><HiX className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Delay Reason</label>
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Heavy rain, Vehicle issue..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 text-slate-300 py-2 text-sm font-semibold hover:bg-slate-800 transition">Cancel</button>
          <button onClick={submit} disabled={loading || !reason.trim()} className="flex-1 rounded-xl bg-yellow-600 text-white py-2 text-sm font-semibold hover:bg-yellow-500 transition disabled:opacity-60">
            {loading ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AssignedReports = () => {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [sort,     setSort]     = useState('date');
  const [complete, setComplete] = useState(null);
  const [delay,    setDelay]    = useState(null);
  const token = localStorage.getItem('token');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collector/reports?filter=${filter}&sort=${sort}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setReports(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, [filter, sort]);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/collector/report/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) setReports(rs => rs.map(r => r._id === id ? data.report : r));
    } catch { }
  };

  const onDone = (updated) => setReports(rs => rs.map(r => r._id === updated._id ? updated : r));

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {complete && <CompleteModal report={complete} onClose={() => setComplete(null)} onDone={onDone} />}
      {delay    && <DelayModal    report={delay}    onClose={() => setDelay(null)}    onDone={onDone} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">Assigned Reports</h1>
        <button onClick={fetchReports} className="text-slate-400 hover:text-green-400 transition">
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500">
          {['all','High','Medium','Low','Assigned','In Progress'].map(v => <option key={v} value={v}>{v === 'all' ? 'All' : v}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="date">Newest First</option>
          <option value="priority">High Priority First</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">No reports found.</div>
      ) : (
        reports.map(r => (
          <div key={r._id} className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{r.wasteType}</p>
                  {r.severity && <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEV[r.severity]}`}>{r.severity}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STA[r.status]}`}>{r.status}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                  <span className="truncate">{r.location?.displayAddress || r.location?.address}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <HiClock className="h-3 w-3 shrink-0" /> {fmt(r.createdAt)}
                </p>
                {r.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{r.description}</p>}
                <CleanupTimeBadge report={r} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {r.status === 'Submitted' && (
                <button onClick={() => updateStatus(r._id, 'Assigned')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
                  Accept Task
                </button>
              )}
              {r.status === 'Assigned' && (
                <button onClick={() => updateStatus(r._id, 'In Progress')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-500 transition">
                  Start Work
                </button>
              )}
              {r.status === 'In Progress' && (<>
                <button onClick={() => setComplete(r)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                  Mark Completed
                </button>
                <button onClick={() => setDelay(r)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition flex items-center gap-1">
                  <HiExclamation className="h-3.5 w-3.5" /> Report Delay
                </button>
              </>)}
              {r.status === 'Resolved' && (
                <span className="text-xs text-green-400 font-medium flex items-center gap-1">✓ Completed {fmt(r.completedAt)}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AssignedReports;
