import { useEffect, useState, useRef } from 'react';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiPhotograph, HiExclamation } from 'react-icons/hi';
import CleanupTimeBadge from '../../shared/components/CleanupTimeBadge';
import { useTheme } from '../../shared/context/ThemeContext';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const sevCls = (sev, dk) => {
  const map = {
    High: dk('bg-red-900/40 text-red-400 border-red-800', 'bg-red-100 text-red-700 border-red-200'),
    Medium: dk('bg-yellow-900/40 text-yellow-400 border-yellow-800', 'bg-yellow-100 text-yellow-800 border-yellow-200'),
    Low: dk('bg-green-900/40 text-green-400 border-green-800', 'bg-green-100 text-green-700 border-green-200'),
  };
  return map[sev] || map.Low;
};

const staCls = (st, dk) => {
  const map = {
    Submitted:   dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-800'),
    Requested:   dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-800'),
    Assigned:    dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    'In Progress': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    Resolved:    dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Collected:   dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Delayed:     dk('bg-red-900/40 text-red-400', 'bg-red-100 text-red-700'),
  };
  return map[st] || map.Submitted;
};

const CompleteModal = ({ report, onClose, onDone, dk }) => {
  const [photo, setPhoto] = useState('');
  const [preview, setPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPhoto(`[photo:${f.name}]`);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!photo) {
      setError('Completion photo is required.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const api = report.taskType === 'scrap' 
        ? `/api/scrap/update-status/${report._id}`
        : `/api/collector/report/${report._id}/status`;
      
      const payload = report.taskType === 'scrap'
        ? { status: 'Collected' }
        : { status: 'Resolved', completionPhoto: photo, completionNotes: notes };

      const res = await fetch(api, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      onDone(data.request || data.report);
      onClose();
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const input = dk(
    'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500',
    'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
  );
  const dash = dk('border-slate-600 hover:border-green-500', 'border-slate-300 hover:border-green-500');
  const btnGhost = dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`rounded-2xl border w-full max-w-md p-5 space-y-4 shadow-xl ${panel}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Mark as Completed</p>
          <button type="button" onClick={onClose} className={dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-800')}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className={`text-xs mb-1 block ${label}`}>
            Completion Photo <span className="text-red-500">*</span>
          </label>
          <label
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer py-5 transition ${dash}`}
          >
            {preview ? (
              <img src={preview} alt="" className="h-28 rounded-lg object-cover" />
            ) : (
              <>
                <HiPhotograph className={`h-8 w-8 ${dk('text-slate-500', 'text-slate-400')}`} />
                <span className={`text-xs ${label}`}>Upload completion photo</span>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>
        <div>
          <label className={`text-xs mb-1 block ${label}`}>Completion Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what was done..."
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${input}`}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${btnGhost}`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="flex-1 rounded-xl bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-500 transition disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DelayModal = ({ report, onClose, onDone, dk }) => {
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
      if (res.ok) {
        onDone(data.report);
        onClose();
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const input = dk(
    'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500',
    'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
  );
  const btnGhost = dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`rounded-2xl border w-full max-w-sm p-5 space-y-4 shadow-xl ${panel}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Report Delay</p>
          <button type="button" onClick={onClose} className={dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-800')}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className={`text-xs mb-1 block ${label}`}>Delay Reason</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Heavy rain, Vehicle issue..."
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none ${input}`}
          />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${btnGhost}`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !reason.trim()}
            className="flex-1 rounded-xl bg-yellow-600 text-white py-2 text-sm font-semibold hover:bg-yellow-500 transition disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AssignedReports = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [complete, setComplete] = useState(null);
  const [delay, setDelay] = useState(null);
  const token = localStorage.getItem('token');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [wasteRes, scrapRes] = await Promise.all([
        fetch(`/api/collector/reports?filter=${filter}&sort=${sort}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/scrap/collector?status=${filter === 'all' ? '' : filter}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      let wasteData = [];
      let scrapData = [];

      if (wasteRes.ok) wasteData = await wasteRes.json();
      if (scrapRes.ok) scrapData = await scrapRes.json();

      const combined = [
        ...wasteData.map(r => ({ ...r, taskType: 'waste' })),
        ...scrapData.map(r => ({ ...r, taskType: 'scrap' }))
      ];

      // Re-apply sorting if necessary
      if (sort === 'date') combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setReports(combined);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when filter/sort changes
  }, [filter, sort]);

  const updateStatus = async (item, status) => {
    try {
      const api = item.taskType === 'scrap'
        ? (status === 'Assigned' ? `/api/scrap/assign/${item._id}` : `/api/scrap/update-status/${item._id}`)
        : `/api/collector/report/${item._id}/status`;

      const res = await fetch(api, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = data.request || data.report;
        setReports((rs) => rs.map((r) => (r._id === item._id ? { ...updated, taskType: item.taskType } : r)));
      }
    } catch {
      /* ignore */
    }
  };

  const onDone = (updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));

  const selectCls = dk(
    'rounded-xl border border-gray-700 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500',
    'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm'
  );

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {complete && <CompleteModal report={complete} onClose={() => setComplete(null)} onDone={onDone} dk={dk} />}
      {delay && <DelayModal report={delay} onClose={() => setDelay(null)} onDone={onDone} dk={dk} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Assigned Reports</h1>
          <p className={`text-sm mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Filter, sort, and update task status</p>
        </div>
        <button
          type="button"
          onClick={fetchReports}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')}
          aria-label="Refresh"
        >
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
          {['all', 'High', 'Medium', 'Low', 'Assigned', 'In Progress'].map((v) => (
            <option key={v} value={v}>
              {v === 'all' ? 'All' : v}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          <option value="date">Newest First</option>
          <option value="priority">High Priority First</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No reports found.</div>
      ) : (
        reports.map((r) => (
          <div
            key={r._id}
            className={`rounded-2xl border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${r.taskType === 'scrap' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                    {r.taskType === 'scrap' ? 'Scrap Pickup' : 'Waste Cleaning'}
                  </span>
                  <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{r.taskType === 'scrap' ? r.scrapType : r.wasteType}</p>
                  {r.severity && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sevCls(r.severity, dk)}`}>{r.severity}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(r.status, dk)}`}>{r.status}</span>
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                  <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                  <span className="truncate">{r.location?.displayAddress || r.location?.address}</span>
                </p>
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>
                  <HiClock className="h-3 w-3 shrink-0" /> {fmt(r.createdAt)}
                </p>
                {r.quantity && (
                  <p className={`text-xs font-medium mt-1 ${dk('text-slate-300', 'text-slate-700')}`}>Quantity: {r.quantity}</p>
                )}
                {r.description && (
                  <p className={`text-xs mt-1 line-clamp-2 ${dk('text-slate-400', 'text-slate-600')}`}>{r.description}</p>
                )}
                {r.taskType === 'waste' && <CleanupTimeBadge report={r} />}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(r.status === 'Submitted' || r.status === 'Requested') && (
                <button
                  type="button"
                  onClick={() => updateStatus(r, 'Assigned')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
                >
                  Accept Task
                </button>
              )}
              {r.status === 'Assigned' && (
                <button
                  type="button"
                  onClick={() => updateStatus(r, 'In Progress')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-500 transition"
                >
                  Start Work
                </button>
              )}
              {r.status === 'In Progress' && (
                <>
                  <button
                    type="button"
                    onClick={() => setComplete(r)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
                  >
                    Mark {r.taskType === 'scrap' ? 'Collected' : 'Completed'}
                  </button>
                  {r.taskType === 'waste' && (
                    <button
                      type="button"
                      onClick={() => setDelay(r)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition flex items-center gap-1"
                    >
                      <HiExclamation className="h-3.5 w-3.5" /> Report Delay
                    </button>
                  )}
                </>
              )}
              {(r.status === 'Resolved' || r.status === 'Collected') && (
                <span className={`text-xs font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
                  <HiCheckCircle className="h-3.5 w-3.5" /> {r.status === 'Collected' ? 'Collected' : 'Completed'} {fmt(r.completedAt || r.updatedAt)}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AssignedReports;
