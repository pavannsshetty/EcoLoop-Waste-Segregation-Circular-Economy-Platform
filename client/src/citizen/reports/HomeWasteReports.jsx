import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiRefresh, HiHome, HiChevronDown, HiChevronUp, HiCheckCircle, HiX, HiPencil, HiClock } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import socket from '../../socket';
import EditReportModal from '../../shared/components/EditReportModal';

const STATUS = {
  Submitted:     { border: 'border-l-yellow-500' },
  'In Progress': { border: 'border-l-blue-500' },
  Resolved:      { border: 'border-l-green-500' },
  Reopened:      { border: 'border-l-orange-500' },
  Delayed:       { border: 'border-l-red-500' },
};

const collectorLabel = (c) => {
  if (!c) return null;
  if (c.collectorType === 'Team' && c.teamLeader) {
    const size = c.teamSize > 1 ? ` (${c.teamSize} members)` : '';
    return `${c.teamLeader}'s Team${size}`;
  }
  return c.name;
};

const calcRemaining = (createdAt) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const left = 10 * 60 * 1000 - elapsed;
  return left > 0 ? left : 0;
};

const fmtCountdown = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const EditTimer = ({ createdAt }) => {
  const [remaining, setRemaining] = useState(calcRemaining(createdAt));
  const timerRef = useRef(null);

  useEffect(() => {
    setRemaining(calcRemaining(createdAt));
    timerRef.current = setInterval(() => {
      const r = calcRemaining(createdAt);
      setRemaining(r);
      if (r <= 0) clearInterval(timerRef.current);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [createdAt]);

  if (remaining <= 0) return null;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold ${remaining < 60000 ? 'text-red-500' : 'text-green-500'}`}>
      <HiClock className="h-3 w-3" />
      {fmtCountdown(remaining)}
    </span>
  );
};

const HomeWasteReports = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [editReport, setEditReport] = useState(null);

  const fetchReports = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/waste/my-reports`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch reports.');
      const all = await res.json();
      setReports(all.filter(r => r.reportType === 'Home Pickup'));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  useEffect(() => {
    const handler = (updated) => {
      setReports((rs) => {
        const filtered = rs.filter(r => r._id !== updated._id);
        if (updated.reportType === 'Home Pickup') filtered.push(updated);
        return filtered;
      });
    };
    socket.on('report_updated', handler);
    return () => socket.off('report_updated', handler);
  }, []);

  const handleVerify = async (id, verified) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/waste/report/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verified }),
      });
      const data = await res.json();
      if (res.ok) setReports(rs => rs.map(r => r._id === id ? { ...r, ...data.report } : r));
    } catch {}
  };

  const handleUpdated = (updated) => {
    setReports(rs => rs.map(r => r._id === updated._id ? updated : r));
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200', 'text-slate-800')}`}>Home Waste Reports</h1>
          <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Your home pickup waste reports</p>
        </div>
        <button onClick={fetchReports} className={`flex items-center gap-1.5 text-sm transition ${dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')}`}>
          <HiRefresh className="h-5 w-5" /><span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2].map(i => (
            <div key={i} className={`rounded-xl border animate-pulse ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
              <div className="p-5 space-y-3">
                <div className={`h-5 w-48 rounded ${dk('bg-slate-700', 'bg-slate-200')}`} />
                <div className={`h-3 w-64 rounded ${dk('bg-slate-700', 'bg-slate-200')}`} />
                <div className={`h-3 w-40 rounded ${dk('bg-slate-700', 'bg-slate-200')}`} />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      {!loading && !error && reports.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 text-center ${dk('text-slate-500', 'text-slate-400')}`}>
          <HiHome className="h-12 w-12 opacity-30" />
          <p className="text-sm">No home waste reports yet.</p>
          <button onClick={() => navigate('/citizen/report-waste')}
            className="mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-500 transition">
            Report Waste
          </button>
        </div>
      )}

      <div className="space-y-4">
        {reports.map((r) => {
          const st = STATUS[r.status] || STATUS.Submitted;
          const open = expanded[r._id];
          const remaining = calcRemaining(r.createdAt);
          const canEdit = r.status === 'Submitted' && remaining > 0;

          return (
            <div key={r._id}
              className={`rounded-xl border border-l-4 overflow-hidden transition-all duration-200 hover:shadow-md ${
                dk(`bg-[#0d0d0d] border-gray-700 ${st.border}`, `bg-white border-slate-200 ${st.border}`)
              }`}>

              <div className="flex flex-col sm:flex-row">
                <div className="flex-1 min-w-0 p-4 sm:p-5">
                  <h2 className={`text-lg sm:text-xl font-bold leading-snug ${dk('text-slate-100', 'text-slate-900')}`}>{r.wasteType}</h2>

                  <div className="mt-3 space-y-1.5">
                    <div className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>
                      <span className={`font-medium ${dk('text-slate-300', 'text-slate-600')}`}>Report ID:</span> {r.reportId || 'ECO-PENDING'}
                    </div>
                    <div className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>
                      <span className={`font-medium ${dk('text-slate-300', 'text-slate-600')}`}>Reported on:</span> {fmt(r.createdAt)} at {fmtTime(r.createdAt)}
                    </div>
                    {r.pickupTime && (
                      <div className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>
                        <span className={`font-medium ${dk('text-slate-300', 'text-slate-600')}`}>Pickup:</span> {fmt(r.pickupTime)} at {fmtTime(r.pickupTime)}
                      </div>
                    )}
                    {r.assignedCollector && (
                      <div className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>
                        <span className={`font-medium ${dk('text-slate-300', 'text-slate-600')}`}>Team:</span> {collectorLabel(r.assignedCollector)}
                      </div>
                    )}
                  </div>

                  {r.status === 'Resolved' && r.citizenVerified === 'pending' && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <button onClick={() => handleVerify(r._id, 'yes')}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                        <HiCheckCircle className="h-3.5 w-3.5" /> Yes
                      </button>
                      <button onClick={() => handleVerify(r._id, 'no')}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-400 transition">
                        <HiX className="h-3.5 w-3.5" /> No
                      </button>
                    </div>
                  )}
                </div>

                {r.image && (
                  <div className="sm:w-44 sm:min-h-[160px] shrink-0 p-2 sm:p-3 flex items-start sm:items-center">
                    <img
                      src={r.image}
                      alt="Report"
                      className="w-full h-40 sm:h-36 object-cover rounded-xl cursor-pointer hover:opacity-90 transition shadow-sm"
                      onClick={() => window.open(r.image, '_blank')}
                    />
                  </div>
                )}
              </div>

              <div className={`h-px mx-4 ${dk('bg-white/[0.06]', 'bg-slate-100')}`} />
              <div className="px-4 sm:px-5 py-3 flex items-center gap-2 flex-wrap">
                <button onClick={() => toggleExpand(r._id)}
                  className={`flex items-center gap-1 text-xs transition ${dk('text-slate-500 hover:text-slate-300', 'text-slate-400 hover:text-slate-600')}`}>
                  <span>{open ? 'Less details' : 'More details'}</span>
                  {open ? <HiChevronUp className="h-3.5 w-3.5" /> : <HiChevronDown className="h-3.5 w-3.5" />}
                </button>

                <div className="flex-1" />

                {canEdit && (
                  <button onClick={() => setEditReport(r)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                    <HiPencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {r.status === 'Submitted' && remaining <= 0 && (
                  <span className={`text-[10px] italic ${dk('text-slate-500', 'text-slate-400')}`}>This report can no longer be edited.</span>
                )}
                {(canEdit || (r.status === 'Submitted' && remaining > 0)) && (
                  <EditTimer createdAt={r.createdAt} />
                )}
              </div>

              {open && (
                <>
                  <div className={`h-px mx-4 ${dk('bg-white/[0.06]', 'bg-slate-100')}`} />
                  <div className="px-4 sm:px-5 py-3 space-y-2">
                    <div className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>
                      <span className={`font-semibold ${dk('text-slate-300', 'text-slate-600')}`}>Address:</span> {r.location?.displayAddress || r.location?.address || r.address || 'Address not provided'}
                    </div>
                    {r.quantity && (
                      <div className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>
                        <span className={`font-semibold ${dk('text-slate-300', 'text-slate-600')}`}>Quantity:</span> {r.quantity}
                      </div>
                    )}
                    {r.collectorNotes && (
                      <div className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>
                        <span className={`font-semibold ${dk('text-slate-300', 'text-slate-600')}`}>Collector notes:</span> {r.collectorNotes}
                      </div>
                    )}
                    {r.completionPhoto && (
                      <div>
                        <span className={`text-xs font-semibold ${dk('text-slate-300', 'text-slate-600')}`}>Completion photo:</span>
                        <img src={r.completionPhoto} alt="Completion" className="mt-1 h-24 w-24 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition" onClick={() => window.open(r.completionPhoto, '_blank')} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <EditReportModal isOpen={!!editReport} onClose={() => setEditReport(null)} report={editReport} onUpdated={handleUpdated} />
    </div>
  );
};

export default HomeWasteReports;
