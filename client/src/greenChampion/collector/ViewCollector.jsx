import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HiEye, HiX, HiUserGroup, HiClipboardList, HiOfficeBuilding, HiSearch } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import socket from '../../socket';

const ModalShell = ({ title, children, onClose, dark, width = 'max-w-3xl' }) => (
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${width} max-h-[90vh] overflow-hidden rounded-lg border shadow-2xl ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h2>
          <button type="button" onClick={onClose} className={`rounded-lg p-2 transition ${dark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
);

const Detail = ({ label, value, dark }) => (
  <div>
    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
    <p className={`mt-1 text-sm break-words ${dark ? 'text-slate-100' : 'text-slate-700'}`}>{value || '-'}</p>
  </div>
);

const StatCard = ({ label, value, icon: Icon, gradient }) => (
  <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: gradient }}>
    <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-medium tracking-wider text-white/70">{label}</p>
      <p className="text-lg font-semibold text-white truncate">{value}</p>
    </div>
  </div>
);

const ViewCollector = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [collectors, setCollectors] = useState([]);
  const [stats, setStats] = useState({ totalCollectors: 0, activeTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const baseClass = dark ? 'text-slate-200' : 'text-slate-900';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/green-champion/collector`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Unable to load collector data');
      }
      const data = await res.json();
      setCollectors(data.collectors || []);
      setStats(data.stats || { totalCollectors: 0, activeTasks: 0 });
    } catch (err) {
      setError(err.message || 'Server error.');
      setCollectors([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData();
    ['collector_updated', 'report_updated', 'report_created'].forEach((e) => socket.on(e, refresh));
    return () => { ['collector_updated', 'report_updated', 'report_created'].forEach((e) => socket.off(e, refresh)); };
  }, [socket, fetchData]);

  const formatDate = (value) => value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  const AVAIL_DOT = { Available: 'bg-green-500', Busy: 'bg-yellow-500', Offline: 'bg-slate-500' };

  const filteredCollectors = useMemo(() => {
    if (!search.trim()) return collectors;
    const q = search.toLowerCase();
    return collectors.filter((c) =>
      [c.name, c.collectorId, c.mobile, c.vehicleType, c.village].some((f) => f?.toLowerCase().includes(q))
    );
  }, [collectors, search]);

  const totalTasksAll = collectors.reduce((sum, c) => sum + (c.completedTasks || 0), 0) + stats.activeTasks;

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${baseClass}`}>View Collector</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Collector assigned to your village</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Tasks"
          value={totalTasksAll}
          icon={HiUserGroup}
          gradient={dark ? 'linear-gradient(135deg, #0a7a79 0%, #1fa89a 100%)' : 'linear-gradient(135deg, #14B8A6 0%, #0891B2 100%)'}
        />
        <StatCard
          label="Active Tasks"
          value={stats.activeTasks}
          icon={HiClipboardList}
          gradient={dark ? 'linear-gradient(135deg, #b85a00 0%, #d9730a 100%)' : 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)'}
        />
      </div>

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group w-full sm:max-w-md ${dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'}`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, mobile..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0" />
      </div>

      {error && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-3 ${dk('bg-red-900/20 border-red-800', 'bg-red-50 border-red-200')}`}>
          <span className={dk('text-red-400', 'text-red-700')}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : collectors.length === 0 && !search ? (
        <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            <HiOfficeBuilding className="mx-auto h-10 w-10 text-green-500 mb-4 opacity-50" />
            <p className="text-base font-semibold">No collector assigned</p>
            <p className="mt-2">No collector has been assigned to your village yet.</p>
          </div>
        </div>
      ) : filteredCollectors.length === 0 ? (
        <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            <HiOfficeBuilding className="mx-auto h-10 w-10 text-green-500 mb-4 opacity-50" />
            <p className="text-base font-semibold">No collector found</p>
            <p className="mt-2">No collectors matching "{search}".</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCollectors.map((c) => (
            <div key={c._id} className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
              <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
                <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>
                  {c.collectorId} — {c.name}
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${AVAIL_DOT[c.availability] || 'bg-slate-500'}`} />
                  <span className={`text-xs font-medium ${dk('text-slate-400', 'text-slate-500')}`}>{c.availability || 'Offline'}</span>
                  <button
                    type="button"
                    onClick={() => setViewing(c)}
                    className={`p-2 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-green-400', 'border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700')}`}
                  >
                    <HiEye className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Collector Name</p>
                    <p className={`mt-1 text-sm font-semibold ${baseClass}`}>{c.name}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Mobile Number</p>
                    <p className={`mt-1 text-sm ${baseClass}`}>{c.mobile || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Assigned Village</p>
                    <p className={`mt-1 text-sm ${baseClass}`}>{c.village || (c.villages || []).join(', ') || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Status</p>
                    <span className={`mt-1 inline-flex min-w-[4rem] justify-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                      c.status === 'Active'
                        ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800')
                        : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Total Tasks</p>
                    <p className={`mt-1 text-sm font-semibold ${baseClass}`}>{c.completedTasks || 0}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Completed Tasks</p>
                    <p className={`mt-1 text-sm font-semibold ${dk('text-green-400', 'text-green-600')}`}>{c.completedTasks || 0}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Vehicle</p>
                    <p className={`mt-1 text-sm ${baseClass}`}>{c.vehicleType || '-'} {c.vehicleNumber ? `(${c.vehicleNumber})` : ''}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Performance Score</p>
                    <p className={`mt-1 text-sm font-semibold ${dk('text-blue-400', 'text-blue-600')}`}>{c.performanceScore || 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <ModalShell title="Collector Details" onClose={() => setViewing(null)} dark={dark}>
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
              <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>{viewing.collectorId} — {viewing.collectorType}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`h-2 w-2 rounded-full ${AVAIL_DOT[viewing.availability] || 'bg-slate-500'}`} />
                <span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{viewing.availability || 'Offline'}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Detail label="Collector ID" value={viewing.collectorId} dark={dark} />
            <Detail label="Name" value={viewing.name} dark={dark} />
            <Detail label="Team Leader" value={viewing.teamLeader} dark={dark} />
            <Detail label="Mobile" value={viewing.mobile} dark={dark} />
            <Detail label="Email" value={viewing.email} dark={dark} />
            <Detail label="Assigned Village" value={viewing.village || (viewing.villages || []).join(', ') || '-'} dark={dark} />
            <Detail label="Collector Type" value={viewing.collectorType} dark={dark} />
            <Detail label="Team Size" value={viewing.teamSize} dark={dark} />
            <Detail label="Vehicle Type" value={viewing.vehicleType} dark={dark} />
            <Detail label="Vehicle Number" value={viewing.vehicleNumber} dark={dark} />
            <Detail label="Working Shift" value={Array.isArray(viewing.workingShift) ? viewing.workingShift.join(', ') : viewing.workingShift || '-'} dark={dark} />
            <Detail label="Status" value={viewing.status} dark={dark} />
            <Detail label="Availability" value={viewing.availability} dark={dark} />
            <Detail label="Total Tasks" value={(viewing.completedTasks || 0) + stats.activeTasks} dark={dark} />
            <Detail label="Completed Tasks" value={viewing.completedTasks || 0} dark={dark} />
            <Detail label="Performance Score" value={`${viewing.performanceScore ?? 0}%`} dark={dark} />
            <Detail label="Added Date" value={formatDate(viewing.createdAt)} dark={dark} />
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default ViewCollector;
